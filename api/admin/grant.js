import { sql } from '@vercel/postgres'

// One-time use endpoint to grant admin access
// DELETE THIS FILE after use for security

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, secret } = req.body

  // Simple secret to prevent unauthorized access
  if (secret !== 'grant-admin-2026') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!email) {
    return res.status(400).json({ error: 'Email required' })
  }

  try {
    const result = await sql`
      UPDATE users 
      SET is_admin = TRUE 
      WHERE email = ${email}
      RETURNING id, email, name, is_admin
    `

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found. Make sure they have signed in at least once.' 
      })
    }

    return res.status(200).json({ 
      success: true, 
      message: `Admin access granted to ${email}`,
      user: result.rows[0]
    })
  } catch (error) {
    console.error('Error granting admin:', error)
    return res.status(500).json({ error: error.message })
  }
}

