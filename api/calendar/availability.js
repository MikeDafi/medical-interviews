import { google } from 'googleapis';
import { rateLimit } from '../lib/auth.js';

// Calendar IDs to check for busy times
const CALENDAR_IDS = [
  'c_764a6f8bc799a24b9de7bf135dc3faf69259d94fdbc703ea2ac9e8ac82a2b52f@group.calendar.google.com',
  'c_e1ae62432eae1afa953f0baee8e6711b0bdf65416b9a7d283544da9dc7075c8d@group.calendar.google.com',
  'ashley.kumar@my.rfums.org',
  'c_5bac04cffa088791c59bed2ce25a49775bec9125afdadf1906bbf349b127bd8a@group.calendar.google.com',
  '0854b480f27b339f63c8817e43dc08e1183cdfa35ca61bb99fd7a0809991b34a@group.calendar.google.com'
];

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
      scopes: ['https://www.googleapis.com/auth/calendar.readonly']
    });
  } catch (error) {
    console.error('Failed to parse service account key:', error);
    return null;
  }
}

export default async function handler(req, res) {
  // SECURITY: Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 60, 60000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter required' });
    }

    // SECURITY: Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const auth = getAuthClient();
    
    // If Google Calendar not configured, return default slots
    if (!auth) {
      return res.status(200).json({
        date,
        availableSlots: [
          '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
          '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
        ],
        note: 'Default availability (calendar not configured)'
      });
    }

    const calendar = google.calendar({ version: 'v3', auth });

    const startOfDay = new Date(`${date}T00:00:00-06:00`);
    const endOfDay = new Date(`${date}T23:59:59-06:00`);

    const freeBusyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        timeZone: 'America/Chicago',
        items: CALENDAR_IDS.map(id => ({ id }))
      }
    });

    const allBusyPeriods = [];
    const calendarsData = freeBusyResponse.data.calendars;

    for (const calendarId of CALENDAR_IDS) {
      const calendarBusy = calendarsData[calendarId];
      if (calendarBusy && calendarBusy.busy) {
        allBusyPeriods.push(...calendarBusy.busy);
      }
    }

    const possibleSlots = [
      '09:00', '10:00', '11:00', '12:00',
      '13:00', '14:00', '15:00', '16:00', '17:00'
    ];

    const availableSlots = possibleSlots.filter(slot => {
      const slotStart = new Date(`${date}T${slot}:00-06:00`);
      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

      const isOverlapping = allBusyPeriods.some(busy => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return slotStart < busyEnd && slotEnd > busyStart;
      });

      return !isOverlapping;
    });

    const formattedSlots = availableSlots.map(slot => {
      const [hours, minutes] = slot.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    });

    return res.status(200).json({
      date,
      availableSlots: formattedSlots
    });

  } catch (error) {
    console.error('Calendar availability error:', error);
    // SECURITY: Don't leak error details
    return res.status(500).json({ error: 'Failed to fetch availability' });
  }
}
