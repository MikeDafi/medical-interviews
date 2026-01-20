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

// Business hours configuration (in CDT/Chicago time)
// Weekdays: 10 AM - 7 PM CDT
// Weekends: 12 PM - 3 PM CDT
const BUSINESS_HOURS = {
  weekday: {
    start: 10,  // 10 AM CDT
    end: 19,    // 7 PM CDT
  },
  weekend: {
    start: 12,  // 12 PM CDT
    end: 15,    // 3 PM CDT
  },
  slotDuration: 30, // minutes
  timezone: 'America/Chicago'
};

// Days of week that are available (0=Sunday, 6=Saturday)
const AVAILABLE_DAYS = [0, 1, 2, 3, 4, 5, 6]; // All days

// Batch cache for 4 weeks of availability (1 hour TTL)
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const PRELOAD_DAYS = 28; // 4 weeks

let batchCache = {
  data: null,        // Map of dateStr -> availableSlots
  timestamp: 0,      // When cache was created
  loading: false     // Prevent concurrent loads
};

function isCacheValid() {
  return batchCache.data && (Date.now() - batchCache.timestamp < CACHE_TTL);
}

function getCacheAge() {
  if (!batchCache.timestamp) return null;
  return Date.now() - batchCache.timestamp;
}

function getCachedAvailability(dateStr) {
  if (!isCacheValid()) return null;
  console.log(`Cache HIT for ${dateStr} (age: ${Math.round(getCacheAge() / 1000 / 60)}min)`);
  return batchCache.data.get(dateStr) || { availableSlots: [], timezone: BUSINESS_HOURS.timezone };
}

function setCachedAvailability(dateStr, data) {
  if (!batchCache.data) batchCache.data = new Map();
  batchCache.data.set(dateStr, data);
}

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

// Event titles to ignore (case-insensitive patterns)
const IGNORED_EVENT_PATTERNS = [
  /^week\s*\d*/i,  // "Week 1", "Week 2", "week #", etc.
  /^week$/i,       // Just "Week"
];

// Check if an event should be ignored based on its title
function shouldIgnoreEvent(title) {
  if (!title) return false;
  return IGNORED_EVENT_PATTERNS.some(pattern => pattern.test(title.trim()));
}

