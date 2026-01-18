import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { date } = req.query;
      
      if (date) {
        // Get available time slots for a specific date
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.getDay();
        
        // Check if date is blocked
        const blocked = await sql`
          SELECT id FROM blocked_dates WHERE blocked_date = ${date}
        `;
        
        if (blocked.rows.length > 0) {
          return res.status(200).json({ available: false, slots: [] });
        }
        
        // Get availability for this day of week
        const availability = await sql`
          SELECT start_time, end_time FROM availability 
          WHERE day_of_week = ${dayOfWeek} AND is_available = true
        `;
        
        if (availability.rows.length === 0) {
          return res.status(200).json({ available: false, slots: [] });
        }
        
        // Get booked times for this date
        const booked = await sql`
          SELECT booking_time FROM bookings 
          WHERE booking_date = ${date} AND status != 'cancelled'
        `;
        
        const bookedTimes = booked.rows.map(r => r.booking_time);
        
        // Generate available slots
        const { start_time, end_time } = availability.rows[0];
        const slots = [];
        let current = new Date(`2000-01-01T${start_time}`);
        const end = new Date(`2000-01-01T${end_time}`);
        
        while (current < end) {
          const timeStr = current.toTimeString().slice(0, 5);
          if (!bookedTimes.includes(timeStr + ':00')) {
            slots.push(timeStr);
          }
          current.setHours(current.getHours() + 1);
        }
        
        return res.status(200).json({ available: true, slots });
      }
      
      // Get all availability settings
      const result = await sql`SELECT * FROM availability ORDER BY day_of_week`;
      return res.status(200).json({ availability: result.rows });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { dayOfWeek, startTime, endTime, isAvailable } = req.body;

      const result = await sql`
        INSERT INTO availability (day_of_week, start_time, end_time, is_available)
        VALUES (${dayOfWeek}, ${startTime}, ${endTime}, ${isAvailable})
        ON CONFLICT (day_of_week) 
        DO UPDATE SET 
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          is_available = EXCLUDED.is_available
        RETURNING *
      `;

      return res.status(200).json({ availability: result.rows[0] });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

