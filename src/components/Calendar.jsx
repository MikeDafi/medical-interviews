import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import RecentBookings from './RecentBookings'

export default function Calendar() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [booking, setBooking] = useState(false)
  const [bookingResult, setBookingResult] = useState(null)
  const [sessionCredits, setSessionCredits] = useState({
    trial: 0,
    regular: 0,
    loading: true
  })

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December']

  useEffect(() => {
    if (user) {
      fetchSessionCredits()
    } else {
      setSessionCredits({ trial: 0, regular: 0, loading: false })
    }
    
    // Listen for payment completed to refresh from DB
    const handlePaymentCompleted = () => {
      if (user) {
        // Small delay to allow webhook to process
        setTimeout(() => fetchSessionCredits(), 2000)
      }
    }
    
    window.addEventListener('paymentCompleted', handlePaymentCompleted)
    return () => window.removeEventListener('paymentCompleted', handlePaymentCompleted)
  }, [user])

  // Fetch available time slots when date is selected
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
        // Purchases are now JSON on user object
        const purchases = data.profile?.purchases || []
        
        let trial = 0
        let regular = 0
        
        purchases.forEach(p => {
          const remaining = (p.sessions_total || 0) - (p.sessions_used || 0)
          if (p.type === 'trial' || p.package_id === 'trial') {
            trial += remaining
          } else {
            regular += remaining
          }
        })
        
        setSessionCredits({ trial, regular, loading: false })
      } else {
        setSessionCredits({ trial: 0, regular: 0, loading: false })
      }
    } catch (error) {
      console.log('Could not fetch session credits:', error)
      setSessionCredits({ trial: 0, regular: 0, loading: false })
    }
  }

  const fetchAvailability = async (date) => {
    setLoadingSlots(true)
    setAvailableSlots([])
    
    try {
      const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
      const response = await fetch(`/api/calendar/availability?date=${dateStr}`)
      
      if (response.ok) {
        const data = await response.json()
        setAvailableSlots(data.availableSlots || [])
      } else {
        // Fallback to default slots if API fails
        console.log('Availability API not available, using defaults')
        setAvailableSlots([
          '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
          '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
        ])
      }
    } catch (error) {
      console.log('Error fetching availability:', error)
      // Fallback to default slots
      setAvailableSlots([
        '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
        '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
      ])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !user) return
    
    setBooking(true)
    setBookingResult(null)
    
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const sessionType = sessionCredits.trial > 0 ? 'trial' : 'regular'
      const duration = sessionType === 'trial' ? 30 : 60
      
      const response = await fetch('/api/calendar/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          time: selectedTime,
          userId: user.id,
          userEmail: user.email,
          userName: user.name || user.email.split('@')[0],
          sessionType,
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
        // Refresh credits after booking
        fetchSessionCredits()
        // Clear selection
        setSelectedTime(null)
        // Refresh available slots for this date
        fetchAvailability(selectedDate)
      } else {
        setBookingResult({
          success: false,
          message: data.error || 'Failed to book. Please try again.'
        })
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
    
    // Previous month's days
    for (let i = 0; i < startingDay; i++) {
      days.push({ day: null, disabled: true })
    }
    
    // Current month's days
    const today = new Date()
    for (let i = 1; i <= daysInMonth; i++) {
      const thisDate = new Date(year, month, i)
      const isPast = thisDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const isWeekend = thisDate.getDay() === 0 || thisDate.getDay() === 6
      days.push({ 
        day: i, 
        disabled: isPast || isWeekend,
        date: thisDate
      })
    }
    
    return days
  }

  const days = getDaysInMonth(currentMonth)

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    setSelectedDate(null)
    setSelectedTime(null)
    setAvailableSlots([])
    setBookingResult(null)
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    setSelectedDate(null)
    setSelectedTime(null)
    setAvailableSlots([])
    setBookingResult(null)
  }

  const handleDateClick = (dayObj) => {
    if (!dayObj.disabled && dayObj.day) {
      setSelectedDate(dayObj.date)
      setSelectedTime(null)
      setBookingResult(null)
    }
  }

  const formatSelectedDate = () => {
    if (!selectedDate) return ''
    return `${months[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`
  }

  const totalSessions = sessionCredits.trial + sessionCredits.regular

  return (
    <section className="calendar-section" id="book">
      <div className="section-header">
        <h2>Book Your Session</h2>
        <p>Select a date and time that works for you</p>
      </div>

      {/* Session Credits Display */}
      {user && (
        <div className="session-credits">
          <div className="credits-card">
            <div className="credit-item">
              <span className="credit-count">{sessionCredits.trial}</span>
              <span className="credit-label">Trial Sessions</span>
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
            {daysOfWeek.map(day => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="calendar-days">
            {days.map((dayObj, index) => (
              <button
                key={index}
                className={`calendar-day ${dayObj.disabled ? 'disabled' : ''} ${
                  selectedDate && dayObj.date && 
                  selectedDate.toDateString() === dayObj.date.toDateString() ? 'selected' : ''
                }`}
                onClick={() => handleDateClick(dayObj)}
                disabled={dayObj.disabled}
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
                  {availableSlots.map(time => (
                    <button
                      key={time}
                      className={`time-slot ${selectedTime === time ? 'selected' : ''}`}
                      onClick={() => setSelectedTime(time)}
                    >
                      {time}
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

          {selectedDate && selectedTime && !bookingResult?.success && (
            <div className="booking-summary">
              <p><strong>Selected:</strong> {formatSelectedDate()} at {selectedTime}</p>
              {user && totalSessions > 0 ? (
                <button 
                  className="confirm-booking-btn" 
                  onClick={handleBooking}
                  disabled={booking}
                >
                  {booking ? 'Booking...' : 'Confirm Booking'}
                </button>
              ) : user ? (
                <a href="#packages" className="confirm-booking-btn purchase-btn">
                  Purchase Sessions
                </a>
              ) : (
                <p className="booking-sign-in">Sign in to confirm your booking</p>
              )}
            </div>
          )}
        </div>
      </div>

      <RecentBookings />
    </section>
  )
}
