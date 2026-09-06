// Load .env.local for local development
import '../_lib/env.js';

import { sql } from '@vercel/postgres';
import { google } from 'googleapis';
import { rateLimit } from '../_lib/auth.js';
import { requireAuth } from '../_lib/session.js';
import { sendCustomerBookingEmail, sendAdminBookingEmail, sendCustomerCancellationEmail, sendAdminCancellationEmail } from '../_lib/email.js';
import { getPackageName, getCategoryLabel } from '../../lib/packages.js';
import { isOwnerUnavailableResponse } from '../../lib/calendar.js';
import { formatSlotLabel, slotsForBooking } from '../../lib/slots.js';
import {
  zonedWallClockToUtc,
  parseTimeLabel,
  formatTimeLabel,
  formatDateKey,
  friendlyZoneName,
  isValidTimeZone,
} from '../../lib/timezone.js';

// Business timezone — the admin's stable working zone. Configured explicitly via env (NOT read
// from Google Calendar, whose timezone can drift if it auto-updates to the admin's location).
// Used internally for availability/slot math, all-day event bounding, and the admin email only;
// it is never sent to Google when creating an event.
const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE?.trim() || 'America/Chicago';

// Calendar where bookings are created
const BOOKINGS_CALENDAR_ID = process.env.GOOGLE_BOOKINGS_CALENDAR_ID?.trim();

// Calendar IDs to check for busy times (Ashley's calendars + bookings calendar)
// Set these in environment variables, comma-separated
const BASE_CALENDAR_IDS = process.env.GOOGLE_CALENDAR_IDS 
  ? process.env.GOOGLE_CALENDAR_IDS.trim().split(',').map(id => id.trim())
  : [];

// Always include the bookings calendar to block out already-booked times
const CALENDAR_IDS = BOOKINGS_CALENDAR_ID 
  ? [...new Set([...BASE_CALENDAR_IDS, BOOKINGS_CALENDAR_ID])] // dedupe in case it's already listed
  : BASE_CALENDAR_IDS;

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
  timezone: BUSINESS_TIMEZONE
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
  return batchCache.data.get(dateStr) || { availableSlots: [], timezone: BUSINESS_HOURS.timezone };
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

// Event titles that OVERRIDE busy times - "Ash is free" marks time as available
const FREE_OVERRIDE_PATTERNS = [
  /ash\s+is\s+free/i,  // "Ash is free", "ash is free", etc.
  /ashley\s+is\s+free/i,  // "Ashley is free" variant
];

// Check if an event should be ignored based on its title
function shouldIgnoreEvent(title) {
  if (!title) return false;
  return IGNORED_EVENT_PATTERNS.some(pattern => pattern.test(title.trim()));
}

// Check if an event marks time as explicitly FREE (overrides busy)
function isFreeOverrideEvent(title) {
  if (!title) return false;
  return FREE_OVERRIDE_PATTERNS.some(pattern => pattern.test(title.trim()));
}

// Resolve an event's start/end bound to an absolute ISO instant string.
// - Timed events carry an explicit offset in `dateTime` (already an absolute instant).
// - All-day events only have a bare `date` (YYYY-MM-DD). Per business rule these are anchored to
//   midnight in BUSINESS_TIMEZONE (Chicago). Google's all-day `end.date` is exclusive, which this
//   preserves, so the busy/free block covers exactly the intended local day(s).
function resolveEventBound(bound) {
  if (!bound) return null;
  if (bound.dateTime) return bound.dateTime;
  if (bound.date) {
    const [year, month, day] = bound.date.split('-').map(Number);
    return zonedWallClockToUtc({ year, month, day }, BUSINESS_TIMEZONE).toISOString();
  }
  return null;
}

