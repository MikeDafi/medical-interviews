import { useState, useEffect } from 'react'

const CACHE_KEY = 'recentBookings'

export default function RecentBookingNotification() {
  const [notification, setNotification] = useState(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Small delay to let the page load, then check cache first
    const timer = setTimeout(() => {
      // Try cache first
      try {
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const { data } = JSON.parse(cached)
          if (data && data.length > 0) {
            setNotification(data[0])
            setIsVisible(true)
            return
          }
        }
      } catch (e) {
        // Ignore cache errors
      }
      // Only fetch if no cache
      fetchRecentBooking()
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [])

  const fetchRecentBooking = async () => {
    try {
      const response = await fetch('/api/bookings/recent')
      if (response.ok) {
        const data = await response.json()
        if (data.bookings && data.bookings.length > 0) {
          // Only show the most recent booking
          setNotification(data.bookings[0])
          setIsVisible(true)
          // Cache the results (shared with RecentBookings)
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: data.bookings,
            timestamp: Date.now()
          }))
        }
      }
    } catch (error) {
      console.log('No recent bookings to display')
    }
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
