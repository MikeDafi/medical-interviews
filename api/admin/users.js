import { sql } from '@vercel/postgres';
import { verifyAuth, rateLimit } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 30, 60000); // 30 requests per minute
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // SECURITY: Require admin authentication
  const { authenticated, user, error } = await verifyAuth(req, { requireAdmin: true });
  if (!authenticated) {
    return res.status(403).json({ error: error || 'Admin access required' });
  }

  const { sortBy = 'created_at', sortOrder = 'desc' } = req.query;

  try {
    // Validate sort parameters to prevent SQL injection
    const validSortFields = ['created_at', 'name', 'email'];
    const validOrders = ['asc', 'desc'];
    
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = validOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';

    // Get users (simplified query - old tables were removed)
    const usersQuery = await sql`
      SELECT 
        id,
        google_id,
        email,
        name,
        phone,
        application_stage,
        target_schools,
        purchases,
        profile_complete,
        is_admin,
        created_at
      FROM users
      ORDER BY created_at DESC
    `;

    // Calculate sessions from purchases JSON
    const usersWithDetails = usersQuery.rows.map(user => {
      const purchases = user.purchases || [];
      let sessionsRemaining = 0;
      purchases.forEach(p => {
        sessionsRemaining += (p.sessions_total || 0) - (p.sessions_used || 0);
      });
      
      return {
        ...user,
        sessions_remaining: sessionsRemaining,
        // Don't expose google_id to admin panel
        google_id: undefined
      };
    });

    // Sort
    if (safeSortBy === 'name') {
      usersWithDetails.sort((a, b) => {
        const cmp = (a.name || '').localeCompare(b.name || '');
        return safeSortOrder === 'desc' ? -cmp : cmp;
      });
    } else if (safeSortBy === 'email') {
      usersWithDetails.sort((a, b) => {
        const cmp = (a.email || '').localeCompare(b.email || '');
        return safeSortOrder === 'desc' ? -cmp : cmp;
      });
    }

    return res.status(200).json({ users: usersWithDetails });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

