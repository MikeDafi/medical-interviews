import { useState, useEffect, useSyncExternalStore, useCallback } from 'react'
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

// ============================================
// GLOBAL STORE - Single source of truth
// ============================================
let globalBookings = []
let globalLoading = true
let globalFetched = false
let listeners = new Set()

function notifyListeners() {
  listeners.forEach(listener => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return globalBookings
}

function getLoadingSnapshot() {
  return globalLoading
}

// Initialize from cache on module load
function initFromCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_DURATION && data?.length > 0) {
        globalBookings = sortByRecent(data)
        globalLoading = false
        return
      }
      if (data?.length > 0) {
        // Stale but use as initial value
        globalBookings = sortByRecent(data)
      }
    }
  } catch (e) {
    console.warn('Cache read error:', e.message)
  }
  
  // No valid cache - use fallbacks
  if (globalBookings.length === 0) {
    globalBookings = sortByRecent(getFallbackBookings(5))
  }
}

// Write to localStorage
function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
  } catch (e) {
    console.warn('Cache write error:', e.message)
  }
}

// Fetch from API (called once globally)
async function fetchGlobalBookings() {
  if (globalFetched) return // Already fetching or fetched
  globalFetched = true
  
  try {
    const response = await fetch('/api/profile?action=recentPurchases')
    if (response.ok) {
      const data = await response.json()
      if (data.purchases?.length > 0) {
        const sorted = sortByRecent(data.purchases)
        globalBookings = sorted
        writeCache(sorted)
        globalLoading = false
        notifyListeners()
        return
      }
    }
  } catch (e) {
    console.warn('Failed to fetch recent purchases:', e.message)
  }
  
  // No real data - keep fallbacks
  globalLoading = false
  notifyListeners()
}

// Initialize on module load
initFromCache()

// ============================================
// HOOK - Returns slice of global store
// ============================================
export function useRecentBookings(count = 5) {
  // Subscribe to global store changes
  const allBookings = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const isLoading = useSyncExternalStore(
    subscribe, 
    getLoadingSnapshot, 
    getLoadingSnapshot
  )
  
  // Trigger fetch on first mount (deferred)
  useEffect(() => {
    if (globalFetched) return
    
    const deferFetch = window.requestIdleCallback || ((cb) => setTimeout(cb, 100))
    const handle = deferFetch(() => {
      fetchGlobalBookings()
    })
    
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle)
      else clearTimeout(handle)
    }
  }, [])
  
  // Return sliced data - all components see same underlying data
  const bookings = allBookings.slice(0, count)
  
  return { bookings, isLoading }
}
