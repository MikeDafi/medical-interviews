/**
 * Shared input sanitization utilities for API routes
 * Centralizes validation logic to ensure consistency
 */

/**
 * Sanitize a string input
 * @param {any} str - Input to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
export function sanitizeString(str, maxLength = 255) {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLength).trim();
}

/**
 * Sanitize an email address
 * @param {any} email - Email to validate and sanitize
 * @returns {string} Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.toLowerCase().trim();
  return emailRegex.test(trimmed) ? trimmed : '';
}

/**
 * Sanitize a URL
 * @param {any} url - URL to validate and sanitize
 * @param {Object} options - Validation options
 * @param {string[]} options.allowedHosts - If provided, only allow these hostnames
 * @param {string[]} options.allowedProtocols - Allowed protocols (default: http, https)
 * @param {number} options.maxLength - Maximum URL length
 * @returns {string} Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url, options = {}) {
  if (typeof url !== 'string') return '';
  
  const {
    allowedHosts = null,
    allowedProtocols = ['http:', 'https:'],
    maxLength = 500
  } = options;
  
  try {
    const parsed = new URL(url);
    
    // Check protocol
    if (!allowedProtocols.includes(parsed.protocol)) {
      return '';
    }
    
    // Check hostname if restricted
    if (allowedHosts && !allowedHosts.some(host => parsed.hostname.includes(host))) {
      return '';
    }
    
    return url.slice(0, maxLength);
  } catch {
    return '';
  }
}

/**
 * Sanitize a phone number (digits only with optional formatting chars)
 * @param {any} phone - Phone number to sanitize
 * @returns {string} Sanitized phone number
 */
export function sanitizePhone(phone) {
  if (typeof phone !== 'string') return '';
  // Only allow digits, spaces, dashes, parentheses, plus
  return phone.replace(/[^\d\s\-\(\)\+]/g, '').slice(0, 20);
}

/**
 * Sanitize a Google ID (numeric string)
 * @param {any} id - Google ID to sanitize
 * @returns {string} Sanitized ID
 */
export function sanitizeGoogleId(id) {
  if (typeof id !== 'string') return '';
  // Google IDs are numeric strings
  return id.replace(/[^\d]/g, '').slice(0, 100);
}

/**
 * Sanitize an array of objects with a schema
 * @param {any} arr - Array to sanitize
 * @param {Object} schema - Object with field names and sanitizer functions
 * @param {number} maxItems - Maximum number of items
 * @returns {Array} Sanitized array
 */
export function sanitizeArray(arr, schema, maxItems = 10) {
  if (!Array.isArray(arr)) return [];
  
  return arr.slice(0, maxItems).map(item => {
    const sanitized = {};
    for (const [key, sanitizer] of Object.entries(schema)) {
      sanitized[key] = sanitizer(item?.[key]);
    }
    return sanitized;
  });
}

/**
 * Validate required fields are present
 * @param {Object} obj - Object to validate
 * @param {string[]} required - Required field names
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateRequired(obj, required) {
  const missing = required.filter(field => !obj?.[field]);
  return {
    valid: missing.length === 0,
    missing
  };
}

