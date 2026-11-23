import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  insert: vi.fn(),
  query: vi.fn(),
  connect: vi.fn(),
  clientQuery: vi.fn(),
  release: vi.fn(),
  auth: vi.fn(),
  customerEmail: vi.fn(),
  adminEmail: vi.fn(),
}));

vi.mock('../../api/_lib/env.js', () => ({}));
vi.mock('@vercel/postgres', () => ({ sql: Object.assign(mocks.query, { connect: mocks.connect }) }));
vi.mock('googleapis', () => ({
  google: {
    auth: { GoogleAuth: vi.fn(function () {}) },
    calendar: () => ({ events: { list: mocks.list, insert: mocks.insert } }),
  },
}));
vi.mock('../../api/_lib/auth.js', () => ({ rateLimit: () => ({ allowed: true }) }));
vi.mock('../../api/_lib/session.js', () => ({ requireAuth: mocks.auth }));
vi.mock('../../api/_lib/email.js', () => ({
  sendCustomerBookingEmail: mocks.customerEmail,
  sendAdminBookingEmail: mocks.adminEmail,
  sendCustomerCancellationEmail: vi.fn(),
  sendAdminCancellationEmail: vi.fn(),
  sendErrorAlertEmail: vi.fn().mockResolvedValue({ success: true }),
}));

function response() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn();
  return res;
}

function request(action, body) {
  return { headers: {}, method: body ? 'POST' : 'GET', query: { action }, body };
}

function booking(date = '2026-11-18', time = '10:00 AM') {
  return { date, time, duration: 60, category: 'interview', interviewLevel: 'beginner', interviewStyle: 'MMI' };
}

function event(summary, start, end) {
  return { summary, start: { dateTime: start }, end: { dateTime: end } };
}

let handler;

