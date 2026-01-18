import { useState, useEffect } from 'react'

export default function RecentBookingNotification() {
  const [notification, setNotification] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    fetchRecentBookings()
  }, [])

  useEffect(() => {
    if (bookings.length > 0) {
      showRandomNotification()
      const interval = setInterval(showRandomNotification, 15000) // Show every 15 seconds
      return () => clearInterval(interval)
    }
  }, [bookings])

  const fetchRecentBookings = async () => {
    try {
      const response = await fetch('/api/bookings/recent')
      if (response.ok) {
        const data = await response.json()
        setBookings(data.bookings || [])
      }
    } catch (error) {
      // If API fails, use demo data for development
      setBookings([
        { id: 1, first_name: 'Sarah', package_name: 'Package of 3', created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 2, first_name: 'James', package_name: '1 Hour Session', created_at: new Date(Date.now() - 7200000).toISOString() },
        { id: 3, first_name: 'Emily', package_name: 'Package of 5', created_at: new Date(Date.now() - 18000000).toISOString() },
        { id: 4, first_name: 'Michael', package_name: '30 Min Trial', created_at: new Date(Date.now() - 36000000).toISOString() },
        { id: 5, first_name: 'Priya', package_name: 'Package of 3', created_at: new Date(Date.now() - 86400000).toISOString() },
      ])
    }
  }

  const showRandomNotification = () => {
    if (bookings.length === 0) return
    
    const randomBooking = bookings[Math.floor(Math.random() * bookings.length)]
    setNotification(randomBooking)
    setIsVisible(true)

    // Hide after 5 seconds
    setTimeout(() => {
      setIsVisible(false)
    }, 5000)
  }

  const getTimeAgo = (dateString) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  const handleClick = () => {
    setIsVisible(false)
    document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' })
  }

  if (!notification || !isVisible) return null

  return (
    <div className="booking-notification" onClick={handleClick}>
      <div className="notification-avatar">
        {notification.first_name?.charAt(0) || 'U'}
      </div>
      <div className="notification-content">
        <p className="notification-name">
          <strong>{notification.first_name}</strong> recently booked
        </p>
        <p className="notification-details">
          {notification.package_name} • {getTimeAgo(notification.created_at)}
        </p>
      </div>
      <button className="notification-close" onClick={(e) => { e.stopPropagation(); setIsVisible(false); }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  )
}

