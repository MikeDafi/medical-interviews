import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { calculateSessionCredits } from '../utils'
import RecentBookings from './RecentBookings'
import Login from './Login'

export default function Calendar() {
  const { user } = useAuth()
  // Default to tomorrow
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  })
  const [selectedTime, setSelectedTime] = useState(null)
  const [selectedDuration, setSelectedDuration] = useState(null) // 30 or 60 minutes
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [businessTimezone, setBusinessTimezone] = useState('America/Chicago')
  const [cacheStatus, setCacheStatus] = useState({ loaded: false, loading: false, expiresIn: 0 })
  const [preloadedAvailability, setPreloadedAvailability] = useState({}) // All 28 days cached locally
  
  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [booking, setBooking] = useState(false)
  const [bookingResult, setBookingResult] = useState(null)
  const [sessionCredits, setSessionCredits] = useState({ thirtyMin: 0, sixtyMin: 0, loading: true })
  const [showLogin, setShowLogin] = useState(false)

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
      setSessionCredits({ thirtyMin: 0, sixtyMin: 0, loading: false })
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
        
        // Store ALL availability data locally - instant date switching!
        if (data.availability) {
          setPreloadedAvailability(data.availability)
          console.log(`✓ Preloaded ${Object.keys(data.availability).length} days of availability`)
        }
        if (data.timezone) {
          setBusinessTimezone(data.timezone)
        }
      }
    } catch (error) {
      console.error('Failed to preload availability:', error)
      setCacheStatus({ loaded: false, loading: false, expiresIn: 0 })
    }
  }

  // Fetch available slots when date is selected OR when preload completes
  useEffect(() => {
    if (selectedDate) {
      fetchAvailability(selectedDate)
    }
  }, [selectedDate, cacheStatus.loaded]) // Re-run when preload completes!

  const fetchSessionCredits = async () => {
    try {
      const response = await fetch(`/api/profile?userId=${user.id}&email=${encodeURIComponent(user.email)}`)
      if (response.ok) {
        const data = await response.json()
        const credits = calculateSessionCredits(data.profile?.purchases)
        setSessionCredits({ ...credits, loading: false })
      } else {
        setSessionCredits({ thirtyMin: 0, sixtyMin: 0, loading: false })
      }
    } catch (error) {
      console.error('Could not fetch session credits:', error)
      setSessionCredits({ thirtyMin: 0, sixtyMin: 0, loading: false })
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

  // Process slots data into display format
  const processSlotsData = (slotsData, dateStr, tz) => {
    return slotsData.map(time => {
      const canBookHour = canBookHourSession(time, slotsData)
      const localTime = convertToLocalTime(time, dateStr, tz)
      return { time, localTime, canBookHour }
    })
  }

  const fetchAvailability = async (date) => {
    const dateStr = date.toISOString().split('T')[0]
    
    // Check if we have preloaded data for this date (INSTANT - no API call!)
    if (preloadedAvailability[dateStr]) {
      console.log(`✓ Using local cache for ${dateStr}`)
      const data = preloadedAvailability[dateStr]
      const slotsData = data.availableSlots || []
      setAvailableSlots(processSlotsData(slotsData, dateStr, businessTimezone))
      setLoadingSlots(false)
      return
    }
    
    // If preload is still loading, show loading state and wait for it
    if (cacheStatus.loading) {
      console.log(`⏳ Waiting for preload to complete for ${dateStr}`)
      setLoadingSlots(true)
      setAvailableSlots([])
      return // useEffect will re-trigger when preloadedAvailability updates
    }
    
    // Fallback: fetch from API and store locally
    console.log(`⚠ Fetching from API for ${dateStr} (not in local cache)`)
    setLoadingSlots(true)
    setAvailableSlots([])
    
    try {
      const response = await fetch(`/api/calendar?action=availability&date=${dateStr}`)
      
      if (response.ok) {
        const data = await response.json()
        const slotsData = data.availableSlots || []
        const tz = data.timezone || 'America/Chicago'
        setBusinessTimezone(tz)
        
        // Store in local cache for instant access later
        setPreloadedAvailability(prev => ({
          ...prev,
          [dateStr]: { availableSlots: slotsData, timezone: tz }
        }))
        
        setAvailableSlots(processSlotsData(slotsData, dateStr, tz))
      } else {
        setAvailableSlots([])
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  // Force refresh a specific date (used after booking failure)
  const refreshDateAvailability = async (date) => {
    const dateStr = date.toISOString().split('T')[0]
    console.log(`🔄 Force refreshing ${dateStr}`)
    
    try {
      const response = await fetch(`/api/calendar?action=refresh&date=${dateStr}`)
      if (response.ok) {
        const data = await response.json()
        const slotsData = data.availableSlots || []
        const tz = data.timezone || businessTimezone
        
        // Update local cache with fresh data
        setPreloadedAvailability(prev => ({
          ...prev,
          [dateStr]: { availableSlots: slotsData, timezone: tz }
        }))
        
        setAvailableSlots(processSlotsData(slotsData, dateStr, tz))
        console.log(`✓ Refreshed ${dateStr} with ${slotsData.length} slots`)
      }
    } catch (error) {
      console.error('Error refreshing availability:', error)
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
    if (!selectedDate || !selectedTime || !user || !selectedDuration) return
    
    setBooking(true)
    setBookingResult(null)
    
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      
      // SECURITY: Session cookie authenticates user, no need to send userId/email
      const response = await fetch('/api/calendar?action=book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include session cookie
        body: JSON.stringify({
          date: dateStr,
          time: selectedTime,
          duration: selectedDuration
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
        setSelectedDuration(null)
        fetchAvailability(selectedDate)
      } else {
        // Handle slot unavailable - refresh and let user pick another time
        if (data.code === 'SLOT_UNAVAILABLE') {
          setBookingResult({
            success: false,
            message: 'Updating available times...',
            refreshing: true
          })
          // Refresh this date's availability
          await fetchAvailability(selectedDate)
          setSelectedTime(null)
          setSelectedDuration(null)
          setBookingResult({
            success: false,
            message: data.error || 'Please select another available time.'
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
    // Tomorrow is the first bookable day (no same-day bookings)
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)
    
    for (let i = 1; i <= daysInMonth; i++) {
      const thisDate = new Date(year, month, i)
      const isPast = thisDate < todayStart
      const isToday = thisDate.getTime() === todayStart.getTime()
      const isBeyondLimit = thisDate > fourWeeksFromNow
      days.push({ 
        day: i, 
        disabled: isPast || isToday || isBeyondLimit, // Today is disabled (no same-day)
        date: thisDate,
        beyondLimit: isBeyondLimit,
        isToday: isToday
      })
    }
    
    return days
  }

  const days = getDaysInMonth(currentMonth)
  const totalSessions = sessionCredits.total || (sessionCredits.thirtyMin + sessionCredits.sixtyMin)

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    setSelectedDate(null)
    setSelectedTime(null)
    setSelectedDuration(null)
    setAvailableSlots([])
    setBookingResult(null)
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    setSelectedDate(null)
    setSelectedTime(null)
    setSelectedDuration(null)
    setAvailableSlots([])
    setBookingResult(null)
  }

  const handleDateClick = (dayObj) => {
    if (!dayObj.disabled && dayObj.day) {
      setSelectedDate(dayObj.date)
      setSelectedTime(null)
      setSelectedDuration(null)
      setBookingResult(null)
    }
  }

  const handleTimeClick = (slot) => {
    setSelectedTime(slot.time)
    setSelectedDuration(null) // Reset duration when time changes
    setBookingResult(null)
  }

  const formatSelectedDate = () => {
    if (!selectedDate) return ''
    return `${months[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`
  }

  // Get the selected slot info
  const selectedSlot = availableSlots.find(s => s.time === selectedTime)
  const canSelect30Min = sessionCredits.thirtyMin > 0
  const canSelect60Min = sessionCredits.sixtyMin > 0 && selectedSlot?.canBookHour

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
        <p>Select a date and time that works for you</p>
        <p className="booking-notice">Same-day bookings not available • Book at least 1 day in advance (up to 4 weeks)</p>
        <p className="timezone-note">Times shown in your timezone ({formatTimezone(userTimezone)})</p>
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
              <span className="credit-count">{sessionCredits.thirtyMin}</span>
              <span className="credit-label">30-min Sessions</span>
            </div>
            <div className="credit-divider"></div>
            <div className="credit-item">
              <span className="credit-count">{sessionCredits.sixtyMin}</span>
              <span className="credit-label">60-min Sessions</span>
            </div>
            <div className="credit-divider"></div>
            <div className="credit-item total">
              <span className="credit-count">{sessionCredits.total}</span>
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
          <p className="sign-in-prompt">
            <button type="button" className="sign-in-link" onClick={() => setShowLogin(true)}>Sign in</button> to see your available sessions and book
          </p>
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
                key={dayObj.date ? dayObj.date.toISOString() : `empty-${index}`}
                className={`calendar-day ${dayObj.disabled ? 'disabled' : ''} ${dayObj.beyondLimit ? 'beyond-limit' : ''} ${dayObj.isToday ? 'is-today' : ''} ${
                  selectedDate && dayObj.date && 
                  selectedDate.toDateString() === dayObj.date.toDateString() ? 'selected' : ''
                }`}
                onClick={() => handleDateClick(dayObj)}
                disabled={dayObj.disabled}
                title={dayObj.isToday ? 'Same-day bookings not available' : dayObj.beyondLimit ? 'Only booking within 4 weeks' : ''}
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

          {/* Session Duration Selection */}
          {selectedTime && user && totalSessions > 0 && (
            <div className="session-type-selection">
              <h4>Choose Session Duration</h4>
              <div className="session-type-options">
                <button
                  className={`session-type-btn thirty-min ${selectedDuration === 30 ? 'selected' : ''} ${!canSelect30Min ? 'disabled' : ''}`}
                  onClick={() => canSelect30Min && setSelectedDuration(30)}
                  disabled={!canSelect30Min}
                >
                  <span className="type-name">30-Minute Session</span>
                  <span className="type-duration">{sessionCredits.thirtyMin} available</span>
                  {sessionCredits.thirtyMin === 0 && <span className="type-note">None available</span>}
                </button>
                <button
                  className={`session-type-btn sixty-min ${selectedDuration === 60 ? 'selected' : ''} ${!canSelect60Min ? 'disabled' : ''}`}
                  onClick={() => canSelect60Min && setSelectedDuration(60)}
                  disabled={!canSelect60Min}
                >
                  <span className="type-name">60-Minute Session</span>
                  <span className="type-duration">{sessionCredits.sixtyMin} available</span>
                  {!selectedSlot?.canBookHour && <span className="type-note">Not enough time in slot</span>}
                  {selectedSlot?.canBookHour && sessionCredits.sixtyMin === 0 && <span className="type-note">None available</span>}
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

          {selectedDate && selectedTime && selectedDuration && !bookingResult?.success && (
            <div className="booking-summary">
              <p>
                <strong>Selected:</strong> {formatSelectedDate()} at {selectedSlot?.localTime || selectedTime}
                <br />
                <span className="timezone-detail">({selectedTime} {formatTimezone(businessTimezone)})</span>
                <br />
                <strong>Duration:</strong> {selectedDuration} minutes
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

          {selectedDate && selectedTime && !selectedDuration && user && totalSessions > 0 && (
            <p className="select-session-prompt">Select a session duration above to continue</p>
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

      {showLogin && <Login onClose={() => setShowLogin(false)} />}
    </section>
  )
}
