/**
 * Environment variable loader for local development
 * Vercel dev doesn't auto-load .env.local for API routes
 * In production, this is a no-op since .env.local doesn't exist
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, '../../.env.local');

// Only load if .env.local exists (local dev only)
if (existsSync(envPath)) {
  config({ path: envPath, override: true });
}

// Export for confirmation
export const envLoaded = true;

