import Stripe from 'stripe';
import { sql } from '@vercel/postgres';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: { bodyParser: false }
};

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: Require webhook secret in production
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];
    
    // SECURITY: Require signature - NO FALLBACK
    if (!sig) {
      console.error('Missing stripe-signature header');
      return res.status(401).json({ error: 'Missing signature' });
    }

    let event;
    try {
      // SECURITY: Always verify signature - no fallback parsing
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process verified event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { packageId, userId, sessions, type } = session.metadata || {};
      const customerEmail = session.customer_email;

      console.log('Processing verified payment:', { customerEmail, packageId, sessions, type });

      if (!customerEmail && !userId) {
        console.log('No customer email or userId in session');
        return res.status(200).json({ received: true });
      }

      // Find or create user
      let user = await sql`SELECT * FROM users WHERE email = ${customerEmail}`;
      
      if (user.rows.length === 0 && userId) {
        user = await sql`SELECT * FROM users WHERE google_id = ${userId}`;
      }

      let dbUser;
      if (user.rows.length === 0) {
        const newUser = await sql`
          INSERT INTO users (google_id, email, name, purchases)
          VALUES (${userId || customerEmail}, ${customerEmail}, ${customerEmail.split('@')[0]}, '[]'::jsonb)
          RETURNING *
        `;
        dbUser = newUser.rows[0];
        console.log('Created new user:', dbUser.id);
      } else {
        dbUser = user.rows[0];
        if (userId && !dbUser.google_id) {
          await sql`UPDATE users SET google_id = ${userId} WHERE id = ${dbUser.id}`;
        }
      }

      // Add purchase to user's purchases JSON array
      const newPurchase = {
        id: session.id,
        package_id: packageId,
        type: type || (packageId === 'trial' ? 'trial' : 'regular'),
        sessions_total: parseInt(sessions) || 1,
        sessions_used: 0,
        purchase_date: new Date().toISOString(),
        status: 'active'
      };

      await sql`
        UPDATE users 
        SET purchases = COALESCE(purchases, '[]'::jsonb) || ${JSON.stringify(newPurchase)}::jsonb,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${dbUser.id}
      `;

      console.log('Added purchase for user:', dbUser.id, newPurchase);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal error' }); // Don't leak error details
  }
}
