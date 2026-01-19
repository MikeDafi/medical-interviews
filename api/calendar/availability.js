import { google } from 'googleapis';

// Calendar IDs to check for busy times (Ashley's calendars + bookings calendar)
const CALENDAR_IDS = [
  'c_764a6f8bc799a24b9de7bf135dc3faf69259d94fdbc703ea2ac9e8ac82a2b52f@group.calendar.google.com',
  'c_e1ae62432eae1afa953f0baee8e6711b0bdf65416b9a7d283544da9dc7075c8d@group.calendar.google.com',
  'ashley.kumar@my.rfums.org',
  'c_5bac04cffa088791c59bed2ce25a49775bec9125afdadf1906bbf349b127bd8a@group.calendar.google.com',
  '0854b480f27b339f63c8817e43dc08e1183cdfa35ca61bb99fd7a0809991b34a@group.calendar.google.com' // Bookings calendar
];

function getAuthClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );
  
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly']
  });
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter required (YYYY-MM-DD)' });
    }

    const auth = getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });

    // Set time range for the requested date
    const startOfDay = new Date(`${date}T00:00:00-06:00`);
    const endOfDay = new Date(`${date}T23:59:59-06:00`);

    // Fetch actual events from all calendars to filter out all-day events
    const allBusyPeriods = [];
    
    for (const calendarId of CALENDAR_IDS) {
      try {
        const eventsResponse = await calendar.events.list({
          calendarId,
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          singleEvents: true,
          orderBy: 'startTime'
        });
        
        if (eventsResponse.data.items) {
          eventsResponse.data.items.forEach(event => {
            // Skip all-day events (they don't have dateTime, only date)
            if (!event.start.dateTime) {
              return;
            }
            
            // Skip events marked as "free" (transparent)
            if (event.transparency === 'transparent') {
              return;
            }
            
            allBusyPeriods.push({
              start: event.start.dateTime,
              end: event.end.dateTime
            });
          });
        }
      } catch {
        // Calendar not accessible, skip silently
      }
    }

    // Define available time slots (9 AM to 6 PM, every 30 minutes)
    const possibleSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
    ];

    // Filter out busy slots (check if 30-minute slot overlaps with any busy period)
    const availableSlots = possibleSlots.filter(slot => {
      const slotStart = new Date(`${date}T${slot}:00-06:00`);
      const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000); // 30 minutes later

      // Check if this slot overlaps with any busy period
      const isOverlapping = allBusyPeriods.some(busy => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        
        // Overlap if slot starts before busy ends AND slot ends after busy starts
        return slotStart < busyEnd && slotEnd > busyStart;
      });

      return !isOverlapping;
    });

    // Convert to 12-hour format for display
    const formattedSlots = availableSlots.map(slot => {
      const [hours, minutes] = slot.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    });

    return res.status(200).json({
      date,
      availableSlots: formattedSlots,
      totalBusyEvents: allBusyPeriods.length
    });

  } catch {
    return res.status(500).json({ error: 'Failed to fetch availability' });
  }
}
