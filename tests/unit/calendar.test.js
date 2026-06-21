/**
 * Unit Tests: calendar event availability helpers (lib/calendar.js)
 */

import { describe, it, expect } from 'vitest';
import { isOwnerUnavailableResponse } from '../../lib/calendar.js';

describe('isOwnerUnavailableResponse', () => {
  it('returns true when the owner (self) declined', () => {
    const event = { attendees: [{ self: true, responseStatus: 'declined' }] };
    expect(isOwnerUnavailableResponse(event)).toBe(true);
  });

  it('returns true when the owner (self) is tentative (default)', () => {
    const event = { attendees: [{ self: true, responseStatus: 'tentative' }] };
    expect(isOwnerUnavailableResponse(event)).toBe(true);
  });

  it('respects tentativeIsFree: false (tentative blocks)', () => {
    const event = { attendees: [{ self: true, responseStatus: 'tentative' }] };
    expect(isOwnerUnavailableResponse(event, { tentativeIsFree: false })).toBe(false);
  });

  it('returns false when the owner accepted', () => {
    const event = { attendees: [{ self: true, responseStatus: 'accepted' }] };
    expect(isOwnerUnavailableResponse(event)).toBe(false);
  });

  it('returns false when the owner needsAction', () => {
    const event = { attendees: [{ self: true, responseStatus: 'needsAction' }] };
    expect(isOwnerUnavailableResponse(event)).toBe(false);
  });

  it('returns false when there are no attendees (personal/owner-created block)', () => {
    expect(isOwnerUnavailableResponse({})).toBe(false);
    expect(isOwnerUnavailableResponse({ attendees: [] })).toBe(false);
  });

  it('returns false when no attendee is marked self even if another declined', () => {
    const event = {
      attendees: [
        { email: 'someone@else.com', responseStatus: 'declined' },
        { email: 'guest@x.com', responseStatus: 'accepted' },
      ],
    };
    expect(isOwnerUnavailableResponse(event)).toBe(false);
  });

  it('handles null/undefined event safely', () => {
    expect(isOwnerUnavailableResponse(null)).toBe(false);
    expect(isOwnerUnavailableResponse(undefined)).toBe(false);
  });
});