// Generate available 30-min slots for a date, excluding busy times
// freeOverrides: Array of time periods where "Ash is free" - these OVERRIDE busy times
function generateAvailableSlots(date, busyPeriods, freeOverrides = []) {
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

      // Resolve the slot's absolute instant from the business wall-clock, DST-aware (correct
      // year-round). Busy/free events are absolute instants, so this comparison is now accurate.
      const [slotYear, slotMonth, slotDay] = dateStr.split('-').map(Number);
      const slotStart = zonedWallClockToUtc(
        { year: slotYear, month: slotMonth, day: slotDay, hour, minute },
        BUSINESS_TIMEZONE
      );
      const slotEnd = new Date(slotStart.getTime() + BUSINESS_HOURS.slotDuration * 60 * 1000);

      // FIRST: Check if this slot falls within a "free override" period ("Ash is free")
      // If so, it's available regardless of other busy times
      const hasFreeOverride = freeOverrides.some(free => {
        const freeStart = new Date(free.start);
        const freeEnd = new Date(free.end);
        // Slot is in free override if it's completely contained within the free period
        return slotStart >= freeStart && slotEnd <= freeEnd;
      });

      if (hasFreeOverride) {
        // "Ash is free" overrides all busy times - slot is available
        slots.push(formatSlotLabel(hour, minute));
        continue;
      }

      // Check if this slot overlaps with any busy period
      const isBusy = busyPeriods.some(busy => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        // Slot is busy if it overlaps with busy period
        return slotStart < busyEnd && slotEnd > busyStart;
      });

      if (!isBusy) {
        // Format time for display (e.g., "9:00 AM", "2:30 PM")
        slots.push(formatSlotLabel(hour, minute));
      }
    }
  }

  return slots;
}

