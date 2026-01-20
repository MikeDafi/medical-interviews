import { useState, useEffect } from 'react'
import { getTimeAgo } from '../utils'

const CACHE_KEY = 'recentPurchases'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export default function RecentBookings() {
  const [purchases, setPurchases] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_DURATION && data?.length > 0) {
          return data
        }
      }
    } catch {
      // Ignore cache errors
    }
    return []
  })

  useEffect(() => {
    fetchRecentPurchases()
    const interval = setInterval(fetchRecentPurchases, CACHE_DURATION)
    return () => clearInterval(interval)
  }, [])

  const fetchRecentPurchases = async () => {
    try {
      const response = await fetch('/api/purchases/recent')
      if (response.ok) {
        const data = await response.json()
        if (data.purchases?.length > 0) {
          setPurchases(data.purchases)
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: data.purchases,
            timestamp: Date.now()
          }))
        }
      }
    } catch {
      // Use cached data
    }
  }

  if (purchases.length === 0) return null

  return (
    <div className="recent-bookings">
      <h4>Recent Bookings</h4>
      <div className="recent-bookings-scroll">
        {purchases.map((purchase) => (
          <div className="recent-booking-card" key={purchase.id}>
            <div className="recent-booking-avatar">
              {purchase.first_name?.charAt(0) || 'U'}
            </div>
            <div className="recent-booking-info">
              <span className="recent-booking-name">{purchase.first_name}</span>
              <span className="recent-booking-package">{purchase.package_name}</span>
              <span className="recent-booking-time">{getTimeAgo(purchase.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
