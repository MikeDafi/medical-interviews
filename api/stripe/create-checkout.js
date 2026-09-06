// Load .env.local for local development
import '../_lib/env.js';

import Stripe from 'stripe';
import { sql } from '@vercel/postgres';
import { rateLimit } from '../_lib/auth.js';
import { requireAuth } from '../_lib/session.js';

// Trial package IDs that are restricted to first-time users
const TRIAL_PACKAGES = ['trial', 'cv_trial'];

// Initialize Stripe lazily to ensure env vars are loaded
let stripeInstance = null;
function getStripe() {
  if (!stripeInstance && process.env.STRIPE_SECRET_KEY) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}

// Package definitions - organized by category
// duration_minutes: 30 or 60 (used for booking validation)
const PACKAGES = {
  // ============ INTERVIEW PREP ============
  trial: {
    name: '30 Min Trial Session',
    price: 3000, // $30
    description: 'Brief introduction, one MMI question, immediate feedback',
    sessions: 1,
    duration_minutes: 30,
    category: 'interview',
    mode: 'payment'
  },
  single: {
    name: '1 Hour Interview Session',
    price: 10000, // $100
    description: 'Full prep & coaching, detailed feedback, take-home notes',
    sessions: 1,
    duration_minutes: 60,
    category: 'interview',
    mode: 'payment'
  },
  package3: {
    name: 'Interview Package (3 Sessions)',
    price: 25000, // $250
    description: '3 one-hour sessions with progressive skill building',
    sessions: 3,
    duration_minutes: 60,
    category: 'interview',
    mode: 'payment'
  },
  package5: {
    name: 'Interview Package (5 Sessions)',
    price: 40000, // $400
    description: '5 one-hour sessions, take-home questions, priority scheduling',
    sessions: 5,
    duration_minutes: 60,
    category: 'interview',
    mode: 'payment'
  },

  // ============ CV & STRATEGY ============
  cv_trial: {
    name: '30 Min Strategy Snapshot',
    price: 3000, // $30
    description: 'Quick assessment, high-level CV review, identify gaps, clear next steps',
    sessions: 1,
    duration_minutes: 30,
    category: 'cv',
    mode: 'payment'
  },
  cv_single: {
    name: '1 Hour In-Depth CV Review',
    price: 10000, // $100
    description: 'Full CV review, blunt assessment, prioritization guidance',
    sessions: 1,
    duration_minutes: 60,
    category: 'cv',
    mode: 'payment'
  },
  cv_package3: {
    name: 'CV Strategy Package (3 Sessions)',
    price: 25000, // $250
    description: 'Strategy + CV review, progress checks, refinement sessions',
    sessions: 3,
    duration_minutes: 60,
    category: 'cv',
    mode: 'payment'
  },
  cv_package5: {
    name: 'CV Strategy Package (5 Sessions)',
    price: 40000, // $400
    description: 'Mentorship-style advising across months or years',
    sessions: 5,
    duration_minutes: 60,
    category: 'cv',
    mode: 'payment'
  },

  // ============ ADVISORY (SUBSCRIPTIONS) ============
  advisory_email: {
    name: 'Email-Only Advisory',
    price: 5000, // $50/month
    description: 'Email access for questions, opportunity evaluation, timing decisions',
    sessions: 0, // Unlimited email
    duration_minutes: 0,
    category: 'advisory',
    mode: 'subscription',
    interval: 'month'
  },
  advisory_checkin: {
    name: 'Monthly Check-In',
    price: 6000, // $60/month
    description: 'One 30-minute Zoom call per month, progress review, priority adjustments',
    sessions: 1, // 1 call per month
    duration_minutes: 30,
    category: 'advisory',
    mode: 'subscription',
    interval: 'month'
  },
  advisory_full: {
    name: 'Email + Monthly Check-In',
    price: 10000, // $100/month
    description: 'Email access plus monthly 30-min Zoom check-in',
    sessions: 1, // 1 call per month + email
    duration_minutes: 30,
    category: 'advisory',
    mode: 'subscription',
    interval: 'month'
  }
};

