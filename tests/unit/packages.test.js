/**
 * lib/packages.js Tests
 *
 * Covers getCategoryLabel(), the service-category label used by booking records, confirmation
 * emails, and the client/admin booking displays to clearly state which service was purchased
 * (e.g. CV Advice vs Interview Prep vs Advisory Check-In), instead of only ever showing duration.
 */
import { describe, it, expect } from 'vitest';
import { getCategoryLabel } from '../../lib/packages.js';

describe('getCategoryLabel', () => {
  it('maps interview to Interview Prep', () => {
    expect(getCategoryLabel('interview')).toBe('Interview Prep');
  });

  it('maps cv to CV Advice', () => {
    expect(getCategoryLabel('cv')).toBe('CV Advice');
  });

  it('maps advisory to Advisory Check-In', () => {
    expect(getCategoryLabel('advisory')).toBe('Advisory Check-In');
  });

  it('falls back to a generic label for missing/unrecognized categories', () => {
    expect(getCategoryLabel(undefined)).toBe('Session');
    expect(getCategoryLabel(null)).toBe('Session');
    expect(getCategoryLabel('something-unexpected')).toBe('Session');
  });
});
