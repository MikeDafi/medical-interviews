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

/**
 * Canonical category → display label, used to clearly state which *service* a booking or email
 * is for (as distinct from PACKAGE_NAMES, which names the specific tier/duration purchased).
 */
export const CATEGORY_LABELS = {
  interview: 'Interview Prep',
  cv: 'CV Advice',
  advisory: 'Advisory Check-In',
};

/**
 * Resolve a human-friendly service label from a purchase/booking's category, falling back to a
 * generic label for missing/unrecognized categories (e.g. bookings created before this field
 * existed).
 *
 * @param {string} [category]
 * @returns {string}
 */
export function getCategoryLabel(category) {
  return CATEGORY_LABELS[category] || 'Session';
}

/**
 * The set of categories a client can actually book a live session for. `advisory_email` (the
 * email-only advisory tier) has duration_minutes: 0 and is intentionally excluded - there is
 * nothing to book for it.
 */
export const BOOKABLE_CATEGORIES = ['interview', 'cv', 'advisory'];

/**
 * Which session durations (in minutes) exist per category, driving the combined
 * service+duration option list on the booking page. Must stay in sync with the package
 * definitions in api/stripe/create-checkout.js and api/admin/index.js's admin-added sessions.
 */
export const CATEGORY_DURATIONS = {
  interview: [30, 60],
  cv: [30, 60],
  // advisory_checkin/advisory_full are both 30-min monthly sessions; advisory_email (0 min) is
  // excluded here since it's not bookable at all - see BOOKABLE_CATEGORIES above.
  advisory: [30],
};

/**
 * Build the full ordered list of bookable service+duration options (e.g. for rendering the
 * combined selector), independent of what the client actually has credits for - callers filter/
 * disable individual options using their own credit-availability check.
 *
 * @returns {{ category: string, duration: number, label: string }[]}
 */
export function getBookableServiceOptions() {
  return BOOKABLE_CATEGORIES.flatMap((category) =>
    (CATEGORY_DURATIONS[category] || []).map((duration) => ({
      category,
      duration,
      label: `${getCategoryLabel(category)} – ${duration} min`,
    }))
  );
}

/**
 * Real, purchasable package definitions an admin can manually grant to a client, mirroring the
 * exact catalog in api/stripe/create-checkout.js's PACKAGES (sessions/duration_minutes/category
 * only - price/description/mode/interval are Stripe-checkout-specific and not relevant to a
 * manual grant). `advisory_email` is intentionally excluded: it's 0 sessions/0 duration
 * (email-only, nothing to "add sessions" for).
 *
 * Used by the admin "Add Sessions" form (AdminUser.jsx) and its API handler
 * (api/admin/index.js) so an admin can grant a real, correctly-labeled package (e.g. "Package of
 * 3 (Interview)", "CV Package of 5") instead of only a generic duration-based credit with no
 * category, which always defaulted to 'interview' and showed a generic "60-Min Session (Admin)"
 * label regardless of what was actually granted.
 */
export const ADMIN_GRANTABLE_PACKAGES = {
  trial: { sessions: 1, duration_minutes: 30, category: 'interview' },
  single: { sessions: 1, duration_minutes: 60, category: 'interview' },
  package3: { sessions: 3, duration_minutes: 60, category: 'interview' },
  package5: { sessions: 5, duration_minutes: 60, category: 'interview' },
  cv_trial: { sessions: 1, duration_minutes: 30, category: 'cv' },
  cv_single: { sessions: 1, duration_minutes: 60, category: 'cv' },
  cv_package3: { sessions: 3, duration_minutes: 60, category: 'cv' },
  cv_package5: { sessions: 5, duration_minutes: 60, category: 'cv' },
  advisory_checkin: { sessions: 1, duration_minutes: 30, category: 'advisory' },
  advisory_full: { sessions: 1, duration_minutes: 30, category: 'advisory' },
};

/**
 * Build the ordered list of admin-grantable packages (e.g. for rendering the admin's package
 * picker, grouped by category).
 *
 * @returns {{ packageId: string, category: string, sessions: number, duration_minutes: number, label: string }[]}
 */
export function getAdminGrantablePackages() {
  return Object.entries(ADMIN_GRANTABLE_PACKAGES).map(([packageId, def]) => ({
    packageId,
    ...def,
    label: getPackageName(packageId),
  }));
}
