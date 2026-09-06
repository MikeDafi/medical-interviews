// Load .env.local for local development
import '../_lib/env.js';

import { handleUpload } from '@vercel/blob/client';
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
