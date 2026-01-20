import { sql } from '@vercel/postgres';
import { rateLimit } from '../lib/auth.js';

// Hardcoded availability - TODO: Move to admin-configurable DB
const DEFAULT_AVAILABILITY = {
  // Day of week (0=Sunday, 1=Monday, etc)
  1: ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM'],
  2: ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM'],
  3: ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM'],
  4: ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM'],
  5: ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM'],
  // 0 (Sunday) and 6 (Saturday) = not available by default
};

export default async function handler(req, res) {
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 60, 60000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { action } = req.query;

  // GET availability for a date
  if (req.method === 'GET' && action === 'availability') {
    const { date } = req.query;
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Valid date required (YYYY-MM-DD)' });
    }

    try {
      const requestedDate = new Date(date + 'T12:00:00Z');
      const dayOfWeek = requestedDate.getDay();
      
      // Get base availability for this day
      const baseSlots = DEFAULT_AVAILABILITY[dayOfWeek] || [];
      
      if (baseSlots.length === 0) {
        return res.status(200).json({ availableSlots: [], message: 'No availability on this day' });
      }

      // Get all booked slots for this date from user purchases
      const bookingsResult = await sql`
        SELECT purchases FROM users WHERE purchases IS NOT NULL
      `;

      const bookedSlots = new Set();
      bookingsResult.rows.forEach(row => {
        const purchases = row.purchases || [];
        purchases.forEach(p => {
          if (p.bookings) {
            p.bookings.forEach(b => {
              if (b.date === date) {
                bookedSlots.add(b.time);
                // For 1-hour sessions, also block the next 30-min slot
                if (b.duration === 60) {
                  const nextSlot = getNextSlot(b.time);
                  if (nextSlot) bookedSlots.add(nextSlot);
                }
              }
            });
          }
        });
      });

      const availableSlots = baseSlots.filter(slot => !bookedSlots.has(slot));
      return res.status(200).json({ availableSlots });
    } catch (error) {
      console.error('Availability error:', error);
      return res.status(500).json({ error: 'Failed to fetch availability' });
    }
  }

  // POST to book a session
  if (req.method === 'POST' && action === 'book') {
    const { date, time, userId, userEmail, userName, sessionType, duration } = req.body;

    if (!date || !time || !userId || !sessionType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['trial', 'regular'].includes(sessionType)) {
      return res.status(400).json({ error: 'Invalid session type' });
    }

    try {
      // Find user and their packages
      const userResult = await sql`
        SELECT id, purchases FROM users WHERE google_id = ${userId} OR email = ${userEmail}
      `;

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];
      const purchases = user.purchases || [];

      // Find an active package with available sessions
      let packageIndex = purchases.findIndex(p => 
        p.status === 'active' && 
        p.type === sessionType &&
        (p.sessions_total - (p.sessions_used || 0)) > 0
      );

      if (packageIndex === -1) {
        return res.status(400).json({ error: `No ${sessionType} sessions available` });
      }

      // Create booking
      const booking = {
        id: `booking_${Date.now()}`,
        date,
        time,
        duration: duration || (sessionType === 'trial' ? 30 : 60),
        status: 'confirmed',
        booked_at: new Date().toISOString()
      };

      // Update the package
      purchases[packageIndex].sessions_used = (purchases[packageIndex].sessions_used || 0) + 1;
      purchases[packageIndex].bookings = purchases[packageIndex].bookings || [];
      purchases[packageIndex].bookings.push(booking);

      // Save back to DB
      await sql`
        UPDATE users SET purchases = ${JSON.stringify(purchases)}::jsonb WHERE id = ${user.id}
      `;

      return res.status(200).json({ 
        success: true, 
        message: `${sessionType === 'trial' ? 'Trial' : 'Regular'} session booked for ${date} at ${time}`,
        booking 
      });
    } catch (error) {
      console.error('Booking error:', error);
      return res.status(500).json({ error: 'Failed to book session' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function getNextSlot(time) {
  const [timePart, ampm] = time.split(' ');
  const [hours, minutes] = timePart.split(':').map(Number);
  
  let nextHours = hours;
  let nextMinutes = minutes + 30;
  let nextAmpm = ampm;
  
  if (nextMinutes >= 60) {
    nextMinutes = 0;
    nextHours += 1;
    if (nextHours === 12 && ampm === 'AM') {
      nextAmpm = 'PM';
    } else if (nextHours > 12) {
      nextHours -= 12;
    }
  }
  
  return `${nextHours}:${nextMinutes.toString().padStart(2, '0')} ${nextAmpm}`;
}

