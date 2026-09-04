/**
 * useRecentBookings Hook Tests (pure logic)
 *
 * Regression coverage for a bug where the "recent bookings" social-proof widgets visibly shrank
 * down to just 1 person whenever the real API returned fewer than 5 recent purchases (e.g. only
 * 1 purchase in the last 7 days) — the global store replaced the initial fallback list wholesale
 * instead of padding it. `padBookingsForDisplay` is the extracted, pure fix for that.
 */
import { describe, it, expect } from 'vitest';
import { padBookingsForDisplay } from '../../src/hooks/useRecentBookings';

function makeReal(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `cs_test_real_${i}`,
    first_name: `R${i}.`,
    package_name: 'Trial Session',
    created_at: new Date(Date.now() - i * 60000).toISOString()
  }));
}

describe('padBookingsForDisplay', () => {
  it('pads a single real booking up to 5 total entries', () => {
    const real = makeReal(1);
    const result = padBookingsForDisplay(real);

    expect(result.length).toBe(5);
    // The real booking is preserved, not dropped/replaced.
    expect(result).toContainEqual(real[0]);
  });

  it('pads a couple of real bookings up to 5 total entries', () => {
    const real = makeReal(2);
    const result = padBookingsForDisplay(real);

    expect(result.length).toBe(5);
    real.forEach(r => expect(result).toContainEqual(r));
  });

  it('does not pad when there are already enough real bookings', () => {
    const real = makeReal(5);
    const result = padBookingsForDisplay(real);

    expect(result).toEqual(real);
  });

  it('does not truncate when there are more real bookings than the minimum', () => {
    const real = makeReal(7);
    const result = padBookingsForDisplay(real);

    expect(result).toEqual(real);
    expect(result.length).toBe(7);
  });

  it('pads entirely with fallbacks when there are zero real bookings', () => {
    const result = padBookingsForDisplay([]);

    expect(result.length).toBe(5);
    result.forEach(r => expect(r.id).toMatch(/^fallback-/));
  });

  it('respects a custom minCount', () => {
    const real = makeReal(1);
    const result = padBookingsForDisplay(real, 3);

    expect(result.length).toBe(3);
  });
});
