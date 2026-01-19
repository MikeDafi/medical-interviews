import { useState, useEffect } from 'react'

// Fallback demo bookings only used if DB is empty AND no cache
const demoBookings = [
  { id: 1, first_name: 'Sarah', package_name: '1 Hour Session', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: 2, first_name: 'Michael', package_name: 'Package of 3', created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
  { id: 3, first_name: 'Emily', package_name: '30 Min Trial', created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
  { id: 4, first_name: 'James', package_name: 'Package of 5', created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
  { id: 5, first_name: 'Priya', package_name: '1 Hour Session', created_at: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString() },
]

const CACHE_KEY = 'recentBookings'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export default function RecentBookings() {
  const [bookings, setBookings] = useState(() => {
    // Try to load from cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_DURATION && data.length > 0) {
          return data
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    return demoBookings
  })

  useEffect(() => {
    fetchRecentBookings()
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchRecentBookings, CACHE_DURATION)
    return () => clearInterval(interval)
  }, [])

  const fetchRecentBookings = async () => {
    try {
      const response = await fetch('/api/bookings/recent')
      if (response.ok) {
        const data = await response.json()
        if (data.bookings && data.bookings.length > 0) {
          setBookings(data.bookings)
          // Cache the results
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: data.bookings,
            timestamp: Date.now()
          }))
        }
      }
    } catch (error) {
      console.log('Using cached/demo bookings')
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

  // Always show recent bookings (demo or real)
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
