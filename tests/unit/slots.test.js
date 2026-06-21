/**
 * Unit Tests: slot label helpers (lib/slots.js)
 */

import { describe, it, expect } from 'vitest';
import { formatSlotLabel, nextSlotLabel, slotsForBooking } from '../../lib/slots.js';

describe('formatSlotLabel', () => {
  it('formats morning times without a leading zero on the hour', () => {
    expect(formatSlotLabel(9, 0)).toBe('9:00 AM');
    expect(formatSlotLabel(9, 30)).toBe('9:30 AM');
  });

  it('formats noon and afternoon times', () => {
    expect(formatSlotLabel(12, 0)).toBe('12:00 PM');
    expect(formatSlotLabel(13, 30)).toBe('1:30 PM');
    expect(formatSlotLabel(23, 30)).toBe('11:30 PM');
  });

  it('formats midnight as 12 AM', () => {
    expect(formatSlotLabel(0, 0)).toBe('12:00 AM');
  });

  it('uses a plain ASCII space (not a narrow no-break space)', () => {
    const label = formatSlotLabel(10, 0);
    expect(label).toBe('10:00 AM');
    expect(label.charCodeAt(label.indexOf(' '))).toBe(32); // U+0020
  });
});

describe('nextSlotLabel', () => {
  it('advances within the same hour', () => {
    expect(nextSlotLabel('10:00 AM')).toBe('10:30 AM');
  });

  it('rolls over to the next hour', () => {
    expect(nextSlotLabel('10:30 AM')).toBe('11:00 AM');
  });

  it('crosses the AM/PM boundary at noon', () => {
    expect(nextSlotLabel('11:30 AM')).toBe('12:00 PM');
    expect(nextSlotLabel('12:30 PM')).toBe('1:00 PM');
  });

  it('supports a custom step', () => {
    expect(nextSlotLabel('10:00 AM', 60)).toBe('11:00 AM');
  });
});

describe('slotsForBooking', () => {
  it('returns a single slot for a 30-minute session', () => {
    expect(slotsForBooking('10:00 AM', 30)).toEqual(['10:00 AM']);
  });

  it('returns two consecutive slots for a 60-minute session', () => {
    expect(slotsForBooking('10:00 AM', 60)).toEqual(['10:00 AM', '10:30 AM']);
  });

  it('handles a 60-minute session that rolls past the hour', () => {
    expect(slotsForBooking('10:30 AM', 60)).toEqual(['10:30 AM', '11:00 AM']);
  });

  it('handles a 60-minute session across noon', () => {
    expect(slotsForBooking('11:30 AM', 60)).toEqual(['11:30 AM', '12:00 PM']);
  });
});
