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

  // Manage resources for a user
  if (action === 'resources') {
    if (req.method === 'POST') {
      const { userId, title, url, description, type } = req.body

      if (!userId || !title || !url) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      try {
        // Add resource to user's resources JSONB array
        await sql`
          UPDATE users 
          SET resources = COALESCE(resources, '[]'::jsonb) || ${JSON.stringify({
            id: Date.now(),
            title,
            url,
            description: description || '',
            resource_type: type || 'article',
            added_by_admin: true,
            created_at: new Date().toISOString()
          })}::jsonb
          WHERE id = ${userId}
        `
        return res.status(201).json({ success: true, message: 'Resource added' })
      } catch (error) {
        console.error('Error adding resource:', error)
        return res.status(500).json({ error: 'Failed to add resource' })
      }
    }

    if (req.method === 'DELETE') {
      const { userId, resourceId } = req.query

      if (!userId || !resourceId) {
        return res.status(400).json({ error: 'userId and resourceId required' })
      }

      try {
        // Remove resource from user's resources JSONB array by id
        const user = await sql`SELECT resources FROM users WHERE id = ${userId}`
        if (user.rows.length > 0) {
          const resources = user.rows[0].resources || []
          const filteredResources = resources.filter(r => r.id !== parseInt(resourceId))
          await sql`UPDATE users SET resources = ${JSON.stringify(filteredResources)}::jsonb WHERE id = ${userId}`
        }
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
    const usersQuery = await sql`
      SELECT 
        id, google_id, email, name, picture, phone,
        application_stage, main_concerns, target_schools,
        purchases, resources, profile_complete, is_admin, 
        created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `

    // Process users to calculate sessions remaining from purchases
    const usersWithDetails = usersQuery.rows.map(user => {
      const purchases = user.purchases || []
      const targetSchools = user.target_schools || []
      const resources = user.resources || []
      
      // Calculate sessions remaining from purchases
      let sessionsRemaining = 0
      let totalBookings = 0
      purchases.forEach(p => {
        sessionsRemaining += (p.sessions_total || 0) - (p.sessions_used || 0)
        totalBookings += (p.sessions_used || 0)
      })

      return {
        ...user,
        sessions_remaining: sessionsRemaining,
        total_bookings: totalBookings,
        target_schools: targetSchools,
        resources: resources.map(r => ({
          ...r,
          id: r.id || Date.now()
        }))
      }
    })

    // Sort based on computed fields
    const validSortFields = ['created_at', 'sessions_remaining', 'total_bookings', 'name', 'email']
    const validOrders = ['asc', 'desc']
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    const safeSortOrder = validOrders.includes(sortOrder?.toLowerCase()) ? sortOrder.toLowerCase() : 'desc'

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
    return res.status(500).json({ error: 'Failed to fetch users', details: error.message })
  }
}
