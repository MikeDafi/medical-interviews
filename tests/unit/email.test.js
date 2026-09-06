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
import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../../api/_lib/email.js';

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
