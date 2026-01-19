import { sql } from '@vercel/postgres';
import { rateLimit } from '../lib/auth.js';

// Server-side cache
let cachedBookings = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 60, 60000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    // Check cache first
    if (cachedBookings && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return res.status(200).json({ bookings: cachedBookings, cached: true });
    }

    // Get users who have used sessions (indicating they've booked)
    // We derive "recent bookings" from purchase activity
    const result = await sql`
      SELECT 
        id,
        name,
        purchases,
        updated_at
      FROM users
      WHERE purchases IS NOT NULL 
        AND jsonb_array_length(purchases) > 0
      ORDER BY updated_at DESC
      LIMIT 10
    `;

    // Extract recent activity from purchases
    const recentBookings = [];
    
    for (const user of result.rows) {
      const purchases = user.purchases || [];
      
      // Find purchases with used sessions
      for (const purchase of purchases) {
        if (purchase.sessions_used > 0) {
          // SECURITY: Only expose first name, not full identity
          const firstName = user.name ? user.name.split(' ')[0] : 'Student';
          
          recentBookings.push({
            id: `${user.id}-${purchase.id}`,
            first_name: firstName,
            package_name: getPackageName(purchase.package_id),
            created_at: purchase.purchase_date || user.updated_at
          });
        }
      }
    }

    // Sort by date and limit
    recentBookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const limitedBookings = recentBookings.slice(0, 5);

    // Update cache
    cachedBookings = limitedBookings;
    cacheTimestamp = Date.now();

    return res.status(200).json({ bookings: limitedBookings });
  } catch (error) {
    console.error('Error fetching recent bookings:', error);
    
    // Return cached data if available, even if stale
    if (cachedBookings) {
      return res.status(200).json({ bookings: cachedBookings, stale: true });
    }
    
    return res.status(500).json({ error: 'Failed to fetch bookings' });
  }
}

function getPackageName(packageId) {
  const names = {
    'trial': '30 Min Trial',
    'single': '1 Hour Session',
    'package3': 'Package of 3',
    'package5': 'Package of 5'
  };
  return names[packageId] || '1 Hour Session';
}

