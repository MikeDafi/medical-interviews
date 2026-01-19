import { sql } from '@vercel/postgres'

export default async function handler(req, res) {
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
      result = await sql`
        SELECT is_admin FROM users WHERE google_id = ${googleId}
      `
    } else {
      result = await sql`
        SELECT is_admin FROM users WHERE email = ${email}
      `
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

