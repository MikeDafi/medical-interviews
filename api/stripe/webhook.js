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

// Helper to find user by subscription ID efficiently using JSONB containment
async function findUserBySubscriptionId(subscriptionId) {
  // Use JSONB containment operator to find user with this subscription
  const result = await sql`
    SELECT * FROM users 
    WHERE purchases @> ${JSON.stringify([{ subscription_id: subscriptionId }])}::jsonb
    LIMIT 1
  `;
  return result.rows[0] || null;
}

// Helper to update subscription in user's purchases
async function updateSubscriptionStatus(userId, subscriptionId, updates) {
  const userResult = await sql`SELECT purchases FROM users WHERE id = ${userId}`;
  if (userResult.rows.length === 0) return false;

  const purchases = userResult.rows[0].purchases || [];
  const updatedPurchases = purchases.map(p => {
    if (p.subscription_id === subscriptionId) {
      return { ...p, ...updates };
    }
    return p;
  });

  await sql`
    UPDATE users 
    SET purchases = ${JSON.stringify(updatedPurchases)}::jsonb,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
  `;
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!webhookSecret) {
    console.error('Webhook secret not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Handle checkout session completed (one-time payments and new subscriptions)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { packageId, userId, sessions, duration_minutes, category } = session.metadata || {};
      const customerEmail = session.customer_email;
      const mode = session.mode;

      if (!customerEmail && !userId) {
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
      } else {
        dbUser = user.rows[0];
        if (userId && !dbUser.google_id) {
          await sql`UPDATE users SET google_id = ${userId} WHERE id = ${dbUser.id}`;
        }
      }

      // Create purchase record using metadata directly
      const durationMins = parseInt(duration_minutes) || (packageId?.includes('trial') || packageId?.includes('snapshot') ? 30 : 60);
      const newPurchase = {
        id: session.id,
        package_id: packageId,
        duration_minutes: durationMins,
        category: category || 'interview',
        sessions_total: parseInt(sessions) || 1,
        sessions_used: 0,
        purchase_date: new Date().toISOString(),
        status: 'active',
        bookings: []
      };

      // For subscriptions, add subscription-specific fields
      if (mode === 'subscription') {
        newPurchase.subscription_id = session.subscription;
        newPurchase.is_subscription = true;
        newPurchase.subscription_status = 'active';
        newPurchase.current_period_start = new Date().toISOString();
      }

      await sql`
        UPDATE users 
        SET purchases = COALESCE(purchases, '[]'::jsonb) || ${JSON.stringify(newPurchase)}::jsonb,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${dbUser.id}
      `;
    }

    // Handle recurring subscription payments
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      const customerEmail = invoice.customer_email;

      if (!subscriptionId || !customerEmail) {
        return res.status(200).json({ received: true });
      }

      // Find user directly by email (efficient)
      const userResult = await sql`SELECT * FROM users WHERE email = ${customerEmail}`;
      
      if (userResult.rows.length > 0) {
        const dbUser = userResult.rows[0];
        await updateSubscriptionStatus(dbUser.id, subscriptionId, {
          sessions_used: 0,
          current_period_start: new Date().toISOString(),
          subscription_status: 'active'
        });
      }
    }

    // Handle subscription cancellation - use efficient lookup
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const subscriptionId = subscription.id;

      // Try to get customer email from Stripe
      let customerEmail = null;
      if (subscription.customer) {
        try {
          const customer = await stripe.customers.retrieve(subscription.customer);
          customerEmail = customer.email;
        } catch {
          // Customer lookup failed, fall back to JSONB search
        }
      }

      let dbUser = null;
      if (customerEmail) {
        const result = await sql`SELECT * FROM users WHERE email = ${customerEmail}`;
        dbUser = result.rows[0];
      }
      
      // Fallback: search by subscription ID in JSONB (still more efficient than SELECT *)
      if (!dbUser) {
        dbUser = await findUserBySubscriptionId(subscriptionId);
      }

      if (dbUser) {
        await updateSubscriptionStatus(dbUser.id, subscriptionId, {
          subscription_status: 'cancelled',
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        });
      }
    }

    // Handle subscription updated (plan changes, etc.)
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const subscriptionId = subscription.id;
      const status = subscription.status;

      // Try to get customer email from Stripe
      let customerEmail = null;
      if (subscription.customer) {
        try {
          const customer = await stripe.customers.retrieve(subscription.customer);
          customerEmail = customer.email;
        } catch {
          // Customer lookup failed
        }
      }

      let dbUser = null;
      if (customerEmail) {
        const result = await sql`SELECT * FROM users WHERE email = ${customerEmail}`;
        dbUser = result.rows[0];
      }
      
      // Fallback: search by subscription ID
      if (!dbUser) {
        dbUser = await findUserBySubscriptionId(subscriptionId);
      }

      if (dbUser) {
        await updateSubscriptionStatus(dbUser.id, subscriptionId, {
          subscription_status: status
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
