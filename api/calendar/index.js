import { sql } from '@vercel/postgres';
import { google } from 'googleapis';
import { rateLimit } from '../lib/auth.js';

// Calendar IDs to check for busy times (Ashley's calendars)
// Set these in environment variables, comma-separated
const CALENDAR_IDS = process.env.GOOGLE_CALENDAR_IDS 
  ? process.env.GOOGLE_CALENDAR_IDS.split(',').map(id => id.trim())
  : [];

// Calendar where bookings are created
const BOOKINGS_CALENDAR_ID = process.env.GOOGLE_BOOKINGS_CALENDAR_ID;

// Business hours configuration (in local time)
// Timezone configurable via environment variable
const BUSINESS_HOURS = {
  start: parseInt(process.env.BUSINESS_HOURS_START) || 9,  // 9 AM default
  end: parseInt(process.env.BUSINESS_HOURS_END) || 17,     // 5 PM default
  slotDuration: 30, // minutes
  timezone: process.env.BUSINESS_TIMEZONE || 'America/Chicago'
};

// Days of week that are available (0=Sunday, 6=Saturday)
const AVAILABLE_DAYS = [1, 2, 3, 4, 5]; // Monday-Friday

// Get authenticated Google Calendar client
function getCalendarClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  }

  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events']
  });

  return google.calendar({ version: 'v3', auth });
}

// Query FreeBusy to get busy times across all calendars
async function getBusyTimes(calendar, date) {
  if (CALENDAR_IDS.length === 0) {
    console.warn('No calendar IDs configured - returning empty busy times');
    return [];
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  console.log('Querying FreeBusy for calendars:', CALENDAR_IDS);
  console.log('Date range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());

  try {
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        timeZone: BUSINESS_HOURS.timezone,
        items: CALENDAR_IDS.map(id => ({ id }))
      }
    });

    console.log('FreeBusy response:', JSON.stringify(response.data, null, 2));

    // Collect all busy periods from all calendars
    const allBusyPeriods = [];
    for (const calendarId of CALENDAR_IDS) {
      const calendarData = response.data.calendars?.[calendarId];
      
      // Check for errors (usually means no access to calendar)
      if (calendarData?.errors) {
        console.warn(`Calendar ${calendarId} errors:`, calendarData.errors);
        continue;
      }
      
      const calendarBusy = calendarData?.busy || [];
      console.log(`Calendar ${calendarId} has ${calendarBusy.length} busy periods`);
      allBusyPeriods.push(...calendarBusy);
    }

    console.log('Total busy periods:', allBusyPeriods.length);
    return allBusyPeriods;
  } catch (error) {
    console.error('FreeBusy query error:', error.message);
    throw error;
  }
}