// Query Events API to get busy times, filtering out ignored events
async function getBusyTimes(calendar, date) {
  if (CALENDAR_IDS.length === 0) {
    console.warn('No calendar IDs configured - returning empty busy times');
    return [];
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  console.log('Querying Events for calendars:', CALENDAR_IDS);
  console.log('Date range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());

  const allBusyPeriods = [];

  // Query each calendar for events
  for (const calendarId of CALENDAR_IDS) {
    try {
      const response = await calendar.events.list({
        calendarId,
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true, // Expand recurring events
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      console.log(`Calendar ${calendarId}: ${events.length} events found`);

      for (const event of events) {
        // Skip events marked as "free" or "transparent"
        if (event.transparency === 'transparent') {
          console.log(`  Skipping (transparent): "${event.summary}"`);
          continue;
        }

        // Skip ignored events (like "Week #")
        if (shouldIgnoreEvent(event.summary)) {
          console.log(`  Skipping (ignored pattern): "${event.summary}"`);
          continue;
        }

        // Get event start/end times
        const start = event.start?.dateTime || event.start?.date;
        const end = event.end?.dateTime || event.end?.date;

        if (start && end) {
          console.log(`  Busy: "${event.summary}" from ${start} to ${end}`);
          allBusyPeriods.push({ start, end });
        }
      }
    } catch (error) {
      console.warn(`Error querying calendar ${calendarId}:`, error.message);
      // Continue with other calendars
    }
  }

  console.log('Total busy periods (after filtering):', allBusyPeriods.length);
  return allBusyPeriods;
}

// Generate available 30-min slots for a date, excluding busy times
function generateAvailableSlots(date, busyPeriods) {
  const dayOfWeek = date.getDay();
  
  // Check if it's an available day
  if (!AVAILABLE_DAYS.includes(dayOfWeek)) {
    return [];
  }

  // Determine if weekend or weekday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const hours = isWeekend ? BUSINESS_HOURS.weekend : BUSINESS_HOURS.weekday;

  const slots = [];
  const dateStr = date.toISOString().split('T')[0];

  // Generate all possible slots during business hours (in Chicago time)
  for (let hour = hours.start; hour < hours.end; hour++) {
    for (let minute = 0; minute < 60; minute += BUSINESS_HOURS.slotDuration) {
      // Don't start a session in the last 30 mins before closing
      if (hour === hours.end - 1 && minute >= 30) continue;

      // Create slot time in Chicago timezone (CST = -06:00, CDT = -05:00)
      // Using -06:00 for winter (January)
      const slotTimeStr = `${dateStr}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00-06:00`;
      const slotStart = new Date(slotTimeStr);
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

// Batch preload all availability for 4 weeks (only 4 API calls total!)
async function batchPreloadAvailability() {
  if (batchCache.loading) {
    console.log('Batch preload already in progress, waiting...');
    // Wait for current load to complete
    while (batchCache.loading) {
      await new Promise(r => setTimeout(r, 100));
    }
    return batchCache.data;
  }

  console.log('=== BATCH PRELOAD: Loading 4 weeks of availability ===');
  batchCache.loading = true;

  try {
    const calendar = getCalendarClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + PRELOAD_DAYS);

    // Collect all events from all calendars for the entire 4-week period
    const allEvents = [];
    
    for (const calendarId of CALENDAR_IDS) {
      try {
        console.log(`Fetching events from ${calendarId}...`);
        const response = await calendar.events.list({
          calendarId,
          timeMin: today.toISOString(),
          timeMax: endDate.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 500 // Should be plenty for 4 weeks
        });

        const events = response.data.items || [];
        console.log(`  Found ${events.length} events`);

        for (const event of events) {
          // Skip transparent/free events
          if (event.transparency === 'transparent') continue;
          // Skip ignored patterns (Week #)
          if (shouldIgnoreEvent(event.summary)) continue;

          const start = event.start?.dateTime || event.start?.date;
          const end = event.end?.dateTime || event.end?.date;
          if (start && end) {
            allEvents.push({ start, end, summary: event.summary });
          }
        }
      } catch (error) {
        console.warn(`Error fetching from ${calendarId}:`, error.message);
      }
    }

    console.log(`Total events loaded: ${allEvents.length}`);

    // Process events into daily availability
    const availabilityMap = new Map();
    
    for (let i = 0; i < PRELOAD_DAYS; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // Filter events for this specific day
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayEvents = allEvents.filter(e => {
        const eventStart = new Date(e.start);
        const eventEnd = new Date(e.end);
        return eventStart < dayEnd && eventEnd > dayStart;
      });

      const availableSlots = generateAvailableSlots(date, dayEvents);
      availabilityMap.set(dateStr, {
        availableSlots,
        timezone: BUSINESS_HOURS.timezone,
        configured: true
      });
    }

    // Update cache
    batchCache.data = availabilityMap;
    batchCache.timestamp = Date.now();
    batchCache.loading = false;

    console.log(`=== BATCH PRELOAD COMPLETE: ${availabilityMap.size} days cached ===`);
    return availabilityMap;
  } catch (error) {
    batchCache.loading = false;
    console.error('Batch preload error:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 60, 60000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { action } = req.query;

  // GET preload - batch load all 4 weeks (call on page load)
  if (req.method === 'GET' && action === 'preload') {
    try {
      // Check if Google Calendar is configured
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || CALENDAR_IDS.length === 0) {
        return res.status(200).json({ 
          success: false,
          message: 'Calendar integration not configured',
          configured: false
        });
      }

      // If cache is valid, return cache info
      if (isCacheValid()) {
        const cacheAgeMin = Math.round(getCacheAge() / 1000 / 60);
        return res.status(200).json({
          success: true,
          cached: true,
          cacheAge: cacheAgeMin,
          cacheExpires: Math.round((CACHE_TTL - getCacheAge()) / 1000 / 60),
          daysLoaded: batchCache.data?.size || 0,
          configured: true
        });
      }

      // Preload all 4 weeks
      await batchPreloadAvailability();

      return res.status(200).json({
        success: true,
        cached: false,
        cacheAge: 0,
        cacheExpires: Math.round(CACHE_TTL / 1000 / 60),
        daysLoaded: batchCache.data?.size || 0,
        configured: true
      });
    } catch (error) {
      console.error('Preload error:', error);
      return res.status(500).json({ error: 'Failed to preload availability' });
    }
  }

  // GET availability for a date (uses batch cache)
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
          message: 'Calendar integration not configured',
          configured: false
        });
      }

      // Check batch cache first
      if (isCacheValid()) {
        const cached = getCachedAvailability(date);
        if (cached) {
          return res.status(200).json({
            ...cached,
            cacheAge: Math.round(getCacheAge() / 1000 / 60)
          });
        }
      }

      // Cache expired or missing - trigger batch preload
      console.log('Cache expired or missing, triggering batch preload...');
      await batchPreloadAvailability();
      
      const cached = getCachedAvailability(date);
      return res.status(200).json({
        ...cached,
        cacheAge: 0
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

    // IMPORTANT: Check if cache is valid before allowing booking
    if (!isCacheValid()) {
      console.log('Booking rejected: cache expired, needs refresh');
      return res.status(409).json({ 
        error: 'Availability data has expired. Please refresh and try again.',
        code: 'CACHE_EXPIRED',
        needsRefresh: true
      });
    }

    // Verify the selected time is still available in cache
    const cachedDay = getCachedAvailability(date);
    if (!cachedDay || !cachedDay.availableSlots?.includes(time)) {
      console.log(`Booking rejected: time ${time} not available on ${date}`);
      return res.status(409).json({
        error: 'This time slot is no longer available. Please select another time.',
        code: 'SLOT_UNAVAILABLE',
        needsRefresh: true
      });
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
