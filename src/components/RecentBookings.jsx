import { useState, useEffect } from 'react'

export default function RecentBookings() {
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    fetchRecentBookings()
  }, [])

  const fetchRecentBookings = async () => {
    try {
      const response = await fetch('/api/bookings/recent')
      if (response.ok) {
        const data = await response.json()
        setBookings(data.bookings || [])
      }
    } catch (error) {
      // No demo data - only show real bookings from DB
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

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  // Don't render anything if no real bookings exist
  if (bookings.length === 0) return null

  return (
    <div className="recent-bookings">
      <h4>Recent Bookings</h4>
      <div className="recent-bookings-scroll">
        {bookings.map((booking) => (
          <div className="recent-booking-card" key={booking.id}>
            <div className="recent-booking-avatar">
              {booking.first_name?.charAt(0) || 'U'}
            </div>
            <div className="recent-booking-info">
              <span className="recent-booking-name">{booking.first_name}</span>
              <span className="recent-booking-package">{booking.package_name}</span>
              <span className="recent-booking-time">{getTimeAgo(booking.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
