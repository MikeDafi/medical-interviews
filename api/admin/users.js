import { sql } from '@vercel/postgres'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { sortBy = 'created_at', sortOrder = 'desc', adminEmail } = req.query

  try {
    // Validate sort parameters to prevent SQL injection
    const validSortFields = ['created_at', 'sessions_remaining', 'total_bookings', 'last_booking', 'name', 'email']
    const validOrders = ['asc', 'desc']
    
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    const safeSortOrder = validOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc'

    // Get all users with aggregated data
    const usersQuery = await sql`
      SELECT 
        u.id,
        u.google_id,
        u.email,
        u.name,
        u.picture,
        u.phone,
        u.profile_complete,
        u.current_level,
        u.interview_experience,
        u.strengths,
        u.areas_to_improve,
        u.is_admin,
        u.created_at,
        COALESCE(
          (SELECT SUM(up.sessions_total - up.sessions_used) 
           FROM user_packages up 
           WHERE up.user_id = u.id AND up.status = 'active'), 0
        ) as sessions_remaining,
        COALESCE(
          (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id), 0
        ) as total_bookings,
        (SELECT MAX(b.booking_date) FROM bookings b WHERE b.user_id = u.id) as last_booking
      FROM users u
      ORDER BY 
        CASE WHEN '${safeSortBy}' = 'created_at' AND '${safeSortOrder}' = 'desc' THEN u.created_at END DESC,
        CASE WHEN '${safeSortBy}' = 'created_at' AND '${safeSortOrder}' = 'asc' THEN u.created_at END ASC,
        CASE WHEN '${safeSortBy}' = 'name' AND '${safeSortOrder}' = 'desc' THEN u.name END DESC,
        CASE WHEN '${safeSortBy}' = 'name' AND '${safeSortOrder}' = 'asc' THEN u.name END ASC
    `

    // For each user, get their target schools, recent bookings, and resources
    const usersWithDetails = await Promise.all(usersQuery.rows.map(async (user) => {
      // Get target schools
      const schools = await sql`
        SELECT school_name, interview_type, interview_date, priority
        FROM target_schools
        WHERE user_id = ${user.id}
        ORDER BY priority, interview_date
      `

      // Get recent bookings (last 5)
      const bookings = await sql`
        SELECT booking_date, booking_time, status
        FROM bookings
        WHERE user_id = ${user.id}
        ORDER BY booking_date DESC, booking_time DESC
        LIMIT 5
      `

      // Get resources
      const resources = await sql`
        SELECT id, title, url, description, resource_type, added_by_admin
        FROM resources
        WHERE user_id = ${user.id} OR is_global = true
        ORDER BY created_at DESC
      `

      // Get concerns from profile data in localStorage backup or separate table if exists
      // For now, we'll check if there's additional profile data
      
      return {
        ...user,
        target_schools: schools.rows,
        recent_bookings: bookings.rows,
        resources: resources.rows
      }
    }))

    // Sort the results based on computed fields
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
    } else if (safeSortBy === 'last_booking') {
      usersWithDetails.sort((a, b) => {
        if (!a.last_booking && !b.last_booking) return 0
        if (!a.last_booking) return safeSortOrder === 'desc' ? 1 : -1
        if (!b.last_booking) return safeSortOrder === 'desc' ? -1 : 1
        const diff = new Date(a.last_booking) - new Date(b.last_booking)
        return safeSortOrder === 'desc' ? -diff : diff
      })
    }

    return res.status(200).json({ users: usersWithDetails })
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'Failed to fetch users' })
  }
}

