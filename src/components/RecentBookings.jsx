import { useState, useEffect } from 'react'
import { getTimeAgo } from '../utils'

const CACHE_KEY = 'recentPurchases'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Safely read from localStorage (handles SSR, private browsing, quota errors)
function readCache(key) {
  try {
    const cached = localStorage.getItem(key)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_DURATION && data?.length > 0) {
        return { data, isStale: false }
      }
      // Return stale data with flag
      if (data?.length > 0) {
        return { data, isStale: true }
      }
    }
  } catch (e) {
    console.warn('Cache read error:', e.message)
  }
  return { data: [], isStale: true }
}

// Safely write to localStorage
function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
  } catch (e) {
    console.warn('Cache write error:', e.message)
  }
}

export default function RecentBookings() {
  const [purchases, setPurchases] = useState(() => readCache(CACHE_KEY).data)
  const [isLoading, setIsLoading] = useState(() => readCache(CACHE_KEY).isStale)

  useEffect(() => {
    fetchRecentPurchases()
    const interval = setInterval(fetchRecentPurchases, CACHE_DURATION)
    return () => clearInterval(interval)
  }, [])

  const fetchRecentPurchases = async () => {
    try {
      const response = await fetch('/api/profile?action=recentPurchases')
      if (response.ok) {
        const data = await response.json()
        if (data.purchases?.length > 0) {
          setPurchases(data.purchases)
          writeCache(CACHE_KEY, data.purchases)
        }
      }
    } catch (e) {
      console.warn('Failed to fetch recent purchases:', e.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (purchases.length === 0 && !isLoading) return null

  return (
    <div className="recent-bookings">
      <h4>Recent Bookings</h4>
      <div className="recent-bookings-scroll">
        {isLoading && purchases.length === 0 ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div className="recent-booking-card loading" key={`skeleton-${i}`}>
              <div className="recent-booking-avatar skeleton" />
              <div className="recent-booking-info">
                <span className="recent-booking-name skeleton" />
                <span className="recent-booking-package skeleton" />
              </div>
            </div>
          ))
        ) : (
          purchases.map((purchase) => (
            <div className="recent-booking-card" key={purchase.id}>
              <div className="recent-booking-avatar">
                {(purchase.first_name || 'U').charAt(0)}
              </div>
              <div className="recent-booking-info">
                <span className="recent-booking-name">{purchase.first_name || 'User'}</span>
                <span className="recent-booking-package">{purchase.package_name}</span>
                <span className="recent-booking-time">{getTimeAgo(purchase.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
