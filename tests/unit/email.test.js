/**
 * api/_lib/email.js escapeHtml() Tests
 *
 * Regression coverage for a security fix: user-controlled values (Google display name, profile
 * fields, school names, uploaded filenames) were being interpolated into the admin
 * booking/cancellation HTML email templates without any HTML-escaping, letting a client inject
 * arbitrary markup/script into emails delivered to the admin's inbox. escapeHtml() is now applied
 * to every such value before HTML interpolation (see sendAdminBookingEmail/
 * sendAdminCancellationEmail in api/_lib/email.js).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { escapeHtml, sendErrorAlertEmail } from '../../api/_lib/email.js';

describe('escapeHtml', () => {
  it('escapes angle brackets so a script tag cannot be reconstructed', () => {
    const result = escapeHtml('<script>alert("evil")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toBe('&lt;script&gt;alert(&quot;evil&quot;)&lt;/script&gt;');
  });

  it('escapes attributes that could break out of a quoted HTML attribute', () => {
    const result = escapeHtml('"><img src=x onerror=alert(1)>');
    expect(result).not.toContain('<img');
    expect(result).not.toContain('">');
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('Smith & Sons')).toBe('Smith &amp; Sons');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("O'Brien")).toBe('O&#39;Brien');
  });

  it('returns an empty string for null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('coerces and passes through plain strings unchanged', () => {
    expect(escapeHtml('Ashley Kumar')).toBe('Ashley Kumar');
  });

  it('coerces non-string values (e.g. numbers) to a string first', () => {
    expect(escapeHtml(42)).toBe('42');
  });
});

/**
 * sendErrorAlertEmail() Tests
 *
 * Alerts the site owner (maskndafi@gmail.com by default, or ERROR_ALERT_EMAIL) whenever an
 * unexpected server error occurs on a customer-facing flow (booking, checkout, profile save),
 * so issues are caught immediately instead of only being visible in Vercel logs. Rate-limited
 * per error `context` to avoid flooding the inbox during a sustained outage.
 */
describe('sendErrorAlertEmail', () => {
  const originalResendKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  afterEach(() => {
    if (originalResendKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalResendKey;
    }
    vi.unstubAllGlobals();
  });

  it('skips sending when RESEND_API_KEY is not configured', async () => {
    const result = await sendErrorAlertEmail({
      context: 'test-context-not-configured',
      error: new Error('boom')
    });

    expect(result).toEqual({ success: false, reason: 'not_configured' });
  });

  it('sends to the error alert recipient with the context and error message', async () => {
    // RESEND_API_KEY is captured as a module-level constant at import time, so re-import the
    // module fresh (via resetModules) after setting the env var so this test's value is picked up.
    process.env.RESEND_API_KEY = 'test-key';
    vi.resetModules();
    const { sendErrorAlertEmail: freshSendErrorAlertEmail } = await import('../../api/_lib/email.js');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email-1' })
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await freshSendErrorAlertEmail({
      context: 'test-context-send',
      error: new Error('Something exploded'),
      extra: { userEmail: 'client@example.com' }
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.to).toEqual(['maskndafi@gmail.com']);
    expect(body.subject).toContain('test-context-send');
    expect(body.html).toContain('Something exploded');
    expect(body.html).toContain('client@example.com');
    expect(body.text).toContain('Something exploded');
  });

  it('rate limits repeated alerts for the same context (max 3 per window)', async () => {
    const context = 'test-context-rate-limit';

    const first = await sendErrorAlertEmail({ context, error: new Error('e1') });
    const second = await sendErrorAlertEmail({ context, error: new Error('e2') });
    const third = await sendErrorAlertEmail({ context, error: new Error('e3') });
    const fourth = await sendErrorAlertEmail({ context, error: new Error('e4') });

    // First 3 pass the rate limiter (but skip sending since RESEND_API_KEY is unset in this test).
    expect(first.reason).toBe('not_configured');
    expect(second.reason).toBe('not_configured');
    expect(third.reason).toBe('not_configured');
    // The 4th call within the window is suppressed by the rate limiter itself.
    expect(fourth).toEqual({ success: false, reason: 'rate_limited' });
  });
});

/**
 * sendLeadMagnetEmail() Tests
 *
 * Sends the actual free interview-prep guide to someone who opted in via the lead-capture form
 * (see api/leads/index.js). This is the real content behind that consent-based signup - not just
 * a confirmation - which is what makes the exchange (email address for a genuinely useful guide)
 * legitimate rather than unsolicited email.
 */
describe('sendLeadMagnetEmail', () => {
  const originalResendKey = process.env.RESEND_API_KEY;

  afterEach(() => {
    if (originalResendKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalResendKey;
    }
    vi.unstubAllGlobals();
  });

  it('sends real interview question content to the recipient', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    vi.resetModules();
    const { sendLeadMagnetEmail: freshSendLeadMagnetEmail } = await import('../../api/_lib/email.js');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email-1' })
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await freshSendLeadMagnetEmail({ recipientEmail: 'lead@example.com' });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.to).toEqual(['lead@example.com']);
    expect(body.subject).toContain('Free Interview Prep Guide');
    expect(body.html).toContain('MMI-style scenarios');
    expect(body.text).toContain('Why medicine, and why now?');
  });

  it('skips sending when RESEND_API_KEY is not configured', async () => {
    delete process.env.RESEND_API_KEY;
    vi.resetModules();
    const { sendLeadMagnetEmail: freshSendLeadMagnetEmail } = await import('../../api/_lib/email.js');

    const result = await freshSendLeadMagnetEmail({ recipientEmail: 'lead@example.com' });
    expect(result).toEqual({ success: false, reason: 'not_configured' });
  });
});
