import { sql } from '@vercel/postgres';

// In-memory cache for recent bookings
let cachedBookings = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const now = Date.now();
    
    // Check if cache is still valid
    if (cachedBookings && (now - cacheTimestamp) < CACHE_DURATION) {
      return res.status(200).json({ 
        bookings: cachedBookings,
        cached: true 
      });
    }

    // Get the 5 most recent bookings with user first name only (for privacy)
    const result = await sql`
      SELECT 
        b.id,
        u.name as first_name,
        p.name as package_name,
        b.created_at
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN packages p ON b.package_id = p.id
      WHERE b.status != 'cancelled'
      ORDER BY b.created_at DESC
      LIMIT 5
    `;

    // Process names to only show first name
    const bookings = result.rows.map(row => ({
      ...row,
      first_name: row.first_name?.split(' ')[0] || 'User'
    }));

    // Update cache
    cachedBookings = bookings;
    cacheTimestamp = now;

    // Set cache headers for CDN/browser caching too
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    
    return res.status(200).json({ bookings, cached: false });
  } catch (error) {
    console.error('Error fetching recent bookings:', error);
    
    // If we have cached data and DB fails, return cached data
    if (cachedBookings) {
      return res.status(200).json({ 
        bookings: cachedBookings,
        cached: true,
        stale: true 
      });
    }
    
    return res.status(500).json({ error: error.message });
  }
}

