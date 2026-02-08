/**
 * OAuth Callback Handler
 * Redirects to the main auth handler with action=callback
 */

export default async function handler(req, res) {
  // Forward all query params to the main auth handler
  const params = new URLSearchParams(req.query);
  params.set('action', 'callback');
  
  // Import and call the main auth handler directly
  const authHandler = (await import('./index.js')).default;
  
  // Modify the query to include action=callback
  req.query.action = 'callback';
  
  return authHandler(req, res);
}