// SECURITY: Whitelist of allowed origins
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://premedical1on1.vercel.app',
  'https://premedical1on1.biz',
  'https://www.premedical1on1.biz',
  'https://www.premedical1on1.com',
];

export default async function handler(req, res) {
  console.log('Stripe checkout request received');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 10, 60000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // SECURITY: Require authenticated session for purchases
  console.log('Checking auth...');
  const { authenticated, user: sessionUser, error: authError } = await requireAuth(req);
  if (!authenticated) {
    return res.status(401).json({ error: authError || 'Please sign in to purchase' });
  }

  // SECURITY: Removed debug logs
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Payment not configured' });
  }

  try {
    const { packageId } = req.body;

    // SECURITY: Use verified email from session
    const userId = sessionUser.googleId;
    const userEmail = sessionUser.email;

    if (!packageId || !PACKAGES[packageId]) {
      return res.status(400).json({ error: 'Invalid package' });
    }

    // SECURITY: Block trial packages for users who have already had any session
    if (TRIAL_PACKAGES.includes(packageId)) {
      const userResult = await sql`
        SELECT purchases FROM users 
        WHERE google_id = ${userId} OR email = ${userEmail}
      `;
      
      if (userResult.rows.length > 0) {
        const purchases = userResult.rows[0].purchases || [];
        
        // Check if user has ever had a session (used any sessions or has any completed bookings)
        const hasHadSession = purchases.some(p => {
          // Check if any sessions have been used
          if ((p.sessions_used || 0) > 0) return true;
          
          // Check if there are any confirmed/completed bookings
          const bookings = p.bookings || [];
          return bookings.some(b => 
            b.status === 'confirmed' || 
            b.status === 'completed' ||
            new Date(b.date_time) < new Date() // Past bookings
          );
        });
        
        if (hasHadSession) {
          return res.status(400).json({ 
            error: 'Trial sessions are only available for first-time users. Please choose a full session package.' 
          });
        }
      }
    }

    const origin = req.headers.origin;
    let safeOrigin = 'http://localhost:3000';
    
    // SECURITY: exact match only - `startsWith` would let an attacker pass an Origin like
    // "https://premedical1on1.vercel.app.attacker.com" (which starts with an allowed origin but
    // is actually attacker-controlled), letting them control the Stripe redirect URL.
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      safeOrigin = origin;
    } else if (process.env.VERCEL_URL) {
      safeOrigin = `https://${process.env.VERCEL_URL}`;
    }

    const pkg = PACKAGES[packageId];

    // Build the session config based on payment mode
    const sessionConfig = {
      payment_method_types: ['card'],
      success_url: `${safeOrigin}?payment=success&session_id={CHECKOUT_SESSION_ID}&package=${packageId}`,
      cancel_url: `${safeOrigin}?payment=cancelled`,
      customer_email: userEmail,
      metadata: {
        packageId,
        userId: userId || 'anonymous',
        sessions: pkg.sessions,
        duration_minutes: pkg.duration_minutes,
        category: pkg.category
      },
    };

    if (pkg.mode === 'subscription') {
      // Subscription mode for advisory packages
      sessionConfig.mode = 'subscription';
      sessionConfig.line_items = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: pkg.name,
              description: pkg.description,
            },
            unit_amount: pkg.price,
            recurring: {
              interval: pkg.interval || 'month'
            }
          },
          quantity: 1,
        },
      ];
    } else {
      // One-time payment mode
      sessionConfig.mode = 'payment';
      sessionConfig.line_items = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: pkg.name,
              description: pkg.description,
            },
            unit_amount: pkg.price,
          },
          quantity: 1,
        },
      ];
    }

    const session = await getStripe().checkout.sessions.create(sessionConfig);

    res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
}
