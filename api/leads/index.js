// Load .env.local for local development
import '../_lib/env.js';

import { sql } from '@vercel/postgres';
import { rateLimit } from '../_lib/auth.js';
import { sanitizeEmail } from '../_lib/sanitize.js';
import { sendLeadMagnetEmail, sendErrorAlertEmail } from '../_lib/email.js';

// Legitimate, consent-based growth channel: a visitor voluntarily submits their own email in
// exchange for a real, useful guide (see sendLeadMagnetEmail in api/_lib/email.js). This is
// deliberately the ONLY way emails enter the `leads` table - there is no import/upload path here
// or anywhere else in this codebase, and nothing in this app ever sources third-party mailing
// lists. Do not add one.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: Rate limiting - this is an unauthenticated, public endpoint, so it's a prime target
  // for abuse (spamming other people's inboxes with the guide, or hammering Resend's quota).
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 5, 60000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
  }

  const cleanEmail = sanitizeEmail(req.body?.email);
  if (!cleanEmail) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  try {
    // ON CONFLICT DO NOTHING: re-submitting the same email is a no-op (not an error) - avoids
    // leaking "this email already signed up" as a side channel, and avoids re-sending the guide
    // every time someone re-enters an email they've already used.
    const result = await sql`
      INSERT INTO leads (email, source)
      VALUES (${cleanEmail}, 'website')
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;
    const isNewLead = result.rows.length > 0;

    // Always send the guide (even on a repeat signup) - the visitor asked for it right now, and
    // there's no reason to withhold it just because they'd signed up before.
    const emailResult = await sendLeadMagnetEmail({ recipientEmail: cleanEmail });
    if (!emailResult.success && emailResult.reason !== 'not_configured') {
      console.error('Lead magnet email failed to send:', emailResult.error);
    }

    return res.status(200).json({ success: true, isNewLead });
  } catch (error) {
    console.error('Lead capture error:', error);
    sendErrorAlertEmail({
      context: 'Lead magnet signup (api/leads)',
      error
    }).catch(err => console.error('Error alert email failed:', err));
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
