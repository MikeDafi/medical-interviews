import { useState } from 'react'
import RecentBookings from './RecentBookings'

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December']

  const timeSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
  ]

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
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    setSelectedDate(null)
    setSelectedTime(null)
  }

  const handleDateClick = (dayObj) => {
    if (!dayObj.disabled && dayObj.day) {
      setSelectedDate(dayObj.date)
      setSelectedTime(null)
    }
  }

  const formatSelectedDate = () => {
    if (!selectedDate) return ''
    return `${months[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`
  }

  return (
    <section className="calendar-section" id="book">
      <div className="section-header">
        <h2>Book Your Session</h2>
        <p>Select a date and time that works for you</p>
      </div>

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
              <div className="time-slots-grid">
                {timeSlots.map(time => (
                  <button
                    key={time}
                    className={`time-slot ${selectedTime === time ? 'selected' : ''}`}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="select-date-prompt">Select a date to see available times</p>
          )}

          {selectedDate && selectedTime && (
            <div className="booking-summary">
              <p><strong>Selected:</strong> {formatSelectedDate()} at {selectedTime}</p>
              <button className="confirm-booking-btn">
                Confirm Booking
              </button>
            </div>
          )}
        </div>
      </div>

      <RecentBookings />
    </section>
  )
}
