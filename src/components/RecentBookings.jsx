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
      // Demo data for development
      setBookings([
        { id: 1, first_name: 'Sarah', package_name: 'Package of 3', created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 2, first_name: 'James', package_name: '1 Hour Session', created_at: new Date(Date.now() - 7200000).toISOString() },
        { id: 3, first_name: 'Emily', package_name: 'Package of 5', created_at: new Date(Date.now() - 18000000).toISOString() },
        { id: 4, first_name: 'Michael', package_name: '30 Min Trial', created_at: new Date(Date.now() - 36000000).toISOString() },
        { id: 5, first_name: 'Priya', package_name: 'Package of 3', created_at: new Date(Date.now() - 86400000).toISOString() },
      ])
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

