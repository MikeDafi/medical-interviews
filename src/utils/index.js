// Shared utility functions

/**
 * Format a date string to relative time (e.g., "2h ago", "1d ago")
 */
export function getTimeAgo(dateString) {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

/**
 * Format a date for display
 */
export function formatDate(dateStr, options = {}) {
  const defaultOptions = { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  }
  return new Date(dateStr).toLocaleDateString('en-US', { ...defaultOptions, ...options })
}

/**
 * Calculate session credits from purchases array
 */
export function calculateSessionCredits(purchases = []) {
  let trial = 0
  let regular = 0
  
  purchases.forEach(p => {
    const remaining = (p.sessions_total || 0) - (p.sessions_used || 0)
    if (p.type === 'trial' || p.package_id === 'trial') {
      trial += remaining
    } else {
      regular += remaining
    }
  })
  
  return { trial, regular, total: trial + regular }
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Validate phone number (digits only)
 */
export function isValidPhone(phone) {
  return /^\d{10,15}$/.test(phone.replace(/\D/g, ''))
}
