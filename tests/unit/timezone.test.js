/**
 * Unit Tests: DST-aware timezone helpers (lib/timezone.js)
 *
 * Pure functions, no server or network needed.
 */

import { describe, it, expect } from 'vitest';
import {
  getOffsetMinutes,
  zonedWallClockToUtc,
  formatInTimeZone,
  formatTimeLabel,
  formatDateKey,
  parseTimeLabel,
  friendlyZoneName,
  isValidTimeZone,
} from '../../lib/timezone.js';

describe('getOffsetMinutes', () => {
  it('returns CDT (-300) for America/Chicago in summer', () => {
    // June 20, 2026 — Daylight Saving in effect.
    const summer = new Date('2026-06-20T17:00:00Z');
    expect(getOffsetMinutes('America/Chicago', summer)).toBe(-300);
  });

  it('returns CST (-360) for America/Chicago in winter', () => {
    // January 20, 2026 — Standard time.
    const winter = new Date('2026-01-20T17:00:00Z');
    expect(getOffsetMinutes('America/Chicago', winter)).toBe(-360);
  });

  it('returns PDT (-420) for America/Los_Angeles in summer', () => {
    const summer = new Date('2026-06-20T17:00:00Z');
    expect(getOffsetMinutes('America/Los_Angeles', summer)).toBe(-420);
  });

  it('returns 0 for UTC', () => {
    expect(getOffsetMinutes('UTC', new Date('2026-06-20T12:00:00Z'))).toBe(0);
  });
});

describe('zonedWallClockToUtc', () => {
  it('maps 10:00 AM Central (CDT/summer) to 15:00 UTC', () => {
    const instant = zonedWallClockToUtc(
      { year: 2026, month: 6, day: 20, hour: 10, minute: 0 },
      'America/Chicago'
    );
    expect(instant.toISOString()).toBe('2026-06-20T15:00:00.000Z');
  });

  it('maps 10:00 AM Central (CST/winter) to 16:00 UTC', () => {
    const instant = zonedWallClockToUtc(
      { year: 2026, month: 1, day: 20, hour: 10, minute: 0 },
      'America/Chicago'
    );
    expect(instant.toISOString()).toBe('2026-01-20T16:00:00.000Z');
  });

  it('maps midnight Central (all-day start, summer) correctly', () => {
    const instant = zonedWallClockToUtc(
      { year: 2026, month: 6, day: 20, hour: 0, minute: 0 },
      'America/Chicago'
    );
    expect(instant.toISOString()).toBe('2026-06-20T05:00:00.000Z');
  });

  it('maps noon Central correctly (winter)', () => {
    const instant = zonedWallClockToUtc(
      { year: 2026, month: 1, day: 20, hour: 12, minute: 0 },
      'America/Chicago'
    );
    expect(instant.toISOString()).toBe('2026-01-20T18:00:00.000Z');
  });

  it('round-trips: wall clock -> instant -> same wall clock', () => {
    const instant = zonedWallClockToUtc(
      { year: 2026, month: 7, day: 4, hour: 14, minute: 30 },
      'America/Chicago'
    );
    expect(formatTimeLabel(instant, 'America/Chicago')).toBe('2:30 PM');
  });
});

describe('cross-zone conversion (Central wall clock viewed elsewhere)', () => {
  it('10:00 AM Central shows as 8:00 AM Pacific in summer', () => {
    const instant = zonedWallClockToUtc(
      { year: 2026, month: 6, day: 20, hour: 10, minute: 0 },
      'America/Chicago'
    );
    expect(formatTimeLabel(instant, 'America/Los_Angeles')).toBe('8:00 AM');
  });

  it('10:00 AM Central shows as 11:00 AM Eastern in summer', () => {
    const instant = zonedWallClockToUtc(
      { year: 2026, month: 6, day: 20, hour: 10, minute: 0 },
      'America/Chicago'
    );
    expect(formatTimeLabel(instant, 'America/New_York')).toBe('11:00 AM');
  });

  it('10:00 AM Central shows as 8:00 AM Pacific in winter too (both shift)', () => {
    const instant = zonedWallClockToUtc(
      { year: 2026, month: 1, day: 20, hour: 10, minute: 0 },
      'America/Chicago'
    );
    expect(formatTimeLabel(instant, 'America/Los_Angeles')).toBe('8:00 AM');
  });
});

describe('formatDateKey', () => {
  it('returns the local calendar date in the given zone', () => {
    // 03:00 UTC is still the previous day in Central.
    const instant = new Date('2026-06-20T03:00:00Z');
    expect(formatDateKey(instant, 'America/Chicago')).toBe('2026-06-19');
    expect(formatDateKey(instant, 'UTC')).toBe('2026-06-20');
  });
});

describe('formatInTimeZone', () => {
  it('formats with custom options', () => {
    const instant = zonedWallClockToUtc(
      { year: 2026, month: 6, day: 20, hour: 10, minute: 0 },
      'America/Chicago'
    );
    const out = formatInTimeZone(instant, 'America/Chicago', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    expect(out).toBe('10:00 AM');
  });
});

describe('parseTimeLabel', () => {
  it('parses AM times', () => {
    expect(parseTimeLabel('10:00 AM')).toEqual({ hour24: 10, minute: 0 });
  });

  it('parses PM times', () => {
    expect(parseTimeLabel('2:30 PM')).toEqual({ hour24: 14, minute: 30 });
  });

  it('parses 12 AM as midnight', () => {
    expect(parseTimeLabel('12:00 AM')).toEqual({ hour24: 0, minute: 0 });
  });

  it('parses 12 PM as noon', () => {
    expect(parseTimeLabel('12:00 PM')).toEqual({ hour24: 12, minute: 0 });
  });

  it('is case-insensitive and tolerant of spacing', () => {
    expect(parseTimeLabel('9:15pm')).toEqual({ hour24: 21, minute: 15 });
  });

  it('throws on invalid input', () => {
    expect(() => parseTimeLabel('not a time')).toThrow();
  });
});

describe('friendlyZoneName', () => {
  it('maps known zones to friendly names', () => {
    expect(friendlyZoneName('America/Chicago')).toBe('Central Time');
    expect(friendlyZoneName('America/Los_Angeles')).toBe('Pacific Time');
    expect(friendlyZoneName('America/New_York')).toBe('Eastern Time');
  });

  it('falls back to a readable name for unknown zones', () => {
    const name = friendlyZoneName('Europe/Paris');
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });
});

describe('isValidTimeZone', () => {
  it('accepts valid IANA zones', () => {
    expect(isValidTimeZone('America/Chicago')).toBe(true);
    expect(isValidTimeZone('America/Los_Angeles')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
  });

  it('rejects invalid or empty input', () => {
    expect(isValidTimeZone('Not/AZone')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone(null)).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
    expect(isValidTimeZone(123)).toBe(false);
  });
});
