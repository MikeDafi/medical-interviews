import { google } from 'googleapis';

// Calendar to write bookings to (created by service account)
const BOOKINGS_CALENDAR_ID = process.env.GOOGLE_BOOKINGS_CALENDAR_ID || 
  '0854b480f27b339f63c8817e43dc08e1183cdfa35ca61bb99fd7a0809991b34a@group.calendar.google.com';

function getAuthClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );
  
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.events']
  });
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      date,           // YYYY-MM-DD
      time,           // "9:00 AM" or "9:30 AM" format
      userId,
      userEmail,
      userName,
      sessionType,    // 'trial' or 'regular'
      duration        // in minutes (30 or 60)
    } = req.body;

    if (!date || !time || !userEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert 12-hour time to 24-hour for Google Calendar
    const [timePart, ampm] = time.split(' ');
    const [hours, minutes] = timePart.split(':');
    let hour24 = parseInt(hours);
    if (ampm === 'PM' && hour24 !== 12) hour24 += 12;
    if (ampm === 'AM' && hour24 === 12) hour24 = 0;
    const time24 = `${hour24.toString().padStart(2, '0')}:${minutes}`;

    const auth = getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });

    // Create event start and end times
    const startDateTime = `${date}T${time24}:00-06:00`; // Chicago timezone
    const sessionDuration = duration || (sessionType === 'trial' ? 30 : 60);
    const durationMs = sessionDuration * 60 * 1000;
    const endDateTime = new Date(new Date(startDateTime).getTime() + durationMs).toISOString();

    // Create the calendar event
    const event = {
      summary: `PreMedical 1-on-1: ${userName || userEmail.split('@')[0]}`,
      description: `Interview coaching session\n\nStudent: ${userName || 'N/A'}\nEmail: ${userEmail}\nSession Type: ${sessionType === 'trial' ? 'Trial (30 min)' : 'Regular (1 hour)'}\n\nZoom link will be sent separately.`,
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
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'email', minutes: 60 },       // 1 hour before
          { method: 'popup', minutes: 30 }        // 30 min before
        ]
      }
    };

    const createdEvent = await calendar.events.insert({
      calendarId: BOOKINGS_CALENDAR_ID,
      requestBody: event
    });

    return res.status(200).json({
      success: true,
      eventId: createdEvent.data.id,
      eventLink: createdEvent.data.htmlLink,
      message: 'Booking confirmed! Check your email for details.'
    });

  } catch (error) {
    console.error('Booking error:', error);
    return res.status(500).json({ 
      error: 'Failed to create booking',
      details: error.message 
    });
  }
}