// Batch preload all availability for 4 weeks (only 4 API calls total!)
async function batchPreloadAvailability() {
  if (batchCache.loading) {
    // Wait for current load to complete
    while (batchCache.loading) {
      await new Promise(r => setTimeout(r, 100));
    }
    return batchCache.data;
  }

  batchCache.loading = true;

  try {
    const calendar = getCalendarClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + PRELOAD_DAYS);

    // Collect all events from all calendars for the entire 4-week period
    // Separate into busy events and "free override" events ("Ash is free")
    const busyEvents = [];
    const freeOverrideEvents = [];
    
    for (const calendarId of CALENDAR_IDS) {
      try {
        const response = await calendar.events.list({
          calendarId,
          timeMin: today.toISOString(),
          timeMax: endDate.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 500
        });

        const events = response.data.items || [];

        for (const event of events) {
          const start = resolveEventBound(event.start);
          const end = resolveEventBound(event.end);
          if (!start || !end) continue;

          // Check for "Ash is free" - this OVERRIDES busy times
          if (isFreeOverrideEvent(event.summary)) {
            freeOverrideEvents.push({ start, end, summary: event.summary });
            continue;
          }

          // Skip transparent/free events
          if (event.transparency === 'transparent') continue;
          // Skip events the owner declined or only tentatively accepted - they don't block
          if (isOwnerUnavailableResponse(event)) continue;
          // Skip ignored patterns (Week #)
          if (shouldIgnoreEvent(event.summary)) continue;

          busyEvents.push({ start, end, summary: event.summary });
        }
      } catch (error) {
        console.warn(`Error fetching from ${calendarId}:`, error.message);
      }
    }

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

      // Get busy periods for this day
      const dayBusyPeriods = busyEvents.filter(e => {
        const eventStart = new Date(e.start);
        const eventEnd = new Date(e.end);
        return eventStart < dayEnd && eventEnd > dayStart;
      });

      // Get free override periods for this day ("Ash is free")
      const dayFreeOverrides = freeOverrideEvents.filter(e => {
        const eventStart = new Date(e.start);
        const eventEnd = new Date(e.end);
        return eventStart < dayEnd && eventEnd > dayStart;
      });

      // Generate available slots - free overrides take priority over busy times
      const availableSlots = generateAvailableSlots(date, dayBusyPeriods, dayFreeOverrides);
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

  // GET recent purchases (for social proof display)
  if (req.method === 'GET' && action === 'recent') {
    try {
      // Get recent purchases from all users (last 10)
      const result = await sql`
        SELECT 
          u.name as first_name,
          p.value->>'package_id' as package_id,
          p.value->>'type' as type,
          p.value->>'purchase_date' as created_at
        FROM users u,
        LATERAL jsonb_array_elements(COALESCE(u.purchases, '[]'::jsonb)) AS p(value)
        WHERE (p.value->>'purchase_date') IS NOT NULL
        ORDER BY (p.value->>'purchase_date') DESC
        LIMIT 10
      `;

      const purchases = result.rows.map(row => ({
        id: row.created_at,
        first_name: row.first_name?.split(' ')[0] || 'Student',
        package_name: getPackageName(row.package_id, row.type),
        created_at: row.created_at
      }));

      return res.status(200).json({ purchases });
    } catch (error) {
      console.error('Error fetching recent purchases:', error);
      return res.status(200).json({ purchases: [] });
    }
  }

  // GET debug - show what calendars are being used
  if (req.method === 'GET' && action === 'debug') {
    return res.status(200).json({
      bookingsCalendarId: BOOKINGS_CALENDAR_ID || 'NOT SET',
      baseCalendarIds: BASE_CALENDAR_IDS,
      allCalendarIds: CALENDAR_IDS,
      hasServiceAccountKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    });
  }

  // GET preload - batch load all 4 weeks and return ALL data (call on page load)
  // Add ?refresh=true to force cache invalidation
  if (req.method === 'GET' && action === 'preload') {
    try {
      // Check if Google Calendar is configured
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || CALENDAR_IDS.length === 0) {
        return res.status(200).json({ 
          success: false,
          message: 'Calendar integration not configured',
          configured: false,
          availability: {}
        });
      }

      // Force refresh if requested
      const forceRefresh = req.query.refresh === 'true';
      if (forceRefresh) {
        console.log('Force refresh requested - clearing cache');
        batchCache.data = null;
        batchCache.timestamp = 0;
      }

      // If cache is valid, return cached data
      if (isCacheValid() && batchCache.data) {
        const cacheAgeMin = Math.round(getCacheAge() / 1000 / 60);
        // Convert Map to plain object for JSON response
        const availability = {};
        batchCache.data.forEach((value, key) => {
          availability[key] = value;
        });
        
        // Edge cache for 5 min, stale-while-revalidate for 1 hour
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
        
        return res.status(200).json({
          success: true,
          cached: true,
          cacheAge: cacheAgeMin,
          cacheExpires: Math.round((CACHE_TTL - getCacheAge()) / 1000 / 60),
          daysLoaded: batchCache.data.size,
          configured: true,
          timezone: BUSINESS_HOURS.timezone,
          availability // All 28 days of availability data!
        });
      }

      // Preload all 4 weeks
      await batchPreloadAvailability();

      // Convert Map to plain object for JSON response
      const availability = {};
      batchCache.data.forEach((value, key) => {
        availability[key] = value;
      });

      // Edge cache for 5 min, stale-while-revalidate for 1 hour
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');

      return res.status(200).json({
        success: true,
        cached: false,
        cacheAge: 0,
        cacheExpires: Math.round(CACHE_TTL / 1000 / 60),
        daysLoaded: batchCache.data?.size || 0,
        configured: true,
        timezone: BUSINESS_HOURS.timezone,
        availability // All 28 days of availability data!
      });
    } catch (error) {
      console.error('Preload error:', error);
      return res.status(500).json({ error: 'Failed to preload availability' });
    }
  }

  // GET availability for specific dates (fetch only what's missing)
  // Usage: /api/calendar?action=range&dates=2026-01-21,2026-01-22,2026-01-23
  if (req.method === 'GET' && action === 'range') {
    const { dates } = req.query;
    
    if (!dates) {
      return res.status(400).json({ error: 'dates parameter required (comma-separated YYYY-MM-DD)' });
    }

    const dateList = dates.split(',').map(d => d.trim()).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
    
    if (dateList.length === 0) {
      return res.status(400).json({ error: 'No valid dates provided' });
    }

    try {
      // Check if Google Calendar is configured
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || CALENDAR_IDS.length === 0) {
        return res.status(200).json({ 
          availability: {},
          configured: false
        });
      }

      // Ensure cache is loaded
      if (!isCacheValid()) {
        await batchPreloadAvailability();
      }

      // Return availability for requested dates only
      const availability = {};
      for (const dateStr of dateList) {
        const cached = getCachedAvailability(dateStr);
        if (cached) {
          availability[dateStr] = cached;
        } else {
          // Date not in cache (maybe outside 4-week range)
          availability[dateStr] = { availableSlots: [], message: 'Date not available' };
        }
      }

      return res.status(200).json({
        availability,
        timezone: BUSINESS_HOURS.timezone,
        cacheAge: Math.round(getCacheAge() / 1000 / 60),
        configured: true
      });
    } catch (error) {
      console.error('Range availability error:', error);
      return res.status(500).json({ error: 'Failed to fetch availability' });
    }
  }

  // GET refresh a single date (force refresh from Google Calendar)
  // Used after booking failure to get fresh data
  if (req.method === 'GET' && action === 'refresh') {
    const { date } = req.query;
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Valid date required (YYYY-MM-DD)' });
    }

    try {
      console.log(`Force refreshing availability for ${date}`);
      
      // Force a full refresh of the cache
      await batchPreloadAvailability();
      
      const cached = getCachedAvailability(date);
      return res.status(200).json({
        ...cached,
        refreshed: true,
        cacheAge: 0
      });
    } catch (error) {
      console.error('Refresh error:', error);
      return res.status(500).json({ error: 'Failed to refresh availability' });
    }
  }

  // GET availability for a single date (uses batch cache)
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
    // SECURITY: Require authenticated session for booking
    const { authenticated, user: sessionUser, error: authError } = await requireAuth(req);
    
    if (!authenticated) {
      return res.status(401).json({ error: authError || 'Authentication required to book' });
    }

    const { date, time, duration, timezone: requestedTimezone } = req.body;

    if (!date || !time || !duration) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (![30, 60].includes(duration)) {
      return res.status(400).json({ error: 'Invalid duration (must be 30 or 60 minutes)' });
    }

    // Customer's timezone (from the client) drives the Google event declaration + customer email.
    // Validate before trusting it; fall back to the business zone.
    const customerTimezone = isValidTimeZone(requestedTimezone) ? requestedTimezone : BUSINESS_TIMEZONE;

    // SECURITY: Use verified session data, not client-provided data
    const userId = sessionUser.googleId;
    const userEmail = sessionUser.email;
    const userName = sessionUser.name;

    // SECURITY: Reject same-day and past bookings
    // Use business timezone for consistent date comparison
    const todayInBusiness = formatDateKey(new Date(), BUSINESS_TIMEZONE); // YYYY-MM-DD format
    const bookingDateStr = date; // Already in YYYY-MM-DD format
    
    if (bookingDateStr === todayInBusiness) {
      return res.status(400).json({ 
        error: 'Same-day bookings are not available. Please book at least 1 day in advance.',
        code: 'SAME_DAY_BOOKING'
      });
    }

    if (bookingDateStr < todayInBusiness) {
      return res.status(400).json({ 
        error: 'Cannot book sessions in the past.',
        code: 'PAST_DATE'
      });
    }

    // Refresh cache if expired, then verify slot availability
    if (!isCacheValid()) {
      console.log('Cache expired during booking, refreshing...');
      try {
        await batchPreloadAvailability();
      } catch (refreshError) {
        console.error('Failed to refresh availability:', refreshError);
        // Continue anyway - we'll verify with Google Calendar during booking
      }
    }

    // Verify the selected time is still available
    const cachedDay = getCachedAvailability(date);
    if (!cachedDay || !cachedDay.availableSlots?.includes(time)) {
      return res.status(409).json({
        error: 'Sorry, this time slot is no longer available. Please select another time.',
        code: 'SLOT_UNAVAILABLE'
      });
    }

    // For multi-slot sessions (e.g. 60-min = two 30-min slots), every occupied slot must be free.
    // The client gates this via canBookHour, but re-validate server-side to prevent a race or a
    // crafted request from booking a session that overruns into a busy/already-booked period.
    const requiredSlots = slotsForBooking(time, duration);
    const allSlotsAvailable = requiredSlots.every(slot => cachedDay.availableSlots.includes(slot));
    if (!allSlotsAvailable) {
      return res.status(409).json({
        error: `Sorry, there isn't a full ${duration}-minute opening at this time. Please select another time.`,
        code: 'SLOT_UNAVAILABLE'
      });
    }

    try {
      // Fetch user data
      const userResult = await sql`
        SELECT id, purchases, phone, application_stage, main_concerns, target_schools FROM users 
        WHERE google_id = ${userId} OR email = ${userEmail}
      `;

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found. Please sign in again.' });
      }

      const user = userResult.rows[0];
      const purchases = user.purchases || [];
      const userProfile = {
        phone: user.phone,
        application_stage: user.application_stage,
        main_concerns: user.main_concerns,
        target_schools: user.target_schools
      };

      // Find an active package with matching duration and available sessions
      const packageIndex = purchases.findIndex(p => {
        if (p.status !== 'active') return false;
        const remaining = (p.sessions_total || 0) - (p.sessions_used || 0);
        if (remaining <= 0) return false;
        
        // Check duration_minutes (new format) or fall back to type (legacy)
        const pkgDuration = p.duration_minutes || (p.type === 'trial' ? 30 : 60);
        return pkgDuration === duration;
      });

      if (packageIndex === -1) {
        return res.status(400).json({ error: `No ${duration}-minute sessions available. Please purchase a package.` });
      }

      // Service metadata from the matched purchase, so the booking record, calendar event, and
      // confirmation emails can all clearly state which service this session is for (rather than
      // only ever showing the duration).
      const bookingCategory = purchases[packageIndex].category;
      const bookingPackageId = purchases[packageIndex].package_id;

      // Static Google Meet link for all sessions
      const meetLink = process.env.GOOGLE_MEET_LINK || 'https://meet.google.com/yrr-qxiw-hjh';

      // Canonical absolute instant for this booking: the slot's business wall-clock interpreted in
      // BUSINESS_TIMEZONE (DST-aware). Single source of truth for the calendar event and both emails.
      const { hour24, minute } = parseTimeLabel(time);
      const [bookingYear, bookingMonth, bookingDay] = date.split('-').map(Number);
      const bookingStartInstant = zonedWallClockToUtc(
        { year: bookingYear, month: bookingMonth, day: bookingDay, hour: hour24, minute },
        BUSINESS_TIMEZONE
      );
      const bookingEndInstant = new Date(bookingStartInstant.getTime() + duration * 60 * 1000);

      // Create booking in Google Calendar if configured
      let eventLink = null;
      let calendarEventId = null;
      console.log('Calendar config check:', {
        hasServiceAccountKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
        bookingsCalendarId: BOOKINGS_CALENDAR_ID || 'NOT SET'
      });
      
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY && BOOKINGS_CALENDAR_ID) {
        // Declare the event in the CUSTOMER's timezone via an absolute instant. Google stores the
        // instant and auto-converts on display, so the admin sees it in their own calendar zone
        // without us looking up (or depending on) the admin/calendar timezone.
        const startDateTime = bookingStartInstant.toISOString();
        const endDateTime = bookingEndInstant.toISOString();
        const serviceLabel = getCategoryLabel(bookingCategory);
        const sessionLabel = `${serviceLabel} (${duration === 30 ? '30 min' : '1 hour'})`;
        const eventBody = {
          summary: `${sessionLabel} - ${userName || userEmail}`,
          description: `PreMedical 1-on-1 ${serviceLabel} Session\n\nClient: ${userName || userEmail}\nEmail: ${userEmail}\nDuration: ${duration} minutes\n\n🎥 Google Meet: ${meetLink}`,
          location: meetLink,
          start: { dateTime: startDateTime, timeZone: customerTimezone },
          end: { dateTime: endDateTime, timeZone: customerTimezone },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 30 }
            ]
          }
        };

        console.log('Creating calendar event:', {
          calendarId: BOOKINGS_CALENDAR_ID, date, time, duration, startDateTime, endDateTime, timeZone: customerTimezone
        });

        // Retry a few times so a transient Google API error (5xx / rate limit / network) doesn't
        // silently drop the calendar event while the booking still saves.
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const calendar = getCalendarClient();
            const event = await calendar.events.insert({ calendarId: BOOKINGS_CALENDAR_ID, requestBody: eventBody });
            eventLink = event.data.htmlLink;
            calendarEventId = event.data.id;
            console.log('Calendar event created successfully:', { eventId: calendarEventId, attempt });
            break;
          } catch (calError) {
            console.error(`Google Calendar event creation error (attempt ${attempt}/${maxAttempts}):`, calError.message);
            console.error('Full calendar error:', calError.response?.data || calError.stack);
            if (attempt < maxAttempts) {
              await new Promise(r => setTimeout(r, 500 * attempt));
            }
          }
        }

        if (!calendarEventId) {
          console.error('Calendar event NOT created after retries for booking:', { date, time, duration, userEmail });
        }
      } else {
        console.log('Skipping calendar event - missing config');
      }

      // Create booking record
      const booking = {
        id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date,
        time,
        duration,
        // Which service this booking is for - copied from the purchase it draws a session from,
        // so booking details and confirmation emails can clearly state the service (e.g. CV
        // Advice vs Interview Prep) instead of only ever showing the duration.
        category: bookingCategory,
        package_id: bookingPackageId,
        status: 'confirmed',
        booked_at: new Date().toISOString(),
        calendar_event_link: eventLink,
        calendar_event_id: calendarEventId,
        meet_link: meetLink,
        timezone: customerTimezone
      };

      // Update the package
      purchases[packageIndex].sessions_used = (purchases[packageIndex].sessions_used || 0) + 1;
      purchases[packageIndex].bookings = purchases[packageIndex].bookings || [];
      purchases[packageIndex].bookings.push(booking);

      // Save back to DB
      await sql`
        UPDATE users SET purchases = ${JSON.stringify(purchases)}::jsonb WHERE id = ${user.id}
      `;

      // Send confirmation emails (fire and forget - errors logged but don't affect booking)
      // Customer email: render the time/date in the customer's own timezone.
      sendCustomerBookingEmail({
        customerEmail: userEmail,
        customerName: userName,
        date: formatDateKey(bookingStartInstant, customerTimezone),
        time: formatTimeLabel(bookingStartInstant, customerTimezone),
        duration,
        category: bookingCategory,
        eventLink,
        meetLink,
        timezone: friendlyZoneName(customerTimezone, bookingStartInstant)
      }).catch(err => console.error('Customer email error:', err));
      
      // Admin email: render in the business timezone (plain HTML can't auto-convert like the
      // Google Calendar event does). The calendar event itself shows the admin their local time.
      sendAdminBookingEmail({
        customerEmail: userEmail,
        customerName: userName,
        customerId: user.id,
        date: formatDateKey(bookingStartInstant, BUSINESS_TIMEZONE),
        time: formatTimeLabel(bookingStartInstant, BUSINESS_TIMEZONE),
        duration,
        category: bookingCategory,
        eventLink,
        meetLink,
        userProfile,
        timezone: friendlyZoneName(BUSINESS_TIMEZONE, bookingStartInstant)
      }).catch(err => console.error('Admin email error:', err));

      // Invalidate cache so next user sees updated availability
      console.log('Booking successful - invalidating availability cache');
      batchCache.data = null;
      batchCache.timestamp = 0;

      return res.status(200).json({ 
        success: true, 
        message: `${duration}-minute session booked for ${date} at ${time}`,
        booking,
        eventLink
      });
    } catch (error) {
      console.error('Booking error:', error);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }

  // ==================== CANCEL BOOKING ====================
  if (action === 'cancel' && req.method === 'POST') {
    // Require authentication
    const { authenticated, user: sessionUser, error: authError } = await requireAuth(req);
    if (!authenticated) {
      return res.status(401).json({ error: authError || 'Authentication required' });
    }

    const { bookingId, packageId, date } = req.body;

    if (!bookingId || !packageId) {
      return res.status(400).json({ error: 'Missing booking or package information' });
    }

    // Validate cancellation is at least 1 day before
    const todayInBusiness = formatDateKey(new Date(), BUSINESS_TIMEZONE);
    const bookingDateStr = date;

    const bookingDate = new Date(bookingDateStr + 'T00:00:00');
    const today = new Date(todayInBusiness + 'T00:00:00');
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (bookingDate < tomorrow) {
      return res.status(400).json({ 
        error: 'Cancellations must be made at least 1 day before your appointment.',
        code: 'TOO_LATE_TO_CANCEL'
      });
    }

    try {
      // Get user and their purchases
      const userId = sessionUser.googleId;
      const userResult = await sql`SELECT id, purchases FROM users WHERE google_id = ${userId}`;
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];
      const purchases = user.purchases || [];

      // Find the package and booking
      const packageIndex = purchases.findIndex(p => p.id === packageId);
      if (packageIndex === -1) {
        return res.status(404).json({ error: 'Package not found' });
      }

      const pkg = purchases[packageIndex];
      const bookingIndex = pkg.bookings?.findIndex(b => b.id === bookingId);
      
      if (bookingIndex === -1 || bookingIndex === undefined) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const booking = pkg.bookings[bookingIndex];

      // Mark booking as cancelled and restore session credit
      pkg.bookings[bookingIndex].status = 'cancelled';
      pkg.bookings[bookingIndex].cancelled_at = new Date().toISOString();
      pkg.sessions_used = Math.max(0, (pkg.sessions_used || 0) - 1);

      // Try to delete the Google Calendar event if we have the ID
      if (booking.calendar_event_id && BOOKINGS_CALENDAR_ID) {
        try {
          const calendar = getCalendarClient();
          await calendar.events.delete({
            calendarId: BOOKINGS_CALENDAR_ID,
            eventId: booking.calendar_event_id,
            sendUpdates: 'all' // Notify attendees
          });
        } catch (calError) {
          console.error('Failed to delete calendar event:', calError.message);
          // Continue even if calendar deletion fails
        }
      }

      // Save updated purchases
      await sql`
        UPDATE users SET purchases = ${JSON.stringify(purchases)}::jsonb WHERE id = ${user.id}
      `;

      // Send cancellation emails to customer + admin (fire and forget). Render the time in the
      // customer's original booking timezone for them, and in BUSINESS_TIMEZONE for the admin.
      const customerEmail = sessionUser.email;
      const customerName = sessionUser.name;
      const customerTz = booking.timezone || BUSINESS_TIMEZONE;

      let custDate = booking.date;
      let custTime = booking.time;
      let custTzLabel = friendlyZoneName(customerTz);
      let adminDate = booking.date;
      let adminTime = booking.time;
      let adminTzLabel = friendlyZoneName(BUSINESS_TIMEZONE);
      try {
        const { hour24, minute } = parseTimeLabel(booking.time);
        const [cy, cm, cd] = booking.date.split('-').map(Number);
        const startInstant = zonedWallClockToUtc(
          { year: cy, month: cm, day: cd, hour: hour24, minute },
          BUSINESS_TIMEZONE
        );
        custDate = formatDateKey(startInstant, customerTz);
        custTime = formatTimeLabel(startInstant, customerTz);
        custTzLabel = friendlyZoneName(customerTz, startInstant);
        adminDate = formatDateKey(startInstant, BUSINESS_TIMEZONE);
        adminTime = formatTimeLabel(startInstant, BUSINESS_TIMEZONE);
        adminTzLabel = friendlyZoneName(BUSINESS_TIMEZONE, startInstant);
      } catch (formatErr) {
        console.warn('Cancellation email time formatting fallback:', formatErr.message);
      }

      if (customerEmail) {
        sendCustomerCancellationEmail({
          customerEmail,
          customerName,
          date: custDate,
          time: custTime,
          duration: booking.duration,
          // Fall back to the parent purchase's category for bookings created before this field
          // existed on the booking record itself.
          category: booking.category || pkg.category,
          timezone: custTzLabel
        }).catch(err => console.error('Customer cancellation email error:', err));
      }

      sendAdminCancellationEmail({
        customerEmail,
        customerName,
        customerId: user.id,
        date: adminDate,
        time: adminTime,
        duration: booking.duration,
        category: booking.category || pkg.category,
        timezone: adminTzLabel
      }).catch(err => console.error('Admin cancellation email error:', err));

      // Invalidate cache so next user sees updated availability
      console.log('Cancellation successful - invalidating availability cache');
      batchCache.data = null;
      batchCache.timestamp = 0;

      return res.status(200).json({
        success: true,
        message: 'Booking cancelled successfully. Your session credit has been restored.',
        sessionRestored: true
      });

    } catch (error) {
      console.error('Cancel booking error:', error);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

