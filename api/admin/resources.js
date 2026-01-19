import { sql } from '@vercel/postgres'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Add a resource to a user
    const { userId, title, url, description, type, addedByAdmin } = req.body

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

