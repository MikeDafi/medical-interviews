/**
 * Shared, dependency-free, DST-aware timezone helpers.
 *
 * Uses only the built-in `Intl`/`Date` APIs, so this module is safe to import from
 * both the Vite client bundle (browser) and the Vercel serverless functions (Node).
 *
 * Core idea: a booking is an absolute instant in time (a `Date` / UTC). Wall-clock
 * times are always paired with an IANA timezone (e.g. `America/Chicago`), and the
 * offset for that zone is resolved per-date so Daylight Saving Time is handled
 * correctly year-round — never a hardcoded offset.
 */

const FRIENDLY_ZONE_NAMES = {
  'America/Chicago': 'Central Time',
  'America/New_York': 'Eastern Time',
  'America/Los_Angeles': 'Pacific Time',
  'America/Denver': 'Mountain Time',
  'America/Phoenix': 'Arizona Time',
  'America/Anchorage': 'Alaska Time',
  'Pacific/Honolulu': 'Hawaii Time',
};

/**
 * Returns the UTC offset, in minutes, that `timeZone` is at the given absolute instant.
 * Positive means ahead of UTC, negative means behind (e.g. America/Chicago in summer = -300,
 * in winter = -360).
 *
 * @param {string} timeZone IANA timezone name.
 * @param {Date} date Absolute instant to evaluate the offset at.
 * @returns {number} Offset in minutes.
 */
export function getOffsetMinutes(timeZone, date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const map = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }

  // The wall-clock time shown in `timeZone`, re-interpreted as if it were UTC.
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second)
  );

  // The gap between that and the real instant is the zone's offset.
  return Math.round((asUTC - date.getTime()) / 60000);
}

/**
 * Convert a wall-clock date/time that is expressed *in* `timeZone` into the absolute
 * UTC instant (a `Date`). DST-aware.
 *
 * @param {{year:number, month:number, day:number, hour?:number, minute?:number, second?:number}} wall
 *   Wall-clock components. `month` is 1-based.
 * @param {string} timeZone IANA timezone the wall-clock is expressed in.
 * @returns {Date} The corresponding absolute instant.
 */
export function zonedWallClockToUtc({ year, month, day, hour = 0, minute = 0, second = 0 }, timeZone) {
  // First approximation: treat the wall clock as if it were already UTC.
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);

  // Resolve the offset at that guessed instant, then refine once. The second pass
  // corrects the rare case where the offset differs across the guess (DST boundaries).
  const firstOffset = getOffsetMinutes(timeZone, new Date(utcGuess));
  const refinedOffset = getOffsetMinutes(timeZone, new Date(utcGuess - firstOffset * 60000));

  return new Date(utcGuess - refinedOffset * 60000);
}

/**
 * Format an absolute instant in a given IANA timezone using `Intl.DateTimeFormat` options.
 *
 * @param {Date} date Absolute instant.
 * @param {string} timeZone IANA timezone to render in.
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatInTimeZone(date, timeZone, options = {}) {
  return new Intl.DateTimeFormat('en-US', { timeZone, ...options }).format(date);
}

/**
 * Format just the time portion of an instant in a timezone, e.g. "8:00 AM".
 *
 * @param {Date} date Absolute instant.
 * @param {string} timeZone IANA timezone.
 * @returns {string}
 */
export function formatTimeLabel(date, timeZone) {
  return formatInTimeZone(date, timeZone, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Return the `YYYY-MM-DD` calendar date of an instant as seen in a timezone.
 *
 * @param {Date} date Absolute instant.
 * @param {string} timeZone IANA timezone.
 * @returns {string}
 */
export function formatDateKey(date, timeZone) {
  const map = {};
  for (const part of new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return `${map.year}-${map.month}-${map.day}`;
}

/**
 * Parse a display time label like "10:00 AM" or "2:30 PM" into 24-hour components.
 *
 * @param {string} label
 * @returns {{hour24:number, minute:number}}
 */
export function parseTimeLabel(label) {
  const match = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec(String(label).trim());
  if (!match) {
    throw new Error(`Invalid time label: "${label}"`);
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const isPM = match[3].toUpperCase() === 'PM';

  if (isPM && hour !== 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;

  return { hour24: hour, minute };
}

/**
 * Human-friendly label for a timezone, e.g. "Central Time". Falls back to the long
 * generic name from `Intl` (e.g. "Pacific Standard Time"), then to the bare zone name.
 *
 * @param {string} timeZone IANA timezone.
 * @param {Date} [date] Instant used to resolve standard vs daylight naming.
 * @returns {string}
 */
export function friendlyZoneName(timeZone, date = new Date()) {
  if (FRIENDLY_ZONE_NAMES[timeZone]) return FRIENDLY_ZONE_NAMES[timeZone];

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'long',
    }).formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    if (tzPart) return tzPart.value;
  } catch {
    // Unknown zone — fall through.
  }

  return String(timeZone).replace(/^.*\//, '').replace(/_/g, ' ');
}

/**
 * Whether a string is a valid IANA timezone that `Intl` accepts. Used to validate
 * client-supplied timezones before trusting them.
 *
 * @param {unknown} timeZone
 * @returns {boolean}
 */
export function isValidTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}
