/**
 * Security headers middleware
 * Add to all API responses for better security
 */
export function setSecurityHeaders(res) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://accounts.google.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https: blob:; " +
    "connect-src 'self' https://api.stripe.com https://www.googleapis.com https://*.vercel-analytics.com; " +
    "frame-src https://js.stripe.com https://accounts.google.com; " +
    "object-src 'none';"
  );
  
  // Strict Transport Security (HTTPS only)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

/**
 * Wrap an API handler with security headers
 */
export function withSecurity(handler) {
  return async (req, res) => {
    setSecurityHeaders(res);
    return handler(req, res);
  };
}

