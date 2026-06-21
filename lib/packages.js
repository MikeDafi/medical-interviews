/**
 * Canonical package id → display name mapping, shared across the API and frontend.
 */

export const PACKAGE_NAMES = {
  // Interview packages
  trial: '30 Min Trial Session',
  single: '1 Hour Session',
  package3: 'Package of 3 (Interview)',
  package5: 'Package of 5 (Interview)',
  // CV packages
  cv_trial: '30 Min Strategy Snapshot',
  cv_single: '1 Hour CV Review',
  cv_package3: 'CV Package of 3',
  cv_package5: 'CV Package of 5',
  // Advisory subscriptions
  advisory_email: 'Email-Only Advisory',
  advisory_checkin: 'Monthly Check-In',
  advisory_full: 'Email + Monthly Advisory',
};

/**
 * Resolve a human-friendly package name from its id, falling back to a legacy `type` and
 * finally a generic label.
 *
 * @param {string} [packageId]
 * @param {string} [type] Legacy package type (e.g. 'trial', 'single').
 * @returns {string}
 */
export function getPackageName(packageId, type) {
  return PACKAGE_NAMES[packageId] || PACKAGE_NAMES[type] || 'Session';
}
