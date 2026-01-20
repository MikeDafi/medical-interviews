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

  if (!webhookSecret) {
    console.log('Webhook secret not configured');
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

    console.log('Processing webhook event:', event.type);

    // Handle checkout session completed (one-time payments and new subscriptions)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { packageId, userId, sessions, type, category } = session.metadata || {};
      const customerEmail = session.customer_email;
      const mode = session.mode; // 'payment' or 'subscription'

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
      } else {
        dbUser = user.rows[0];
        if (userId && !dbUser.google_id) {
          await sql`UPDATE users SET google_id = ${userId} WHERE id = ${dbUser.id}`;
        }
      }

      // Create purchase record
      const newPurchase = {
        id: session.id,
        package_id: packageId,
        type: type || (packageId === 'trial' ? 'trial' : 'regular'),
        category: category || 'interview',
        sessions_total: parseInt(sessions) || 1,
        sessions_used: 0,
        purchase_date: new Date().toISOString(),
        status: 'active'
      };

      // For subscriptions, add subscription-specific fields
      if (mode === 'subscription') {
        newPurchase.subscription_id = session.subscription;
        newPurchase.is_subscription = true;
        newPurchase.subscription_status = 'active';
        newPurchase.current_period_start = new Date().toISOString();
        // Sessions reset monthly for subscriptions
        newPurchase.sessions_total = parseInt(sessions) || 1;
      }

      await sql`
        UPDATE users 
        SET purchases = COALESCE(purchases, '[]'::jsonb) || ${JSON.stringify(newPurchase)}::jsonb,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${dbUser.id}
      `;

      console.log(`Purchase recorded for ${customerEmail}: ${packageId}`);
    }

    // Handle recurring subscription payments
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      const customerEmail = invoice.customer_email;

      if (!subscriptionId || !customerEmail) {
        return res.status(200).json({ received: true });
      }

      // Find user with this subscription
      const userResult = await sql`SELECT * FROM users WHERE email = ${customerEmail}`;
      
      if (userResult.rows.length > 0) {
        const dbUser = userResult.rows[0];
        const purchases = dbUser.purchases || [];
        
        // Find the subscription purchase and reset sessions for the new period
        const updatedPurchases = purchases.map(p => {
          if (p.subscription_id === subscriptionId && p.is_subscription) {
            return {
              ...p,
              sessions_used: 0, // Reset sessions for new billing period
              current_period_start: new Date().toISOString(),
              subscription_status: 'active'
            };
          }
          return p;
        });

        await sql`
          UPDATE users 
          SET purchases = ${JSON.stringify(updatedPurchases)}::jsonb,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${dbUser.id}
        `;

        console.log(`Subscription renewed for ${customerEmail}`);
      }
    }

    // Handle subscription cancellation
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const subscriptionId = subscription.id;

      // Find user with this subscription and mark as cancelled
      const usersResult = await sql`SELECT * FROM users WHERE purchases IS NOT NULL`;
      
      for (const dbUser of usersResult.rows) {
        const purchases = dbUser.purchases || [];
        let updated = false;
        
        const updatedPurchases = purchases.map(p => {
          if (p.subscription_id === subscriptionId) {
            updated = true;
            return {
              ...p,
              subscription_status: 'cancelled',
              status: 'cancelled',
              cancelled_at: new Date().toISOString()
            };
          }
          return p;
        });

        if (updated) {
          await sql`
            UPDATE users 
            SET purchases = ${JSON.stringify(updatedPurchases)}::jsonb,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${dbUser.id}
          `;
          console.log(`Subscription cancelled for user ${dbUser.id}`);
          break;
        }
      }
    }

    // Handle subscription updated (plan changes, etc.)
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const subscriptionId = subscription.id;
      const status = subscription.status; // 'active', 'past_due', 'unpaid', 'canceled', etc.

      const usersResult = await sql`SELECT * FROM users WHERE purchases IS NOT NULL`;
      
      for (const dbUser of usersResult.rows) {
        const purchases = dbUser.purchases || [];
        let updated = false;
        
        const updatedPurchases = purchases.map(p => {
          if (p.subscription_id === subscriptionId) {
            updated = true;
            return {
              ...p,
              subscription_status: status
            };
          }
          return p;
        });

        if (updated) {
          await sql`
            UPDATE users 
            SET purchases = ${JSON.stringify(updatedPurchases)}::jsonb,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${dbUser.id}
          `;
          console.log(`Subscription status updated to ${status} for user ${dbUser.id}`);
          break;
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
