import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getTimeAgo } from '../utils'

const CACHE_KEY = 'recentPurchases'
const NOTIFICATION_DELAY = 3000 // 3 seconds after page load

// 100 common first names for fallback social proof
const FALLBACK_NAMES = [
  'Sarah', 'Michael', 'Emily', 'James', 'Priya', 'David', 'Amanda', 'Kevin',
  'Jessica', 'Daniel', 'Ashley', 'Matthew', 'Sophia', 'Andrew', 'Olivia', 'Ryan',
  'Emma', 'Joshua', 'Isabella', 'Brandon', 'Mia', 'Justin', 'Ava', 'Tyler',
  'Abigail', 'Nathan', 'Madison', 'Christian', 'Chloe', 'Dylan', 'Elizabeth', 'Alex',
  'Grace', 'Ethan', 'Samantha', 'Jacob', 'Alyssa', 'Nicholas', 'Hannah', 'Zachary',
  'Victoria', 'Aaron', 'Natalie', 'Jose', 'Lily', 'Adam', 'Ella', 'Brian',
  'Avery', 'Jason', 'Sofia', 'Eric', 'Camila', 'Steven', 'Aria', 'Patrick',
  'Scarlett', 'Jonathan', 'Penelope', 'Sean', 'Layla', 'Timothy', 'Riley', 'Jeffrey',
  'Zoey', 'Mark', 'Nora', 'Stephen', 'Lillian', 'Benjamin', 'Addison', 'Anthony',
  'Aubrey', 'Samuel', 'Ellie', 'Kyle', 'Stella', 'Raymond', 'Natasha', 'Derek',
  'Maya', 'Carlos', 'Leah', 'Adrian', 'Lucy', 'Gabriel', 'Savannah', 'Henry',
  'Brooklyn', 'Vincent', 'Paisley', 'Russell', 'Audrey', 'Eugene', 'Claire', 'Philip',
  'Skylar', 'Randy', 'Bella', 'Johnny', 'Anna'
]

const FALLBACK_PACKAGES = [
  '5-Session Package',
  '1-Hour Session', 
  '30-Min Trial',
  '1-Hour Session',
  '5-Session Package'
]

// Get week number of the year
function getWeekOfYear() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now - start
  const oneWeek = 1000 * 60 * 60 * 24 * 7
  return Math.floor(diff / oneWeek)
}

// Seeded random number generator (consistent for the same week)
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// Get a consistent fallback based on the week (changes weekly, not every refresh)
// Pass an offset (0, 1, 2, etc.) to get different names for multiple listings
export function getFallbackBooking(offset = 0) {
  const weekOfYear = getWeekOfYear()
  const baseIndex = weekOfYear * 7 + offset * 13 // Different multipliers to spread names out
  const nameIndex = baseIndex % FALLBACK_NAMES.length
  const packageIndex = (baseIndex + offset * 3) % FALLBACK_PACKAGES.length
  
  // Generate a random hour between 1 and 168 (1 week) based on the week seed + offset
  const randomHours = Math.floor(seededRandom((weekOfYear + offset) * 123 + offset * 456) * 167) + 1
  
  // Create a fake timestamp
  const created_at = new Date(Date.now() - randomHours * 60 * 60 * 1000).toISOString()
  
  return {
    first_name: FALLBACK_NAMES[nameIndex],
    package_name: FALLBACK_PACKAGES[packageIndex],
    created_at,
    id: `fallback-${offset}`
  }
}

// Get multiple fallback bookings with different names
export function getFallbackBookings(count = 3) {
  return Array.from({ length: count }, (_, i) => getFallbackBooking(i))
}

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
  const { user } = useAuth()
  const [notification, setNotification] = useState(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only fetch if user is logged in
    if (!user) return

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
  }, [user])

  const fetchRecentPurchase = async () => {
    try {
      const response = await fetch('/api/profile?action=recentPurchases')
      if (response.ok) {
        const data = await response.json()
        if (data.purchases?.length > 0) {
          setNotification(data.purchases[0])
          setIsVisible(true)
          writeCache(CACHE_KEY, data.purchases)
          return
        }
      }
      // No real data: show fallback booking
      setNotification(getFallbackBooking())
      setIsVisible(true)
    } catch (e) {
      console.warn('Failed to fetch recent purchase:', e.message)
      // On error, still show fallback
      setNotification(getFallbackBooking())
      setIsVisible(true)
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
