import { useState, useEffect } from 'react'
import { getTimeAgo } from '../utils'

const CACHE_KEY = 'recentPurchases'
const NOTIFICATION_DELAY = 3000 // 3 seconds after page load

export default function RecentBookingNotification() {
  const [notification, setNotification] = useState(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      // Try cache first
      try {
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const { data } = JSON.parse(cached)
          if (data?.length > 0) {
            setNotification(data[0])
            setIsVisible(true)
            return
          }
        }
      } catch {
        // Ignore
      }
      fetchRecentPurchase()
    }, NOTIFICATION_DELAY)
    
    return () => clearTimeout(timer)
  }, [])

  const fetchRecentPurchase = async () => {
    try {
      const response = await fetch('/api/purchases/recent')
      if (response.ok) {
        const data = await response.json()
        if (data.purchases?.length > 0) {
          setNotification(data.purchases[0])
          setIsVisible(true)
          // Cache for RecentBookings component
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: data.purchases,
            timestamp: Date.now()
          }))
        }
      }
    } catch {
      // No notification to display
    }
  }

  const handleClick = () => {
    setIsVisible(false)
    document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleClose = (e) => {
    e.stopPropagation()
    setIsVisible(false)
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
      <button className="notification-close" onClick={handleClose}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  )
}

