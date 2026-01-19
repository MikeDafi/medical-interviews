import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    // Get all users
    const users = await sql`SELECT id, google_id, email, name FROM users`;
    
    // Get all user_packages
    const packages = await sql`
      SELECT up.*, p.name as package_name 
      FROM user_packages up 
      LEFT JOIN packages p ON up.package_id = p.id
    `;
    
    // Get all packages
    const allPackages = await sql`SELECT * FROM packages`;
    
    return res.status(200).json({
      users: users.rows,
      user_packages: packages.rows,
      packages: allPackages.rows
    });
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({ error: error.message });
  }
}

