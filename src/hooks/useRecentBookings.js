import { useState, useEffect } from 'react'
import { getFallbackBookings } from '../components/RecentBookingNotification'

const CACHE_KEY = 'recentPurchasesShared'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Sort by created_at descending (most recent first)
function sortByRecent(data) {
  return [...data].sort((a, b) => {
    const dateA = new Date(a.created_at || 0)
    const dateB = new Date(b.created_at || 0)
    return dateB - dateA
  })
}

// In-memory cache for consistency across components in the same session
let memoryCache = null
let memoryCacheTimestamp = 0

// Safely read from localStorage
function readCache() {
  // Check memory cache first (same session consistency)
  if (memoryCache && Date.now() - memoryCacheTimestamp < CACHE_DURATION) {
    return { data: memoryCache, isStale: false }
  }
  
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_DURATION && data?.length > 0) {
        memoryCache = data
        memoryCacheTimestamp = timestamp
        return { data, isStale: false }
      }
      if (data?.length > 0) {
        return { data, isStale: true }
      }
    }
  } catch (e) {
    console.warn('Cache read error:', e.message)
  }
  return { data: [], isStale: true }
}

// Safely write to localStorage and memory
function writeCache(data) {
  memoryCache = data
  memoryCacheTimestamp = Date.now()
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
  } catch (e) {
    console.warn('Cache write error:', e.message)
  }
}

// Generate and cache fallbacks so they're consistent
function getOrCreateFallbacks(count) {
  const fallbackKey = `fallbackBookings_${count}`
  
  // Check if we already have fallbacks in memory for this session
  if (memoryCache && memoryCache.length > 0 && memoryCache[0]?.id?.startsWith?.('fallback')) {
    return memoryCache.slice(0, count)
  }
  
  try {
    const cached = sessionStorage.getItem(fallbackKey)
    if (cached) {
      const fallbacks = JSON.parse(cached)
      if (fallbacks?.length >= count) {
        return fallbacks.slice(0, count)
      }
    }
  } catch (e) {
    // Ignore
  }
  
  // Generate new fallbacks and store them for session consistency
  const fallbacks = getFallbackBookings(Math.max(count, 5))
  try {
    sessionStorage.setItem(fallbackKey, JSON.stringify(fallbacks))
  } catch (e) {
    // Ignore
  }
  
  return fallbacks.slice(0, count)
}

export function useRecentBookings(count = 5) {
  const [bookings, setBookings] = useState(() => {
    const cached = readCache()
    if (cached.data.length > 0) {
      return sortByRecent(cached.data).slice(0, count)
    }
    return sortByRecent(getOrCreateFallbacks(count))
  })
  const [isLoading, setIsLoading] = useState(() => readCache().isStale)

  useEffect(() => {
    fetchRecentPurchases()
  }, [count])

  const fetchRecentPurchases = async () => {
    try {
      const response = await fetch('/api/profile?action=recentPurchases')
      if (response.ok) {
        const data = await response.json()
        if (data.purchases?.length > 0) {
          const sorted = sortByRecent(data.purchases)
          writeCache(sorted)
          setBookings(sorted.slice(0, count))
          return
        }
      }
    } catch (e) {
      console.warn('Failed to fetch recent purchases:', e.message)
    }
    // No real data - use consistent fallbacks
    const fallbacks = sortByRecent(getOrCreateFallbacks(count))
    setBookings(fallbacks)
    setIsLoading(false)
  }

  return { bookings, isLoading }
}

