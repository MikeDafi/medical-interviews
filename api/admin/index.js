import { sql } from '@vercel/postgres';
import { rateLimit } from '../lib/auth.js';
import { requireAuth } from '../lib/session.js';

export default async function handler(req, res) {
  // SECURITY: Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 30, 60000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { action } = req.query;

  // Check admin status - requires authentication
  if (action === 'check' && req.method === 'GET') {
    const { authenticated, user } = await requireAuth(req);
    if (!authenticated || !user) {
      return res.status(200).json({ isAdmin: false });
    }
    return res.status(200).json({ isAdmin: user.isAdmin || false });
  }

  // SECURITY: Require authenticated admin session for ALL OTHER actions
  const { authenticated, user, error } = await requireAuth(req, { requireAdmin: true });
  if (!authenticated) {
    return res.status(403).json({ error: error || 'Admin access required' });
  }

  // Get a single user by ID
  if (action === 'getUser' && req.method === 'GET') {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    try {
      const result = await sql`
        SELECT 
          id, email, name, picture, phone,
          application_stage, main_concerns, target_schools,
          purchases, resources, profile_complete, is_admin, 
          created_at, updated_at
        FROM users
        WHERE id = ${parseInt(userId)}
      `;

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({ user: result.rows[0] });
    } catch {
      return res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

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
      } catch {
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
      } catch {
        return res.status(500).json({ error: 'Failed to remove resource' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Delete a package for a user (completely removes it)
  if (action === 'deletePackage') {
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
        // Filter out the package completely (delete, don't cancel)
        const updatedPurchases = purchases.filter(p => p.id !== packageId);
        await sql`UPDATE users SET purchases = ${JSON.stringify(updatedPurchases)}::jsonb WHERE id = ${parseInt(userId)}`;
      }
      return res.status(200).json({ success: true, message: 'Package deleted' });
    } catch {
      return res.status(500).json({ error: 'Failed to delete package' });
    }
  }

  // Add sessions to a user (admin granted)
  if (action === 'addSession') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, duration, sessions } = req.body;

    if (!userId || !duration || !sessions) {
      return res.status(400).json({ error: 'userId, duration, and sessions required' });
    }

    const validDurations = [30, 60];
    const durationNum = parseInt(duration);
    if (!validDurations.includes(durationNum)) {
      return res.status(400).json({ error: 'Invalid duration (must be 30 or 60)' });
    }

    const sessionCount = parseInt(sessions);
    if (isNaN(sessionCount) || sessionCount < 1 || sessionCount > 10) {
      return res.status(400).json({ error: 'Sessions must be between 1 and 10' });
    }

    try {
      const newPackage = {
        id: `admin_${Date.now()}`,
        duration_minutes: durationNum,
        status: 'active',
        package_id: `admin_${durationNum}min`,
        name: `${durationNum}-Min Session (Admin)`,
        purchase_date: new Date().toISOString(),
        sessions_total: sessionCount,
        sessions_used: 0,
        added_by_admin: true
      };

      await sql`
        UPDATE users 
        SET purchases = COALESCE(purchases, '[]'::jsonb) || ${JSON.stringify(newPackage)}::jsonb
        WHERE id = ${parseInt(userId)}
      `;
      
      return res.status(201).json({ success: true, message: `Added ${sessionCount} ${durationNum}-min session(s)` });
    } catch {
      return res.status(500).json({ error: 'Failed to add session' });
    }
  }

  // Edit user details (admin only)
  if (action === 'editUser') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, name, phone } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    try {
      // Update name and phone (preserve existing if not provided)
      await sql`
        UPDATE users 
        SET name = CASE WHEN ${name || ''} = '' THEN name ELSE ${String(name || '').slice(0, 100)} END,
            phone = ${String(phone || '').slice(0, 20)},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${parseInt(userId)}
      `;
      
      return res.status(200).json({ success: true, message: 'User updated' });
    } catch {
      return res.status(500).json({ error: 'Failed to update user' });
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
  } catch {
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}
