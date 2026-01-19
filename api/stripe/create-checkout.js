import Stripe from 'stripe';
import { rateLimit } from '../lib/auth.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Package definitions with Stripe price IDs
const PACKAGES = {
  trial: {
    name: '30 Min Trial Session',
    price: 3000, // $30 in cents
    description: 'Brief introduction, one MMI question, immediate feedback',
    sessions: 1,
    type: 'trial'
  },
  single: {
    name: '1 Hour Session',
    price: 10000, // $100 in cents
    description: 'Full prep & coaching, detailed feedback, take-home notes',
    sessions: 1,
    type: 'regular'
  },
  package3: {
    name: 'Package of 3 Sessions',
    price: 25000, // $250 in cents
    description: '3 one-hour sessions with progressive skill building',
    sessions: 3,
    type: 'regular'
  },
  package5: {
    name: 'Package of 5 Sessions (Premium)',
    price: 45000, // $450 in cents
    description: '5 one-hour sessions, take-home questions, priority scheduling',
    sessions: 5,
    type: 'regular'
  }
};

// SECURITY: Whitelist of allowed origins (HTTPS for production)
const ALLOWED_ORIGINS = [
  'http://localhost:3000',      // Local dev only
  'http://localhost:5173',      // Local dev only
  'https://premedical1on1.vercel.app',
  'https://www.premedical1on1.com', // Add your production domain here
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 10, 60000); // 10 checkout attempts per minute
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // SECURITY: Validate Stripe key is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Payment not configured' });
  }

  try {
    const { packageId, userId, userEmail } = req.body;

    // SECURITY: Validate package ID against whitelist
    if (!packageId || !PACKAGES[packageId]) {
      return res.status(400).json({ error: 'Invalid package' });
    }

    // SECURITY: Validate email format if provided
    if (userEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // SECURITY: Validate and sanitize origin
    const origin = req.headers.origin;
    let safeOrigin = 'http://localhost:3000'; // Default fallback
    
    if (origin && ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
      safeOrigin = origin;
    } else if (process.env.VERCEL_URL) {
      safeOrigin = `https://${process.env.VERCEL_URL}`;
    }

    const pkg = PACKAGES[packageId];

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
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
      ],
      mode: 'payment',
      success_url: `${safeOrigin}?payment=success&session_id={CHECKOUT_SESSION_ID}&package=${packageId}`,
      cancel_url: `${safeOrigin}?payment=cancelled`,
      customer_email: userEmail || undefined,
      metadata: {
        packageId,
        userId: userId || 'anonymous',
        sessions: pkg.sessions,
        type: pkg.type
      },
    });

    res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch {
    res.status(500).json({ error: 'Payment initialization failed' });
  }
}
