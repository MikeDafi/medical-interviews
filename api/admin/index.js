import { sql } from '@vercel/postgres';
import { verifyAuth, rateLimit } from '../lib/auth.js';

export default async function handler(req, res) {
  // SECURITY: Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 30, 60000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // SECURITY: Require admin authentication for ALL actions
  const { authenticated, user, error } = await verifyAuth(req, { requireAdmin: true });
  if (!authenticated) {
    return res.status(403).json({ error: error || 'Admin access required' });
  }

  const { action } = req.query;

  // Manage resources for a user
  if (action === 'resources') {
    if (req.method === 'POST') {
      const { userId, title, url, description, type } = req.body;

      if (!userId || !title || !url) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // SECURITY: Validate URL
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return res.status(400).json({ error: 'Invalid URL protocol' });
        }
      } catch {
        return res.status(400).json({ error: 'Invalid URL' });
      }

      try {
        await sql`
          UPDATE users 
          SET resources = COALESCE(resources, '[]'::jsonb) || ${JSON.stringify({
            id: Date.now(),
            title: String(title).slice(0, 200),
            url: String(url).slice(0, 500),
            description: String(description || '').slice(0, 500),
            resource_type: String(type || 'article').slice(0, 50),
            added_by_admin: true,
            created_at: new Date().toISOString()
          })}::jsonb
          WHERE id = ${parseInt(userId)}
        `;
        return res.status(201).json({ success: true, message: 'Resource added' });
      } catch (error) {
        console.error('Error adding resource:', error);
        return res.status(500).json({ error: 'Failed to add resource' });
      }
    }

    if (req.method === 'DELETE') {
      const { userId, resourceId } = req.query;

      if (!userId || !resourceId) {
        return res.status(400).json({ error: 'userId and resourceId required' });
      }

      try {
        const userResult = await sql`SELECT resources FROM users WHERE id = ${parseInt(userId)}`;
        if (userResult.rows.length > 0) {
          const resources = userResult.rows[0].resources || [];
          const filteredResources = resources.filter(r => r.id !== parseInt(resourceId));
          await sql`UPDATE users SET resources = ${JSON.stringify(filteredResources)}::jsonb WHERE id = ${parseInt(userId)}`;
        }
        return res.status(200).json({ success: true, message: 'Resource removed' });
      } catch (error) {
        console.error('Error removing resource:', error);
        return res.status(500).json({ error: 'Failed to remove resource' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Cancel a package for a user
  if (action === 'cancelPackage') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, packageId } = req.body;

    if (!userId || !packageId) {
      return res.status(400).json({ error: 'userId and packageId required' });
    }

    try {
      const userResult = await sql`SELECT purchases FROM users WHERE id = ${parseInt(userId)}`;
      if (userResult.rows.length > 0) {
        const purchases = userResult.rows[0].purchases || [];
        const updatedPurchases = purchases.map(p => {
          if (p.id === packageId) {
            return { ...p, status: 'cancelled', cancelled_at: new Date().toISOString() };
          }
          return p;
        });
        await sql`UPDATE users SET purchases = ${JSON.stringify(updatedPurchases)}::jsonb WHERE id = ${parseInt(userId)}`;
      }
      return res.status(200).json({ success: true, message: 'Package cancelled' });
    } catch (error) {
      console.error('Error cancelling package:', error);
      return res.status(500).json({ error: 'Failed to cancel package' });
    }
  }

  // Get all users (default action) - GET only
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sortBy = 'created_at', sortOrder = 'desc' } = req.query;

  try {
    const usersQuery = await sql`
      SELECT 
        id, email, name, picture, phone,
        application_stage, main_concerns, target_schools,
        purchases, resources, profile_complete, is_admin, 
        created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `;
    // NOTE: google_id intentionally NOT returned to frontend

    const usersWithDetails = usersQuery.rows.map(userRow => {
      const purchases = userRow.purchases || [];
      const targetSchools = userRow.target_schools || [];
      const resources = userRow.resources || [];
      
      let sessionsRemaining = 0;
      let totalBookings = 0;
      purchases.forEach(p => {
        sessionsRemaining += (p.sessions_total || 0) - (p.sessions_used || 0);
        totalBookings += (p.sessions_used || 0);
      });

      return {
        ...userRow,
        sessions_remaining: sessionsRemaining,
        total_bookings: totalBookings,
        target_schools: targetSchools,
        resources: resources.map(r => ({
          ...r,
          id: r.id || Date.now()
        }))
      };
    });

    // Sort
    const validSortFields = ['created_at', 'sessions_remaining', 'total_bookings', 'name', 'email'];
    const validOrders = ['asc', 'desc'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = validOrders.includes(sortOrder?.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';

    if (safeSortBy === 'sessions_remaining') {
      usersWithDetails.sort((a, b) => {
        const diff = (a.sessions_remaining || 0) - (b.sessions_remaining || 0);
        return safeSortOrder === 'desc' ? -diff : diff;
      });
    } else if (safeSortBy === 'total_bookings') {
      usersWithDetails.sort((a, b) => {
        const diff = (a.total_bookings || 0) - (b.total_bookings || 0);
        return safeSortOrder === 'desc' ? -diff : diff;
      });
    } else if (safeSortBy === 'name') {
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
