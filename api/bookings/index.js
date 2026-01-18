import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { userId, date } = req.query;
      
      let result;
      if (userId) {
        result = await sql`
          SELECT b.*, p.name as package_name 
          FROM bookings b 
          JOIN packages p ON b.package_id = p.id 
          WHERE b.user_id = ${userId}
          ORDER BY b.booking_date, b.booking_time
        `;
      } else if (date) {
        // Get bookings for a specific date (to check availability)
        result = await sql`
          SELECT booking_time FROM bookings 
          WHERE booking_date = ${date} AND status != 'cancelled'
        `;
      } else {
        result = await sql`
          SELECT b.*, p.name as package_name, u.name as user_name, u.email as user_email
          FROM bookings b 
          JOIN packages p ON b.package_id = p.id 
          JOIN users u ON b.user_id = u.id
          ORDER BY b.booking_date, b.booking_time
        `;
      }
      
      return res.status(200).json({ bookings: result.rows });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { userId, packageId, bookingDate, bookingTime, notes } = req.body;

      // Check if time slot is available
      const existing = await sql`
        SELECT id FROM bookings 
        WHERE booking_date = ${bookingDate} 
        AND booking_time = ${bookingTime}
        AND status != 'cancelled'
      `;

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Time slot is not available' });
      }

      const result = await sql`
        INSERT INTO bookings (user_id, package_id, booking_date, booking_time, notes)
        VALUES (${userId}, ${packageId}, ${bookingDate}, ${bookingTime}, ${notes})
        RETURNING *
      `;

      return res.status(201).json({ booking: result.rows[0] });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

