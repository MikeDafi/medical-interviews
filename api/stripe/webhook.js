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

  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];
    
    let event;
    
    if (webhookSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        // For local dev, parse directly
        event = JSON.parse(rawBody.toString());
      }
    } else {
      event = JSON.parse(rawBody.toString());
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { packageId, userId, sessions, type } = session.metadata || {};
      const customerEmail = session.customer_email;

      console.log('Processing payment:', { customerEmail, packageId, sessions, type });

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
        // Update google_id if we have it and user doesn't
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
    return res.status(400).json({ error: error.message });
  }
}
