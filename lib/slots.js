/**
 * Helpers for the booking slot labels (e.g. "10:00 AM", "2:30 PM").
 *
 * The label format is the single source of truth shared by slot generation (server),
 * availability validation (server), and contiguity checks. It deliberately mirrors the exact
 * string the calendar produces — a plain ASCII space and a non-zero-padded 12-hour value — so
 * labels compare with strict equality against the generated `availableSlots`.
 *
 * NOTE: do NOT format these labels via `Intl.DateTimeFormat`; modern ICU inserts a narrow
 * no-break space (U+202F) before AM/PM, which would not match the generated slot strings.
 */

import { parseTimeLabel } from './timezone.js';

/**
 * Format a 24-hour time into the canonical slot label, e.g. (10, 0) -> "10:00 AM".
 *
 * @param {number} hour24 Hour in 24-hour form (0-23).
 * @param {number} minute Minute (0-59).
 * @returns {string}
 */
export function formatSlotLabel(hour24, minute) {
  const displayHour = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  return `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`;
}

/**
 * Given a slot label, return the label `stepMinutes` later, e.g. "10:30 AM" -> "11:00 AM".
 *
 * @param {string} label A slot label such as "10:00 AM".
 * @param {number} [stepMinutes] Minutes to advance (default 30).
 * @returns {string}
 */
export function nextSlotLabel(label, stepMinutes = 30) {
  const { hour24, minute } = parseTimeLabel(label);
  const total = hour24 * 60 + minute + stepMinutes;
  const nextHour24 = Math.floor(total / 60) % 24;
  const nextMinute = total % 60;
  return formatSlotLabel(nextHour24, nextMinute);
}

/**
 * Return all slot labels a booking occupies, starting at `startLabel`, for the given duration.
 * A 30-minute session occupies one slot; a 60-minute session occupies two consecutive slots.
 *
 * @param {string} startLabel Starting slot label, e.g. "10:00 AM".
 * @param {number} durationMinutes Session length in minutes.
 * @param {number} [slotMinutes] Slot granularity (default 30).
 * @returns {string[]}
 */
export function slotsForBooking(startLabel, durationMinutes, slotMinutes = 30) {
  const count = Math.ceil(durationMinutes / slotMinutes);
  const labels = [startLabel];
  for (let i = 1; i < count; i++) {
    labels.push(nextSlotLabel(labels[i - 1], slotMinutes));
  }
  return labels;
}
