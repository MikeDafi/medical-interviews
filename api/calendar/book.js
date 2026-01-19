import { google } from 'googleapis';
import { sql } from '@vercel/postgres';
import { rateLimit } from '../lib/auth.js';

const BOOKINGS_CALENDAR_ID = process.env.GOOGLE_BOOKINGS_CALENDAR_ID || 
  '0854b480f27b339f63c8817e43dc08e1183cdfa35ca61bb99fd7a0809991b34a@group.calendar.google.com';

function getAuthClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return null;
  }
  
  try {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
    );
    
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar.events']
    });
  } catch (error) {
    console.error('Failed to parse service account key:', error);
    return null;
  }
}

export default async function handler(req, res) {
  // SECURITY: Rate limiting - strict for booking
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 10, 60000); // 10 bookings per minute max
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      date,
      time,
      userId,
      userEmail,
      userName,
      sessionType,
      duration
    } = req.body;

    // SECURITY: Validate required fields
    if (!date || !time || !userEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // SECURITY: Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // SECURITY: Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // SECURITY: Validate time format
    if (!/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(time)) {
      return res.status(400).json({ error: 'Invalid time format' });
    }

    // SECURITY: Verify user exists and has sessions available
    const userResult = await sql`SELECT id, purchases FROM users WHERE email = ${userEmail}`;
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }

    const userRow = userResult.rows[0];
    const purchases = userRow.purchases || [];
    
    // Calculate available sessions
    let trialSessions = 0;
    let regularSessions = 0;
    purchases.forEach(p => {
      const remaining = (p.sessions_total || 0) - (p.sessions_used || 0);
      if (p.type === 'trial') {
        trialSessions += remaining;
      } else {
        regularSessions += remaining;
      }
    });

    const requestedType = sessionType || 'regular';
    if (requestedType === 'trial' && trialSessions < 1) {
      return res.status(403).json({ error: 'No trial sessions available' });
    }
    if (requestedType !== 'trial' && regularSessions < 1) {
      return res.status(403).json({ error: 'No regular sessions available' });
    }

    // Convert time format
    const [timePart, ampm] = time.split(' ');
    const [hours, minutes] = timePart.split(':');
    let hour24 = parseInt(hours);
    if (ampm.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
    if (ampm.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;
    const time24 = `${hour24.toString().padStart(2, '0')}:${minutes}`;

    const auth = getAuthClient();
    
    if (!auth) {
      return res.status(503).json({ error: 'Calendar booking not configured' });
    }

    const calendar = google.calendar({ version: 'v3', auth });

    const startDateTime = `${date}T${time24}:00-06:00`;
    const sessionDuration = duration || (requestedType === 'trial' ? 30 : 60);
    const durationMs = sessionDuration * 60 * 1000;
    const endDateTime = new Date(new Date(startDateTime).getTime() + durationMs).toISOString();

    // Sanitize user name
    const safeName = String(userName || userEmail.split('@')[0]).slice(0, 50);

    const event = {
      summary: `PreMedical 1-on-1: ${safeName}`,
      description: `Interview coaching session\n\nStudent: ${safeName}\nEmail: ${userEmail}\nSession Type: ${requestedType === 'trial' ? 'Trial (30 min)' : 'Regular (1 hour)'}`,
      start: {
        dateTime: startDateTime,
        timeZone: 'America/Chicago'
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/Chicago'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 30 }
        ]
      }
    };

    const createdEvent = await calendar.events.insert({
      calendarId: BOOKINGS_CALENDAR_ID,
      requestBody: event
    });

    // Deduct session from user's purchases
    const updatedPurchases = [...purchases];
    for (let i = 0; i < updatedPurchases.length; i++) {
      const p = updatedPurchases[i];
      const remaining = (p.sessions_total || 0) - (p.sessions_used || 0);
      const isMatchingType = requestedType === 'trial' ? p.type === 'trial' : p.type !== 'trial';
      
      if (remaining > 0 && isMatchingType) {
        updatedPurchases[i] = { ...p, sessions_used: (p.sessions_used || 0) + 1 };
        break;
      }
    }

    await sql`
      UPDATE users 
      SET purchases = ${JSON.stringify(updatedPurchases)}::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userRow.id}
    `;

    return res.status(200).json({
      success: true,
      eventId: createdEvent.data.id,
      eventLink: createdEvent.data.htmlLink,
      message: 'Booking confirmed!'
    });

  } catch (error) {
    console.error('Booking error:', error);
    // SECURITY: Don't leak error details
    return res.status(500).json({ error: 'Failed to create booking' });
  }
}
