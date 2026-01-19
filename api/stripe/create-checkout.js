import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Package definitions with Stripe price IDs (use test mode IDs)
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
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { packageId, userId, userEmail } = req.body

    if (!packageId || !PACKAGES[packageId]) {
      return res.status(400).json({ error: 'Invalid package' })
    }

    const pkg = PACKAGES[packageId]
    const origin = req.headers.origin || 'http://localhost:5173'

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
      success_url: `${origin}?payment=success&session_id={CHECKOUT_SESSION_ID}&package=${packageId}`,
      cancel_url: `${origin}?payment=cancelled`,
      customer_email: userEmail || undefined,
      metadata: {
        packageId,
        userId: userId || 'anonymous',
        sessions: pkg.sessions,
        type: pkg.type
      },
    })

    res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    })
  } catch (error) {
    console.error('Stripe error:', error)
    res.status(500).json({ error: error.message })
  }
}

