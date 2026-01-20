import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { calculateSessionCredits } from '../utils'
import RecentBookings from './RecentBookings'

export default function Calendar() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [selectedSessionType, setSelectedSessionType] = useState(null) // 'trial' or 'regular'
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [businessTimezone, setBusinessTimezone] = useState('America/Chicago')
  const [cacheStatus, setCacheStatus] = useState({ loaded: false, loading: false, expiresIn: 0 })
  
  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [booking, setBooking] = useState(false)
  const [bookingResult, setBookingResult] = useState(null)
  const [sessionCredits, setSessionCredits] = useState({ trial: 0, regular: 0, trialUsed: false, loading: true })

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December']

  // Calculate date limits (next 4 weeks - matches server preload)
  const today = new Date()
  const fourWeeksFromNow = new Date(today)
  fourWeeksFromNow.setDate(today.getDate() + 28)

  // Preload all availability on component mount
  useEffect(() => {
    preloadAvailability()
  }, [])

  useEffect(() => {
    if (user) {
      fetchSessionCredits()
    } else {
      setSessionCredits({ trial: 0, regular: 0, trialUsed: false, loading: false })
    }
    
    const handlePaymentCompleted = () => {
      if (user) setTimeout(fetchSessionCredits, 2000)
    }
    
    window.addEventListener('paymentCompleted', handlePaymentCompleted)
    return () => window.removeEventListener('paymentCompleted', handlePaymentCompleted)
  }, [user])

  // Preload 4 weeks of availability (only 4 API calls!)
  const preloadAvailability = async () => {
    setCacheStatus(prev => ({ ...prev, loading: true }))
    try {
      const response = await fetch('/api/calendar?action=preload')
      if (response.ok) {
        const data = await response.json()
        setCacheStatus({
          loaded: true,
          loading: false,
          expiresIn: data.cacheExpires || 60,
          daysLoaded: data.daysLoaded || 0
        })
        console.log(`Availability preloaded: ${data.daysLoaded} days, expires in ${data.cacheExpires}min`)
      }
    } catch (error) {
      console.error('Failed to preload availability:', error)
      setCacheStatus({ loaded: false, loading: false, expiresIn: 0 })
    }
  }

  // Fetch available slots when date is selected
  useEffect(() => {
    if (selectedDate) {
      fetchAvailability(selectedDate)
    }
  }, [selectedDate])

  const fetchSessionCredits = async () => {
    try {
      const response = await fetch(`/api/profile?userId=${user.id}&email=${encodeURIComponent(user.email)}`)
      if (response.ok) {
        const data = await response.json()
        const credits = calculateSessionCredits(data.profile?.purchases)
        // Check if trial has been used (trial sessions_used > 0 or no trial remaining)
        const purchases = data.profile?.purchases || []
        const trialPkg = purchases.find(p => p.type === 'trial' || p.package_id === 'trial')
        const trialUsed = trialPkg ? (trialPkg.sessions_used || 0) > 0 : false
        setSessionCredits({ ...credits, trialUsed, loading: false })
      } else {
        setSessionCredits({ trial: 0, regular: 0, trialUsed: false, loading: false })
      }
    } catch (error) {
      console.error('Could not fetch session credits:', error)
      setSessionCredits({ trial: 0, regular: 0, trialUsed: false, loading: false })
    }
  }

  // Convert time from business timezone to user's local timezone
  const convertToLocalTime = (timeStr, dateStr, fromTimezone) => {
    const [timePart, ampm] = timeStr.split(' ')
    const [hours, minutes] = timePart.split(':').map(Number)
    let hour24 = hours
    if (ampm === 'PM' && hours !== 12) hour24 += 12
    if (ampm === 'AM' && hours === 12) hour24 = 0

    // Create a date string in the business timezone
    const dateTimeStr = `${dateStr}T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
    
    // Parse as business timezone and convert to local
    const businessDate = new Date(dateTimeStr)
    
    // Get the offset difference between business and local timezone
    const localTime = businessDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: userTimezone
    })
    
    return localTime
  }

  const fetchAvailability = async (date) => {
    setLoadingSlots(true)
    setAvailableSlots([])
    
    try {
      const dateStr = date.toISOString().split('T')[0]
      const response = await fetch(`/api/calendar?action=availability&date=${dateStr}`)
      
      if (response.ok) {
        const data = await response.json()
        const slotsData = data.availableSlots || []
        const tz = data.timezone || 'America/Chicago'
        setBusinessTimezone(tz)
        
        // Store slots with both business time and local time
        const slots = slotsData.map(time => {
          const canBookHour = canBookHourSession(time, slotsData)
          const localTime = convertToLocalTime(time, dateStr, tz)
          return { 
            time,  // Original business timezone time (for booking)
            localTime, // User's local timezone time (for display)
            canBookHour 
          }
        })
        setAvailableSlots(slots)
      } else {
        // API error - no slots available
        setAvailableSlots([])
      }
    } catch (error) {
      console.log('Error fetching availability:', error)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  // Check if an hour session is possible starting at this time
  const canBookHourSession = (startTime, allSlots) => {
    // Parse the time to get the next 30-min slot
    const [timePart, ampm] = startTime.split(' ')
    const [hours, minutes] = timePart.split(':').map(Number)
    
    let nextHours = hours
    let nextMinutes = minutes + 30
    let nextAmpm = ampm
    
    if (nextMinutes >= 60) {
      nextMinutes = 0
      nextHours += 1
      if (nextHours === 12 && ampm === 'AM') {
        nextAmpm = 'PM'
      } else if (nextHours === 12 && ampm === 'PM') {
        nextAmpm = 'AM' // Would be next day, but we're within same day
      } else if (nextHours > 12) {
        nextHours -= 12
      }
    }
    
    const nextSlot = `${nextHours}:${nextMinutes.toString().padStart(2, '0')} ${nextAmpm}`
    return allSlots.includes(nextSlot)
  }

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !user || !selectedSessionType) return
    
    setBooking(true)
    setBookingResult(null)
    
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const duration = selectedSessionType === 'trial' ? 30 : 60
      
      const response = await fetch('/api/calendar?action=book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          time: selectedTime,
          userId: user.id,
          userEmail: user.email,
          userName: user.name || user.email.split('@')[0],
          sessionType: selectedSessionType,
          duration
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setBookingResult({
          success: true,
          message: data.message || 'Booking confirmed!',
          eventLink: data.eventLink
        })
        fetchSessionCredits()
        setSelectedTime(null)
        setSelectedSessionType(null)
        fetchAvailability(selectedDate)
      } else {
        // Handle cache expired or slot unavailable - refresh and retry
        if (data.needsRefresh || data.code === 'CACHE_EXPIRED' || data.code === 'SLOT_UNAVAILABLE') {
          setBookingResult({
            success: false,
            message: 'Availability changed. Refreshing times...',
            refreshing: true
          })
          // Refresh cache and reload slots
          await preloadAvailability()
          await fetchAvailability(selectedDate)
          setBookingResult({
            success: false,
            message: data.error || 'Please select a new time slot.'
          })
        } else {
          setBookingResult({
            success: false,
            message: data.error || 'Failed to book. Please try again.'
          })
        }
      }
    } catch (error) {
      console.error('Booking error:', error)
      setBookingResult({
        success: false,
        message: 'Network error. Please try again.'
      })
    } finally {
      setBooking(false)
    }
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    
    const days = []
    for (let i = 0; i < startingDay; i++) {
      days.push({ day: null, disabled: true })
    }
    
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    
    for (let i = 1; i <= daysInMonth; i++) {
      const thisDate = new Date(year, month, i)
      const isPast = thisDate < todayStart
      const isBeyondLimit = thisDate > fourWeeksFromNow
      days.push({ 
        day: i, 
        disabled: isPast || isBeyondLimit, 
        date: thisDate,
        beyondLimit: isBeyondLimit
      })
    }
    
    return days
  }

  const days = getDaysInMonth(currentMonth)
  const totalSessions = sessionCredits.trial + sessionCredits.regular

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    setSelectedDate(null)
    setSelectedTime(null)
    setSelectedSessionType(null)
    setAvailableSlots([])
    setBookingResult(null)
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    setSelectedDate(null)
    setSelectedTime(null)
    setSelectedSessionType(null)
    setAvailableSlots([])
    setBookingResult(null)
  }

  const handleDateClick = (dayObj) => {
    if (!dayObj.disabled && dayObj.day) {
      setSelectedDate(dayObj.date)
      setSelectedTime(null)
      setSelectedSessionType(null)
      setBookingResult(null)
    }
  }

  const handleTimeClick = (slot) => {
    setSelectedTime(slot.time)
    setSelectedSessionType(null) // Reset session type when time changes
    setBookingResult(null)
  }

  const formatSelectedDate = () => {
    if (!selectedDate) return ''
    return `${months[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`
  }

  // Get the selected slot info
  const selectedSlot = availableSlots.find(s => s.time === selectedTime)
  const canSelectTrial = sessionCredits.trial > 0 && !sessionCredits.trialUsed
  const canSelectRegular = sessionCredits.regular > 0 && selectedSlot?.canBookHour

  // Format timezone for display (e.g., "America/Chicago" -> "Central Time")
  const formatTimezone = (tz) => {
    const tzMap = {
      'America/Chicago': 'Central Time',
      'America/New_York': 'Eastern Time',
      'America/Los_Angeles': 'Pacific Time',
      'America/Denver': 'Mountain Time',
      'America/Phoenix': 'Arizona Time'
    }
    return tzMap[tz] || tz.replace('America/', '').replace(/_/g, ' ')
  }

  return (
    <section className="calendar-section" id="book">
      <div className="section-header">
        <h2>Book Your Session</h2>
        <p>Select a date and time that works for you (next 4 weeks)</p>
        <p className="timezone-note">Times shown in your timezone ({formatTimezone(userTimezone)}) • Sessions held in {formatTimezone(businessTimezone)}</p>
      </div>

      {user && (
        <div className="profile-reminder">
          <p>
            <strong>Tip:</strong> Before your session, make sure to update your <a href="#" onClick={(e) => { e.preventDefault(); document.querySelector('.header-avatar')?.click() }}>Profile</a> with your Main Concerns, Target Schools, and any helpful resources/files.
          </p>
        </div>
      )}

      {user && (
        <div className="session-credits">
          <div className="credits-card">
            <div className="credit-item">
              <span className="credit-count">{sessionCredits.trial}</span>
              <span className="credit-label">Trial Sessions</span>
              {sessionCredits.trialUsed && <span className="credit-note">(Used)</span>}
            </div>
            <div className="credit-divider"></div>
            <div className="credit-item">
              <span className="credit-count">{sessionCredits.regular}</span>
              <span className="credit-label">Regular Sessions</span>
            </div>
            <div className="credit-divider"></div>
            <div className="credit-item total">
              <span className="credit-count">{totalSessions}</span>
              <span className="credit-label">Total Available</span>
            </div>
          </div>
          {totalSessions === 0 && !sessionCredits.loading && (
            <p className="no-credits-msg">
              No sessions remaining. <a href="#packages">Purchase a package</a> to book.
            </p>
          )}
        </div>
      )}

      {!user && (
        <div className="session-credits">
          <p className="sign-in-prompt">Sign in to see your available sessions and book</p>
        </div>
      )}

      <div className="calendar-container">
        <div className="calendar-card">
          <div className="calendar-header">
            <button className="calendar-nav-btn" onClick={prevMonth}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <span className="calendar-month">
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button className="calendar-nav-btn" onClick={nextMonth}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          <div className="calendar-weekdays">
            {daysOfWeek.map(day => <span key={day}>{day}</span>)}
          </div>

          <div className="calendar-days">
            {days.map((dayObj, index) => (
              <button
                key={index}
                className={`calendar-day ${dayObj.disabled ? 'disabled' : ''} ${dayObj.beyondLimit ? 'beyond-limit' : ''} ${
                  selectedDate && dayObj.date && 
                  selectedDate.toDateString() === dayObj.date.toDateString() ? 'selected' : ''
                }`}
                onClick={() => handleDateClick(dayObj)}
                disabled={dayObj.disabled}
                title={dayObj.beyondLimit ? 'Only booking within 4 weeks' : ''}
              >
                {dayObj.day}
              </button>
            ))}
          </div>
        </div>

        <div className="time-slots-card">
          <h4>Available Times</h4>
          {selectedDate ? (
            <>
              <p className="selected-date">{formatSelectedDate()}</p>
              {loadingSlots ? (
                <div className="loading-slots">
                  <div className="slot-spinner"></div>
                  <p>Checking availability...</p>
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="time-slots-grid">
                  {availableSlots.map(slot => (
                    <button
                      key={slot.time}
                      className={`time-slot ${selectedTime === slot.time ? 'selected' : ''}`}
                      onClick={() => handleTimeClick(slot)}
                      title={`${slot.time} ${formatTimezone(businessTimezone)}`}
                    >
                      {slot.localTime}
                      {!slot.canBookHour && <span className="slot-badge">30m only</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="no-slots-msg">No available times for this date. Please select another day.</p>
              )}
            </>
          ) : (
            <p className="select-date-prompt">Select a date to see available times</p>
          )}

          {/* Session Type Selection */}
          {selectedTime && user && totalSessions > 0 && (
            <div className="session-type-selection">
              <h4>Choose Session Type</h4>
              <div className="session-type-options">
                <button
                  className={`session-type-btn trial ${selectedSessionType === 'trial' ? 'selected' : ''} ${!canSelectTrial ? 'disabled' : ''}`}
                  onClick={() => canSelectTrial && setSelectedSessionType('trial')}
                  disabled={!canSelectTrial}
                >
                  <span className="type-name">Trial Session</span>
                  <span className="type-duration">30 minutes</span>
                  {sessionCredits.trialUsed && <span className="type-note">Already used</span>}
                  {!sessionCredits.trialUsed && sessionCredits.trial === 0 && <span className="type-note">None available</span>}
                </button>
                <button
                  className={`session-type-btn regular ${selectedSessionType === 'regular' ? 'selected' : ''} ${!canSelectRegular ? 'disabled' : ''}`}
                  onClick={() => canSelectRegular && setSelectedSessionType('regular')}
                  disabled={!canSelectRegular}
                >
                  <span className="type-name">Regular Session</span>
                  <span className="type-duration">1 hour</span>
                  {!selectedSlot?.canBookHour && <span className="type-note">Not enough time</span>}
                  {selectedSlot?.canBookHour && sessionCredits.regular === 0 && <span className="type-note">None available</span>}
                </button>
              </div>
            </div>
          )}

          {bookingResult && (
            <div className={`booking-result ${bookingResult.success ? 'success' : 'error'}`}>
              <p>{bookingResult.message}</p>
              {bookingResult.eventLink && (
                <a href={bookingResult.eventLink} target="_blank" rel="noopener noreferrer" className="event-link">
                  View in Google Calendar →
                </a>
              )}
            </div>
          )}

          {selectedDate && selectedTime && selectedSessionType && !bookingResult?.success && (
            <div className="booking-summary">
              <p>
                <strong>Selected:</strong> {formatSelectedDate()} at {selectedSlot?.localTime || selectedTime}
                <br />
                <span className="timezone-detail">({selectedTime} {formatTimezone(businessTimezone)})</span>
                <br />
                <strong>Type:</strong> {selectedSessionType === 'trial' ? 'Trial (30 min)' : 'Regular (1 hour)'}
              </p>
              <button 
                className="confirm-booking-btn" 
                onClick={handleBooking}
                disabled={booking}
              >
                {booking ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          )}

          {selectedDate && selectedTime && !selectedSessionType && user && totalSessions > 0 && (
            <p className="select-session-prompt">Select a session type above to continue</p>
          )}

          {selectedDate && selectedTime && user && totalSessions === 0 && (
            <div className="booking-summary">
              <a href="#packages" className="confirm-booking-btn purchase-btn">
                Purchase Sessions
              </a>
            </div>
          )}

          {selectedDate && selectedTime && !user && (
            <p className="booking-sign-in">Sign in to confirm your booking</p>
          )}
        </div>
      </div>

      <RecentBookings />
    </section>
  )
}
