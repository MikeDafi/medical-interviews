import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { calculateSessionCredits } from '../utils'
import { parseTimeLabel, zonedWallClockToUtc, formatTimeLabel } from '../../lib/timezone.js'
import { slotsForBooking } from '../../lib/slots.js'
import RecentBookings from './RecentBookings'
import Login from './Login'

// Interview coach the sessions are booked with (shown in the booking confirmation).
const COACH_NAME = 'Ashley Kumar'

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
  
  // Hover-triggered preload refs
  const sectionRef = useRef(null)
  const hoverTimerRef = useRef(null)
  const hasPreloadedOnHover = useRef(false)
  // Slots this user has booked this session (dateStr -> [slot label]). Kept in a ref so the
  // filter below is always current and survives async refresh/preload callbacks. Guarantees a
  // just-booked slot is never shown again even if the server briefly still returns it.
  const bookedSlotsRef = useRef({})
  
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

  // Preload all availability on component mount (deferred to not block LCP)
  useEffect(() => {
    // Defer preload to after initial paint
    const deferPreload = window.requestIdleCallback || ((cb) => setTimeout(cb, 150))
    const handle = deferPreload(() => {
      preloadAvailability()
    })
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle)
      else clearTimeout(handle)
    }
  }, [])

  // Hover-triggered preload: if user hovers over booking section for 3+ seconds, ensure data is loaded
  const handleMouseEnter = useCallback(() => {
    // Clear any existing timer
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    
    // Set timer for 3 seconds
    hoverTimerRef.current = setTimeout(() => {
      // If not already loaded and not currently loading, trigger preload
      if (!cacheStatus.loaded && !cacheStatus.loading && !hasPreloadedOnHover.current) {
        hasPreloadedOnHover.current = true
        console.log('⏳ Hover triggered preload after 3s')
        preloadAvailability()
      }
    }, 3000)
  }, [cacheStatus.loaded, cacheStatus.loading])

  const handleMouseLeave = useCallback(() => {
    // Clear timer when mouse leaves
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    }
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
    
    // When a booking is cancelled, refresh availability (slot is now free)
    const handleBookingCancelled = () => {
      setPreloadedAvailability({}) // Clear local cache
      preloadAvailability() // Fetch fresh data from server
      fetchSessionCredits()
    }
    
    window.addEventListener('paymentCompleted', handlePaymentCompleted)
    window.addEventListener('bookingCancelled', handleBookingCancelled)
    return () => {
      window.removeEventListener('paymentCompleted', handlePaymentCompleted)
      window.removeEventListener('bookingCancelled', handleBookingCancelled)
    }
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

  // Fetch available slots when date is selected AND preload has completed
  useEffect(() => {
    // Only fetch after preload has completed (to avoid duplicate calls)
    if (selectedDate && cacheStatus.loaded) {
      fetchAvailability(selectedDate)
    }
  }, [selectedDate, cacheStatus.loaded])

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

  // Convert a slot's business-timezone wall-clock string to the visitor's local time.
  // DST-aware: the slot is interpreted in the business zone, resolved to an absolute instant,
  // then formatted in the visitor's timezone.
  const convertToLocalTime = (timeStr, dateStr, fromTimezone) => {
    const { hour24, minute } = parseTimeLabel(timeStr)
    const [year, month, day] = dateStr.split('-').map(Number)
    const instant = zonedWallClockToUtc(
      { year, month, day, hour: hour24, minute },
      fromTimezone
    )
    return formatTimeLabel(instant, userTimezone)
  }

  // Process slots data into display format
  const processSlotsData = (slotsData, dateStr, tz) => {
    // Hide any slot this user already booked this session (across all render paths: cached,
    // force-refresh, preload), so a propagation-laggy server response can never resurrect it.
    const booked = bookedSlotsRef.current[dateStr] || []
    const visibleSlots = booked.length ? slotsData.filter(time => !booked.includes(time)) : slotsData
    return visibleSlots.map(time => {
      const canBookHour = canBookHourSession(time, visibleSlots)
      const localTime = convertToLocalTime(time, dateStr, tz)
      return { time, localTime, canBookHour }
    })
  }

  const fetchAvailability = async (date, forceRefresh = false) => {
    // Use local date format to avoid UTC timezone issues
    const dateStr = date.toLocaleDateString('en-CA') // YYYY-MM-DD in local timezone
    
    // Use preloaded data (INSTANT - no API call!) unless force refreshing after booking
    if (!forceRefresh && preloadedAvailability[dateStr]) {
      console.log(`✓ Using local cache for ${dateStr}`)
      const data = preloadedAvailability[dateStr]
      const slotsData = data.availableSlots || []
      setAvailableSlots(processSlotsData(slotsData, dateStr, businessTimezone))
      setLoadingSlots(false)
      return
    }
    
    // Only make API call when force refreshing (after booking) to get fresh data
    if (forceRefresh) {
      console.log(`🔄 Force refreshing from API for ${dateStr}`)
      setLoadingSlots(true)
      
      try {
        const response = await fetch(`/api/calendar?action=availability&date=${dateStr}`)
        
        if (response.ok) {
          const data = await response.json()
          const slotsData = data.availableSlots || []
          const tz = data.timezone || 'America/Chicago'
          setBusinessTimezone(tz)
          
          // Update local cache with fresh data
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
    } else {
      // Date not in preload cache and not force refresh - show empty (shouldn't happen normally)
      console.log(`⚠ Date ${dateStr} not in preload cache`)
      setAvailableSlots([])
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
    if (!selectedDate || !selectedTime || !user || !selectedDuration) return
    
    setBooking(true)
    setBookingResult(null)
    
    try {
      // Use local date format to avoid UTC timezone issues
      const dateStr = selectedDate.toLocaleDateString('en-CA') // YYYY-MM-DD in local timezone
      
      // SECURITY: Session cookie authenticates user, no need to send userId/email
      const response = await fetch('/api/calendar?action=book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include session cookie
        body: JSON.stringify({
          date: dateStr,
          time: selectedTime,
          duration: selectedDuration,
          timezone: userTimezone
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Capture display details before selection state is reset below.
        const confirmedDateLabel = formatSelectedDate()
        const confirmedTimeLabel = `${selectedSlot?.localTime || selectedTime} (${formatTimezone(userTimezone)})`
        setBookingResult({
          success: true,
          message: '✅ Booking confirmed! Check your email for the Google Meet link.',
          details: {
            date: confirmedDateLabel,
            time: confirmedTimeLabel,
            coach: COACH_NAME,
            cancelNote: 'Free cancellation up to 1 day before your appointment.'
          }
        })
        fetchSessionCredits()

        // Optimistically remove the booked slot(s) immediately so the user never sees their own
        // just-booked time as still open. A 60-min session consumes two consecutive 30-min slots.
        const consumedSlots = slotsForBooking(selectedTime, selectedDuration)
        bookedSlotsRef.current[dateStr] = [
          ...(bookedSlotsRef.current[dateStr] || []),
          ...consumedSlots
        ]

        // Recompute the visible slots for this date from the cached raw list (now filtered by the
        // ref), and prune the local preload cache so date navigation stays consistent.
        const rawSlots = preloadedAvailability[dateStr]?.availableSlots
          || availableSlots.map(s => s.time)
        setAvailableSlots(processSlotsData(rawSlots, dateStr, businessTimezone))
        setPreloadedAvailability(prev => {
          const day = prev[dateStr]
          if (!day) return prev
          return {
            ...prev,
            [dateStr]: {
              ...day,
              availableSlots: (day.availableSlots || []).filter(t => !consumedSlots.includes(t))
            }
          }
        })

        setSelectedTime(null)
        setSelectedDuration(null)
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
    <section 
      className="calendar-section" 
      id="book"
      ref={sectionRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="section-header">
        <h2>Book Your Session</h2>
        <p>Select a date and time that works for you</p>
        <p className="booking-notice">Same-day bookings not available • Book at least 1 day in advance (up to 4 weeks)</p>
        <p className="timezone-note">Times shown in your timezone ({formatTimezone(userTimezone)})</p>
      </div>

      <div className="booking-info-box">
        <p>📧 <strong>You'll receive a confirmation email</strong> with your Google Meet link after booking</p>
        <p>🎥 <strong>All sessions are via Google Meet</strong> - join from any device</p>
        <p>✅ <strong>Free cancellation</strong> up to 1 day before your session</p>
      </div>

      {user && (
        <div className="profile-reminder">
          <p>
            <strong>Tip:</strong> Before your session, make sure to update your <a href="#" onClick={(e) => { e.preventDefault(); document.querySelector('.user-avatar-btn')?.click() }}>Profile</a> with your Main Concerns, Target Schools, and Background Info About Yourself.
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
            <button className="calendar-nav-btn" onClick={prevMonth} aria-label="Previous month">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <span className="calendar-month">
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button className="calendar-nav-btn" onClick={nextMonth} aria-label="Next month">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
          <h3>Available Times</h3>
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

          {/* Session Duration Selection - Show for logged in users */}
          {selectedTime && user && (
            <div className="session-type-selection">
              <h3>Choose Session Duration</h3>
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
              {totalSessions === 0 && (
                <div className="no-sessions-prompt">
                  <p>You don't have any sessions yet.</p>
                  <a href="#packages" className="purchase-sessions-link">
                    Browse Prep Packages →
                  </a>
                </div>
              )}
            </div>
          )}

          {bookingResult && (
            <div className={`booking-result ${bookingResult.success ? 'success' : 'error'}`}>
              <p>{bookingResult.message}</p>
              {bookingResult.details && (
                <div className="booking-confirmation-details">
                  <p><strong>Date:</strong> {bookingResult.details.date}</p>
                  <p><strong>Time:</strong> {bookingResult.details.time}</p>
                  <p><strong>Interviewing with:</strong> {bookingResult.details.coach}</p>
                  <p className="booking-cancel-note">{bookingResult.details.cancelNote}</p>
                  <p className="booking-profile-prompt">
                    📝 Next step: update your <a href="#" onClick={(e) => { e.preventDefault(); document.querySelector('.user-avatar-btn')?.click() }}>Profile</a> with your <strong>Main Concerns</strong>, <strong>Target Schools</strong>, and <strong>Background Info About Yourself</strong> so Ashley can tailor your session.
                  </p>
                </div>
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
