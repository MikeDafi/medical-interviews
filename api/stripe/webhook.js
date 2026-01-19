import Stripe from 'stripe'
import { sql } from '@vercel/postgres'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export const config = {
  api: {
    bodyParser: false,
  },
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => {
      data += chunk
    })
    req.on('end', () => {
      resolve(Buffer.from(data))
    })
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let event
  const sig = req.headers['stripe-signature']

  try {
    // Get raw body for signature verification
    const rawBody = await getRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    
    // For local development, try parsing body directly if signature fails
    if (process.env.NODE_ENV !== 'production' || req.headers.host?.includes('localhost')) {
      console.log('Attempting to parse body without signature verification (local dev)')
      try {
        const rawBody = await getRawBody(req)
        event = JSON.parse(rawBody.toString())
      } catch (parseErr) {
        console.error('Failed to parse body:', parseErr)
        return res.status(400).send(`Webhook Error: ${err.message}`)
      }
    } else {
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      
      // Extract metadata
      const { packageId, userId, sessions, type } = session.metadata
      const customerEmail = session.customer_email
      const googleId = userId // userId from metadata is the Google ID

      console.log('Processing payment for:', { customerEmail, googleId, packageId, sessions })

      try {
        // Find user by Google ID or email
        let user = await sql`
          SELECT id FROM users WHERE google_id = ${googleId} OR email = ${customerEmail}
        `
        
        let dbUserId = user.rows[0]?.id

        // If no user found, create one
        if (!dbUserId && customerEmail) {
          const newUser = await sql`
            INSERT INTO users (google_id, email, name)
            VALUES (${googleId}, ${customerEmail}, ${customerEmail.split('@')[0]})
            RETURNING id
          `
          dbUserId = newUser.rows[0].id
          console.log('Created new user with id:', dbUserId)
        }

        // Get the package ID from packages table
        const packageResult = await sql`
          SELECT id, name FROM packages WHERE name ILIKE ${'%' + packageId + '%'} LIMIT 1
        `
        const dbPackageId = packageResult.rows[0]?.id

        console.log('Found package:', packageResult.rows[0])

        // Create package purchase record
        if (dbUserId && dbPackageId) {
          await sql`
            INSERT INTO user_packages (user_id, package_id, sessions_total, sessions_used, purchase_date, status)
            VALUES (
              ${dbUserId},
              ${dbPackageId},
              ${parseInt(sessions)},
              0,
              NOW(),
              'active'
            )
          `
          console.log('Created user_package for user:', dbUserId, 'package:', dbPackageId)
        } else {
          console.error('Missing dbUserId or dbPackageId:', { dbUserId, dbPackageId })
        }

        console.log('Payment successful for:', customerEmail, packageId)
      } catch (dbError) {
        console.error('Database error:', dbError)
        // Don't fail the webhook - payment was still successful
      }

      break
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object
      console.log('Payment failed:', paymentIntent.id)
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  res.status(200).json({ received: true })
}

