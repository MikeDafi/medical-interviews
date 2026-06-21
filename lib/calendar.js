/**
 * Helpers for interpreting Google Calendar events when computing availability.
 */

/**
 * Whether the calendar owner's response to an event means it should NOT block availability.
 *
 * When listing events on a calendar, the owner's own attendee entry is marked `self: true`.
 * If the owner has `declined` (or, by default, `tentative`), they are not committed to that
 * time, so the event must not subtract from bookable availability. Events with no attendees
 * (personal holds / owner-created blocks) still block.
 *
 * @param {object} event A Google Calendar event resource.
 * @param {{tentativeIsFree?: boolean}} [options]
 *   `tentativeIsFree` (default true): treat a 'tentative' response as non-blocking too.
 * @returns {boolean} True if the event should be treated as free (non-blocking).
 */
export function isOwnerUnavailableResponse(event, { tentativeIsFree = true } = {}) {
  const attendees = (event && event.attendees) || [];
  const self = attendees.find((a) => a && a.self);
  if (!self) return false;
  if (self.responseStatus === 'declined') return true;
  if (tentativeIsFree && self.responseStatus === 'tentative') return true;
  return false;
}
