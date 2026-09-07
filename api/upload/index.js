// Load .env.local for local development
import '../_lib/env.js';

import { handleUpload } from '@vercel/blob/client';
import { del } from '@vercel/blob';
import { sql } from '@vercel/postgres';
import { requireAuth } from '../_lib/session.js';
import { rateLimit } from '../_lib/auth.js';

// Only PDF/DOC/DOCX are accepted for CV & Strategy attachments (resumes, activities lists, etc).
// Both the declared content-type AND the file extension are checked - never trust either alone.
const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
// Daily cap on upload attempts per account, independent of how many files they currently have
// on file (which is capped separately at 3 - see api/profile/setup.js). Tracked via a persistent,
// append-only log (upload_log) rather than counting current cv_files, since deleting a file must
// not free up a new daily upload slot - otherwise the daily cap could be bypassed entirely by
// upload+delete cycling.
const MAX_UPLOADS_PER_DAY = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

function hasAllowedExtension(pathname) {
  const lower = pathname.toLowerCase();
  return ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 20, 60000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // SECURITY: Require an authenticated session - only signed-in clients can request an upload
  // token, and the token is scoped below to a path namespaced by their own user id.
  const { authenticated, user: sessionUser, error: authError } = await requireAuth(req);
  if (!authenticated) {
    return res.status(401).json({ error: authError || 'Authentication required' });
  }

  const { action } = req.query;

  // ==================== DELETE AN ON-FILE CV/ACTIVITIES DOCUMENT ====================
  // Lets a client remove a previously-uploaded file - both to free up a slot under the 3-file
  // cap (see api/profile/setup.js) and just to clean up duplicates/mistakes. Removes the blob
  // from storage (best-effort) and drops it from their reusable cv_files list.
  if (action === 'delete') {
    const { fileId } = req.body || {};
    if (!fileId) {
      return res.status(400).json({ error: 'fileId required' });
    }

    try {
      const userResult = await sql`SELECT id, cv_files FROM users WHERE google_id = ${sessionUser.googleId}`;
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];
      const cvFiles = user.cv_files || [];
      const fileToDelete = cvFiles.find(f => f.id === fileId);
      if (!fileToDelete) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Best-effort blob deletion - if it fails (e.g. already gone), still remove it from the
      // profile so the client isn't stuck with an entry they can't clear.
      try {
        await del(fileToDelete.url);
      } catch (blobError) {
        console.error('Blob delete error (continuing to remove from profile):', blobError);
      }

      const updatedCvFiles = cvFiles.filter(f => f.id !== fileId);
      await sql`
        UPDATE users SET cv_files = ${JSON.stringify(updatedCvFiles)}::jsonb, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${user.id}
      `;

      return res.status(200).json({ success: true, cvFiles: updatedCvFiles });
    } catch (error) {
      console.error('Delete file error:', error);
      return res.status(500).json({ error: 'Failed to delete file' });
    }
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // SECURITY: the client chooses the pathname it uploads to (see CATEGORY_DURATIONS/CV
        // upload UI in Calendar.jsx/Profile.jsx) - require it to live under this user's own
        // namespace so no one can write into another client's folder. Scoped by googleId (not
        // the DB numeric id) since that's what the frontend's useAuth() exposes as `user.id` -
        // see api/auth/index.js's session response, which maps `id: user.googleId`.
        const expectedPrefix = `cv-uploads/${sessionUser.googleId}/`;
        if (!pathname.startsWith(expectedPrefix)) {
          throw new Error('Invalid upload path.');
        }

        if (!hasAllowedExtension(pathname)) {
          throw new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.');
        }

        // Daily upload rate limit - checked and recorded here (before the token is even issued)
        // rather than after the upload completes, since issuing many tokens is itself the
        // resource to bound, regardless of whether the client finishes each upload.
        try {
          const userResult = await sql`SELECT id, upload_log FROM users WHERE google_id = ${sessionUser.googleId}`;
          if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            const now = Date.now();
            const recentUploads = (user.upload_log || []).filter(ts => now - new Date(ts).getTime() < DAY_MS);

            if (recentUploads.length >= MAX_UPLOADS_PER_DAY) {
              throw new Error(`Daily upload limit reached (${MAX_UPLOADS_PER_DAY} per day). Please try again tomorrow.`);
            }

            // Keep the log itself bounded (last 24h of entries, capped defensively) rather than
            // growing forever.
            const updatedLog = [...recentUploads, new Date(now).toISOString()].slice(-MAX_UPLOADS_PER_DAY * 2);
            await sql`UPDATE users SET upload_log = ${JSON.stringify(updatedLog)}::jsonb WHERE id = ${user.id}`;
          }
        } catch (rateLimitError) {
          // Re-throw an actual "limit reached" rejection (must block the upload), but fail open
          // on any other error (e.g. the upload_log migration hasn't run yet on this deployment
          // - see api/db/init.js) so a DB hiccup here can't take down uploads entirely.
          if (rateLimitError.message?.startsWith('Daily upload limit reached')) {
            throw rateLimitError;
          }
          console.error('Upload rate-limit check failed (allowing upload):', rateLimitError);
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_SIZE_BYTES,
          // Vercel appends a random suffix to the stored path so URLs are unguessable even
          // though blobs are served with public access (see plan.md for the access-mode tradeoff
          // this accepts, and a possible signed-URL follow-up).
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ googleId: sessionUser.googleId })
        };
      },
      // Not relying on this webhook-style callback: it requires Vercel to reach this deployment
      // server-to-server, which doesn't work in local dev and adds complexity for a small site.
      // Instead, the client calls a normal authenticated endpoint with the resulting blob URL
      // once upload() resolves (see api/profile/index.js's cv-files handling).
      onUploadCompleted: async () => {}
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('Upload token error:', error);
    return res.status(400).json({ error: error.message || 'Failed to prepare upload' });
  }
}
