import { useState, useEffect } from 'react'
import { getTimeAgo } from '../utils'

const CACHE_KEY = 'recentPurchases'
const NOTIFICATION_DELAY = 3000 // 3 seconds after page load

// Safely read from localStorage
function readCache(key) {
  try {
    const cached = localStorage.getItem(key)
    if (cached) {
      const { data } = JSON.parse(cached)
      if (data?.length > 0) return data
    }
  } catch (e) {
    console.warn('Cache read error:', e.message)
  }
  return null
}

// Safely write to localStorage
function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
  } catch (e) {
    console.warn('Cache write error:', e.message)
  }
}

export default function RecentBookingNotification() {
  const [notification, setNotification] = useState(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      // Try cache first for instant display
      const cached = readCache(CACHE_KEY)
      if (cached) {
        setNotification(cached[0])
        setIsVisible(true)
        return
      }
      // Fall back to API
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
          writeCache(CACHE_KEY, data.purchases)
        }
      }
      // Non-200 or no data: don't show notification (silent degradation)
    } catch (e) {
      console.warn('Failed to fetch recent purchase:', e.message)
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
        {(notification.first_name || 'U').charAt(0)}
      </div>
      <div className="notification-content">
        <p className="notification-name">
          <strong>{notification.first_name}</strong> recently booked
        </p>
        <p className="notification-details">
          {notification.package_name} • {getTimeAgo(notification.created_at)}
        </p>
      </div>
      <button 
        type="button"
        className="notification-close" 
        onClick={handleClose}
        aria-label="Close notification"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  )
}
