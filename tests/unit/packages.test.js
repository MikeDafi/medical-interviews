/**
 * lib/packages.js Tests
 *
 * Covers getCategoryLabel(), the service-category label used by booking records, confirmation
 * emails, and the client/admin booking displays to clearly state which service was purchased
 * (e.g. CV Advice vs Interview Prep vs Advisory Check-In), instead of only ever showing duration.
 */
import { describe, it, expect } from 'vitest';
import { getCategoryLabel, getBookableServiceOptions, CATEGORY_DURATIONS, BOOKABLE_CATEGORIES, getAdminGrantablePackages, ADMIN_GRANTABLE_PACKAGES } from '../../lib/packages.js';

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

describe('getBookableServiceOptions', () => {
  it('returns one option per category+duration combination', () => {
    const options = getBookableServiceOptions();

    expect(options).toContainEqual({ category: 'interview', duration: 30, label: 'Interview Prep – 30 min' });
    expect(options).toContainEqual({ category: 'interview', duration: 60, label: 'Interview Prep – 60 min' });
    expect(options).toContainEqual({ category: 'cv', duration: 30, label: 'CV Advice – 30 min' });
    expect(options).toContainEqual({ category: 'cv', duration: 60, label: 'CV Advice – 60 min' });
    expect(options).toContainEqual({ category: 'advisory', duration: 30, label: 'Advisory Check-In – 30 min' });
  });

  it('excludes advisory_email (the 0-min, not-bookable email-only tier)', () => {
    const options = getBookableServiceOptions();
    const advisoryOptions = options.filter(o => o.category === 'advisory');

    expect(advisoryOptions).toHaveLength(1);
    expect(advisoryOptions[0].duration).toBe(30);
  });

  it('matches CATEGORY_DURATIONS exactly', () => {
    const options = getBookableServiceOptions();
    const totalExpected = BOOKABLE_CATEGORIES.reduce((sum, c) => sum + CATEGORY_DURATIONS[c].length, 0);

    expect(options).toHaveLength(totalExpected);
  });
});

describe('getAdminGrantablePackages', () => {
  it('returns one entry per ADMIN_GRANTABLE_PACKAGES key with a resolved label', () => {
    const options = getAdminGrantablePackages();

    expect(options).toHaveLength(Object.keys(ADMIN_GRANTABLE_PACKAGES).length);
    for (const opt of options) {
      expect(opt.packageId).toBeTruthy();
      expect(opt.label).toBeTruthy();
      expect(ADMIN_GRANTABLE_PACKAGES[opt.packageId]).toBeDefined();
      expect(opt.sessions).toBe(ADMIN_GRANTABLE_PACKAGES[opt.packageId].sessions);
      expect(opt.duration_minutes).toBe(ADMIN_GRANTABLE_PACKAGES[opt.packageId].duration_minutes);
      expect(opt.category).toBe(ADMIN_GRANTABLE_PACKAGES[opt.packageId].category);
    }
  });

  it('excludes advisory_email (0-session, not grantable as "sessions")', () => {
    const options = getAdminGrantablePackages();

    expect(options.some(o => o.packageId === 'advisory_email')).toBe(false);
  });

  it('includes real package ids across all three categories', () => {
    const options = getAdminGrantablePackages();
    const byCategory = options.reduce((acc, o) => {
      acc[o.category] = (acc[o.category] || 0) + 1;
      return acc;
    }, {});

    expect(byCategory.interview).toBeGreaterThan(0);
    expect(byCategory.cv).toBeGreaterThan(0);
    expect(byCategory.advisory).toBeGreaterThan(0);
  });
});
