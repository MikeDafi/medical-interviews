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
 * Tracks by duration: 30-minute sessions vs 60-minute sessions (pooled across all categories,
 * preserved for backward compatibility), plus a `byCategory` breakdown so callers that need to
 * know "how many CV & Strategy 60-min sessions does this client have left" can ask for exactly
 * that combination (used by the booking page's combined service+duration selector).
 */
export function calculateSessionCredits(purchases = []) {
  let thirtyMin = 0
  let sixtyMin = 0
  // { [category]: { [duration]: remainingCount } }
  const byCategory = {}
  
  purchases.forEach(p => {
    if (p.status !== 'active') return
    
    const remaining = (p.sessions_total || 0) - (p.sessions_used || 0)
    if (remaining <= 0) return
    
    // Check duration_minutes first (new format), fall back to type (legacy)
    const duration = p.duration_minutes || (p.type === 'trial' ? 30 : 60)
    // Older purchases (pre-category, see PR #6) won't have a category - group them under
    // 'interview' since that was the only offering before CV/Advisory existed.
    const category = p.category || 'interview'
    
    if (duration === 30) {
      thirtyMin += remaining
    } else {
      sixtyMin += remaining
    }

    if (!byCategory[category]) byCategory[category] = {}
    byCategory[category][duration] = (byCategory[category][duration] || 0) + remaining
  })
  
  // Return both new format and legacy format for backwards compatibility
  return { 
    thirtyMin, 
    sixtyMin, 
    total: thirtyMin + sixtyMin,
    byCategory,
    // Legacy names for backwards compatibility
    trial: thirtyMin, 
    regular: sixtyMin 
  }
}

/**
 * Look up the remaining session count for one specific service+duration combination from the
 * `byCategory` breakdown returned by calculateSessionCredits(). Used by the booking page to show
 * (and enable/disable) each combined service+duration option.
 */
export function getCreditsForOption(credits, category, duration) {
  return credits?.byCategory?.[category]?.[duration] || 0
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
