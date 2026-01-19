import { sql } from '@vercel/postgres'

export default async function handler(req, res) {
  const { action } = req.query

  // Check admin status
  if (action === 'check') {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { googleId, email } = req.query

    if (!googleId && !email) {
      return res.status(400).json({ error: 'googleId or email required' })
    }

    try {
      let result
      if (googleId) {
        result = await sql`SELECT is_admin FROM users WHERE google_id = ${googleId}`
      } else {
        result = await sql`SELECT is_admin FROM users WHERE email = ${email}`
      }

      if (result.rows.length === 0) {
        return res.status(200).json({ isAdmin: false })
      }

      return res.status(200).json({ isAdmin: result.rows[0].is_admin || false })
    } catch (error) {
      console.error('Error checking admin status:', error)
      return res.status(500).json({ error: 'Failed to check admin status', isAdmin: false })
    }
  }

  // Manage resources
  if (action === 'resources') {
    if (req.method === 'POST') {
      const { userId, title, url, description, type } = req.body

      if (!userId || !title || !url) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      try {
        await sql`
          INSERT INTO resources (user_id, title, url, description, resource_type, is_global, added_by_admin)
          VALUES (${userId}, ${title}, ${url}, ${description || null}, ${type || 'article'}, false, true)
        `
        return res.status(201).json({ success: true, message: 'Resource added' })
      } catch (error) {
        console.error('Error adding resource:', error)
        return res.status(500).json({ error: 'Failed to add resource' })
      }
    }

    if (req.method === 'DELETE') {
      const { id } = req.query

      if (!id) {
        return res.status(400).json({ error: 'Resource ID required' })
      }

      try {
        await sql`DELETE FROM resources WHERE id = ${id}`
        return res.status(200).json({ success: true, message: 'Resource removed' })
      } catch (error) {
        console.error('Error removing resource:', error)
        return res.status(500).json({ error: 'Failed to remove resource' })
      }
    }

    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get all users (default action)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { sortBy = 'created_at', sortOrder = 'desc' } = req.query

  try {
    const validSortFields = ['created_at', 'sessions_remaining', 'total_bookings', 'last_booking', 'name', 'email']
    const validOrders = ['asc', 'desc']
    
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    const safeSortOrder = validOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc'

    const usersQuery = await sql`
      SELECT 
        u.id, u.google_id, u.email, u.name, u.picture, u.phone,
        u.profile_complete, u.current_level, u.is_admin, u.created_at,
        COALESCE((SELECT SUM(up.sessions_total - up.sessions_used) 
                  FROM user_packages up WHERE up.user_id = u.id AND up.status = 'active'), 0) as sessions_remaining,
        COALESCE((SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id), 0) as total_bookings,
        (SELECT MAX(b.booking_date) FROM bookings b WHERE b.user_id = u.id) as last_booking
      FROM users u
      ORDER BY u.created_at DESC
    `

    const usersWithDetails = await Promise.all(usersQuery.rows.map(async (user) => {
      const schools = await sql`
        SELECT school_name, interview_type, interview_date, priority
        FROM target_schools WHERE user_id = ${user.id} ORDER BY priority, interview_date
      `
      const bookings = await sql`
        SELECT booking_date, booking_time, status
        FROM bookings WHERE user_id = ${user.id} ORDER BY booking_date DESC, booking_time DESC LIMIT 5
      `
      const resources = await sql`
        SELECT id, title, url, description, resource_type, added_by_admin
        FROM resources WHERE user_id = ${user.id} OR is_global = true ORDER BY created_at DESC
      `
      
      return {
        ...user,
        target_schools: schools.rows,
        recent_bookings: bookings.rows,
        resources: resources.rows
      }
    }))

    if (safeSortBy === 'sessions_remaining') {
      usersWithDetails.sort((a, b) => {
        const diff = (a.sessions_remaining || 0) - (b.sessions_remaining || 0)
        return safeSortOrder === 'desc' ? -diff : diff
      })
    } else if (safeSortBy === 'total_bookings') {
      usersWithDetails.sort((a, b) => {
        const diff = (a.total_bookings || 0) - (b.total_bookings || 0)
        return safeSortOrder === 'desc' ? -diff : diff
      })
    }

    return res.status(200).json({ users: usersWithDetails })
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'Failed to fetch users' })
  }
}

