/**
 * Environment variable loader for local development
 * Vercel dev doesn't auto-load .env.local for API routes
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root
// Use override:true to ensure local values take precedence over Vercel cloud values
config({ path: resolve(__dirname, '../../.env.local'), override: true });

// Export for confirmation
export const envLoaded = true;