// Generate available 30-min slots for a date, excluding busy times
function generateAvailableSlots(date, busyPeriods) {
  const dayOfWeek = date.getDay();
  
  // Check if it's an available day
  if (!AVAILABLE_DAYS.includes(dayOfWeek)) {
    return [];
  }

  const slots = [];
  const dateStr = date.toISOString().split('T')[0];

  // Generate all possible slots during business hours
  for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
    for (let minute = 0; minute < 60; minute += BUSINESS_HOURS.slotDuration) {
      // Don't start a session in the last 30 mins before closing
      if (hour === BUSINESS_HOURS.end - 1 && minute >= 30) continue;

      const slotStart = new Date(`${dateStr}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`);
      const slotEnd = new Date(slotStart.getTime() + BUSINESS_HOURS.slotDuration * 60 * 1000);

      // Check if this slot overlaps with any busy period
      const isAvailable = !busyPeriods.some(busy => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        // Slot is busy if it overlaps with busy period
        return slotStart < busyEnd && slotEnd > busyStart;
      });

      if (isAvailable) {
        // Format time for display (e.g., "9:00 AM", "2:30 PM")
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const timeStr = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
        slots.push(timeStr);
      }
    }
  }

  return slots;
}

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
      const requestedDate = new Date(date + 'T12:00:00');
      
      // Check if day is available
      if (!AVAILABLE_DAYS.includes(requestedDate.getDay())) {
        return res.status(200).json({ availableSlots: [], message: 'No availability on this day' });
      }

      // Check if Google Calendar is configured
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || CALENDAR_IDS.length === 0) {
        return res.status(200).json({ 
          availableSlots: [], 
          message: 'Calendar integration not configured. Please set GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_CALENDAR_IDS.',
          configured: false
        });
      }

      const calendar = getCalendarClient();
      const busyPeriods = await getBusyTimes(calendar, requestedDate);
      const availableSlots = generateAvailableSlots(requestedDate, busyPeriods);

      return res.status(200).json({ 
        availableSlots,
        timezone: BUSINESS_HOURS.timezone,
        configured: true
      });
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
      // Use a transaction with row-level locking to prevent race conditions
      // This ensures only one booking can process at a time for the same user
      const result = await sql.begin(async (tx) => {
        // Lock the user row to prevent concurrent modifications
        const userResult = await tx`
          SELECT id, purchases FROM users 
          WHERE google_id = ${userId} OR email = ${userEmail}
          FOR UPDATE
        `;

        if (userResult.rows.length === 0) {
          throw { status: 404, message: 'User not found' };
        }

        const user = userResult.rows[0];
        const purchases = user.purchases || [];

        // Find an active package with available sessions
        const packageIndex = purchases.findIndex(p => 
          p.status === 'active' && 
          p.type === sessionType &&
          (p.sessions_total - (p.sessions_used || 0)) > 0
        );

        if (packageIndex === -1) {
          throw { status: 400, message: `No ${sessionType} sessions available` };
        }

        // Create booking in Google Calendar if configured
        let eventLink = null;
        if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY && BOOKINGS_CALENDAR_ID) {
          try {
            const calendar = getCalendarClient();
            const sessionDuration = duration || (sessionType === 'trial' ? 30 : 60);
            
            // Parse time and create event
            const [timePart, ampm] = time.split(' ');
            const [hours, minutes] = timePart.split(':').map(Number);
            let hour24 = hours;
            if (ampm === 'PM' && hours !== 12) hour24 += 12;
            if (ampm === 'AM' && hours === 12) hour24 = 0;

            const startDateTime = new Date(`${date}T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
            const endDateTime = new Date(startDateTime.getTime() + sessionDuration * 60 * 1000);

            const event = await calendar.events.insert({
              calendarId: BOOKINGS_CALENDAR_ID,
              requestBody: {
                summary: `${sessionType === 'trial' ? 'Trial' : 'Interview Prep'} - ${userName || userEmail}`,
                description: `Session with ${userName || userEmail}\nEmail: ${userEmail}\nType: ${sessionType === 'trial' ? '30-min Trial' : '1-hour Session'}`,
                start: {
                  dateTime: startDateTime.toISOString(),
                  timeZone: BUSINESS_HOURS.timezone
                },
                end: {
                  dateTime: endDateTime.toISOString(),
                  timeZone: BUSINESS_HOURS.timezone
                },
                attendees: [{ email: userEmail }],
                reminders: {
                  useDefault: false,
                  overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 30 }
                  ]
                }
              }
            });

            eventLink = event.data.htmlLink;
          } catch (calError) {
            console.error('Google Calendar event creation error:', calError.message);
            // Continue with booking even if calendar event fails
          }
        }

        // Create booking record
        const booking = {
          id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          date,
          time,
          duration: duration || (sessionType === 'trial' ? 30 : 60),
          status: 'confirmed',
          booked_at: new Date().toISOString(),
          calendar_event_link: eventLink
        };

        // Update the package atomically
        purchases[packageIndex].sessions_used = (purchases[packageIndex].sessions_used || 0) + 1;
        purchases[packageIndex].bookings = purchases[packageIndex].bookings || [];
        purchases[packageIndex].bookings.push(booking);

        // Save back to DB within the transaction
        await tx`
          UPDATE users SET purchases = ${JSON.stringify(purchases)}::jsonb WHERE id = ${user.id}
        `;

        return { booking, eventLink, sessionType, date, time };
      });

      return res.status(200).json({ 
        success: true, 
        message: `${result.sessionType === 'trial' ? 'Trial' : 'Regular'} session booked for ${result.date} at ${result.time}`,
        booking: result.booking,
        eventLink: result.eventLink
      });
    } catch (error) {
      console.error('Booking error:', error);
      // Return user-friendly error for known errors
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to book session' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