beforeEach(async () => {
  vi.resetAllMocks();
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-17T18:00:00Z'));
  vi.stubEnv('BUSINESS_TIMEZONE', 'America/Chicago');
  vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_KEY', Buffer.from('{}').toString('base64'));
  vi.stubEnv('GOOGLE_CALENDAR_IDS', 'ashley@example.test');
  vi.stubEnv('GOOGLE_BOOKINGS_CALENDAR_ID', 'bookings@example.test');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.list.mockResolvedValue({ data: { items: [] } });
  mocks.insert.mockResolvedValue({ data: { id: 'calendar-event', htmlLink: 'https://calendar.google.com/event' } });
  mocks.auth.mockResolvedValue({ authenticated: true, user: { googleId: 'customer-id', email: 'customer@example.test', name: 'Customer' } });
  mocks.connect.mockResolvedValue({ sql: mocks.clientQuery, release: mocks.release });
  mocks.query.mockResolvedValue({ rows: [] });
  mocks.clientQuery.mockImplementation(async (strings) => ({
    rows: strings.join('').includes('SELECT id, purchases') ? [{
      id: 123,
      purchases: [{ package_id: 'package3', category: 'interview', duration_minutes: 60, sessions_total: 3, sessions_used: 0, status: 'active', bookings: [] }],
      target_schools: [], cv_files: [],
    }] : [],
  }));
  mocks.customerEmail.mockResolvedValue({ success: true, id: 'customer-email' });
  mocks.adminEmail.mockResolvedValue({ success: true, id: 'admin-email' });
  handler = (await import('../../api/calendar/index.js')).default;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function availability() {
  const res = response();
  await handler(request('preload'), res);
  expect(res.status).toHaveBeenCalledWith(200);
  return res.json.mock.calls[0][0].availability;
}

describe('weekday latest start time', () => {
  it('keeps 5 PM available and removes later starts', async () => {
    const slots = (await availability())['2026-11-18'].availableSlots;
    expect(slots).toContain('10:00 AM');
    expect(slots.at(-1)).toBe('5:00 PM');
    expect(slots).not.toContain('5:30 PM');
    expect(slots).not.toContain('6:00 PM');
  });

  it('does not let an explicit free event reopen starts after 5 PM', async () => {
    mocks.list.mockResolvedValue({ data: { items: [event('Ash is free', '2026-11-18T17:30:00-06:00', '2026-11-18T19:00:00-06:00')] } });
    const slots = (await availability())['2026-11-18'].availableSlots;
    expect(slots.at(-1)).toBe('5:00 PM');
  });

  it.each(['5:30 PM', '6:00 PM'])('rejects a direct booking at %s before consuming a credit', async (time) => {
    const res = response();
    await handler(request('book', { ...booking('2026-11-18', time), duration: 30 }), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SLOT_UNAVAILABLE' }));
    expect(mocks.connect).not.toHaveBeenCalled();
    expect(mocks.customerEmail).not.toHaveBeenCalled();
  });
});

describe('weekend availability', () => {
  it('closes Saturday and Sunday by default while keeping weekday hours', async () => {
    const days = await availability();
    expect(days['2026-11-21'].availableSlots).toEqual([]);
    expect(days['2026-11-22'].availableSlots).toEqual([]);
    expect(days['2026-11-18'].availableSlots).toContain('10:00 AM');
  });

  it('opens only complete slots inside an explicit Ash is free window', async () => {
    mocks.list.mockImplementation(async ({ calendarId }) => ({ data: { items: calendarId === 'ashley@example.test' ? [
      event('Ash is free', '2026-11-21T12:15:00-06:00', '2026-11-21T13:15:00-06:00'),
      event('Class', '2026-11-21T12:00:00-06:00', '2026-11-21T15:00:00-06:00'),
    ] : [] } }));
    expect((await availability())['2026-11-21'].availableSlots).toEqual(['12:30 PM']);
  });

  it('does not open a weekend merely because a calendar event is transparent', async () => {
    mocks.list.mockResolvedValue({ data: { items: [{ ...event('Day off', '2026-11-21T12:00:00-06:00', '2026-11-21T15:00:00-06:00'), transparency: 'transparent' }] } });
    expect((await availability())['2026-11-21'].availableSlots).toEqual([]);
  });

  it('supports an all-day Ashley is free event with an exclusive end date', async () => {
    mocks.list.mockResolvedValue({ data: { items: [{ summary: 'Ashley is free', start: { date: '2026-11-22' }, end: { date: '2026-11-23' } }] } });
    const days = await availability();
    expect(days['2026-11-21'].availableSlots).toEqual([]);
    expect(days['2026-11-22'].availableSlots).toEqual(['12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM']);
  });

  it.each(['Existing customer', 'Ash is free'])('keeps existing sessions blocked, including a customer named %s', async (customerName) => {
    mocks.list.mockImplementation(async ({ calendarId }) => ({ data: { items: calendarId === 'ashley@example.test'
      ? [event('Ash is free', '2026-11-21T12:00:00-06:00', '2026-11-21T15:00:00-06:00')]
      : [event(`Interview Prep (1 hour) - ${customerName}`, '2026-11-21T12:30:00-06:00', '2026-11-21T13:30:00-06:00')] } }));
    expect((await availability())['2026-11-21'].availableSlots).toEqual(['12:00 PM', '1:30 PM', '2:00 PM']);
  });

  it('rejects a direct weekend booking without consuming a credit', async () => {
    const res = response();
    await handler(request('book', booking('2026-11-21', '12:00 PM')), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SLOT_UNAVAILABLE' }));
    expect(mocks.connect).not.toHaveBeenCalled();
    expect(mocks.customerEmail).not.toHaveBeenCalled();
  });

  it('rejects an hour-long booking that would extend beyond the free window', async () => {
    mocks.list.mockResolvedValue({ data: { items: [event('Ash is free', '2026-11-21T12:00:00-06:00', '2026-11-21T12:30:00-06:00')] } });
    const res = response();
    await handler(request('book', booking('2026-11-21', '12:00 PM')), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it('uses Chicago daylight-saving offsets for summer weekend windows', async () => {
    vi.setSystemTime(new Date('2026-06-12T18:00:00Z'));
    mocks.list.mockResolvedValue({ data: { items: [event('Ash is free', '2026-06-13T12:30:00-05:00', '2026-06-13T13:30:00-05:00')] } });
    expect((await availability())['2026-06-13'].availableSlots).toEqual(['12:30 PM', '1:00 PM']);
  });
});

describe('booking confirmation email lifecycle', () => {
  it('keeps the request open until both sends settle, after releasing the credit lock', async () => {
    let finishCustomer, finishAdmin;
    mocks.customerEmail.mockReturnValue(new Promise(resolve => { finishCustomer = resolve; }));
    mocks.adminEmail.mockReturnValue(new Promise(resolve => { finishAdmin = resolve; }));
    const res = response();
    const pending = handler(request('book', booking()), res);
    await vi.waitFor(() => expect(mocks.adminEmail).toHaveBeenCalledOnce());
    expect(mocks.release).toHaveBeenCalledOnce();
    expect(res.json).not.toHaveBeenCalled();
    finishCustomer({ success: true, id: 'customer-email' });
    await Promise.resolve();
    expect(res.json).not.toHaveBeenCalled();
    finishAdmin({ success: true, id: 'admin-email' });
    await pending;
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, confirmationEmailSent: true }));
  });

  it('keeps the booking confirmed and reports a rejected customer send', async () => {
    mocks.customerEmail.mockResolvedValue({ success: false, error: 'Provider rejected sender' });
    const res = response();
    await handler(request('book', booking()), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, confirmationEmailSent: false, booking: expect.objectContaining({ status: 'confirmed' }) }));
    expect(mocks.clientQuery.mock.calls.some(([strings]) => strings.join('') === 'COMMIT')).toBe(true);
    expect(mocks.adminEmail).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalledWith('Booking email failed:', expect.objectContaining({ recipient: 'customer' }));
  });

  it('handles a thrown customer-send error without turning the saved booking into a failure', async () => {
    mocks.customerEmail.mockRejectedValue(new Error('Network failure'));
    const res = response();
    await handler(request('book', booking()), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ confirmationEmailSent: false }));
    expect(mocks.adminEmail).toHaveBeenCalledOnce();
  });

  it('does not mark a successful customer email as failed when the admin email fails', async () => {
    mocks.adminEmail.mockRejectedValue(new Error('Admin send failed'));
    const res = response();
    await handler(request('book', booking()), res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, confirmationEmailSent: true }));
  });
});
