import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { useAuth } from '../context/AuthContext'

// Initialize Stripe with publishable key
const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null

export default function Packages() {
  const [loading, setLoading] = useState(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const { user, signInWithGoogle } = useAuth()

  const handlePurchase = async (packageId) => {
    // Require login before purchasing
    if (!user) {
      setShowLoginPrompt(true)
      return
    }
    
    setLoading(packageId)
    
    try {
      // First try the API route (works on Vercel)
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
          userId: user.id,
          userEmail: user.email
        })
      })

      const data = await response.json()
      
      if (response.ok && data.url) {
        window.location.href = data.url
        return
      } else if (response.ok && data.sessionId) {
        const stripe = await stripePromise
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId: data.sessionId })
          return
        }
      }
      
      // If we got here, something went wrong
      console.error('API response:', response.status, data)
      throw new Error(data.error || 'Failed to create checkout session')
      
    } catch (error) {
      console.error('Payment error:', error)
      alert(`Payment error: ${error.message}. Please try again.`)
    }
    
    setLoading(null)
  }

  return (
    <section className="packages-section" id="packages">
      <div className="section-header marketing-header">
        <h2>Prep Packages</h2>
        <p>(Interviews, Advice, or Resume Review)</p>
      </div>
      
      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="login-prompt-overlay" onClick={() => setShowLoginPrompt(false)}>
          <div className="login-prompt-modal" onClick={e => e.stopPropagation()}>
            <button className="login-prompt-close" onClick={() => setShowLoginPrompt(false)}>×</button>
            <h3>Sign in to Purchase</h3>
            <p>Please sign in with Google to purchase a session package. This helps us track your sessions and provide personalized coaching.</p>
            <button className="login-prompt-btn" onClick={() => { signInWithGoogle(); setShowLoginPrompt(false); }}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        </div>
      )}
      
      <div className="packages-grid">
        <PackageCard
          badge="Try It Out"
          title="30 Min Trial"
          price="$30"
          features={[
            "Brief introduction & assessment",
            "One MMI question practice",
            "7 min timed response (2 min prep + 5 min answer)",
            "Immediate feedback & debrief"
          ]}
          buttonText="Book Trial"
          variant="trial"
          packageId="trial"
          onPurchase={handlePurchase}
          loading={loading === 'trial'}
        />

        <PackageCard
          title="1 Hour Session"
          price="$100"
          features={[
            "Full prep & coaching session",
            "MMI or traditional interview practice",
            "Detailed feedback & review",
            "Take-home notes on improvement areas"
          ]}
          buttonText="Book Session"
          packageId="single"
          onPurchase={handlePurchase}
          loading={loading === 'single'}
        />

        <PackageCard
          badge="Popular"
          title="Package of 3"
          price="$250"
          priceNote="Save $50"
          features={[
            "3 one-hour sessions",
            "Progressive skill building",
            "Beginner to Intermediate to Advanced",
            "Comprehensive feedback after each"
          ]}
          buttonText="Get Package"
          variant="popular"
          packageId="package3"
          onPurchase={handlePurchase}
          loading={loading === 'package3'}
        />

        <PackageCard
          badge="Premium"
          title="Package of 5"
          price="$450"
          priceNote="Save $50"
          features={[
            "5 one-hour sessions",
            "Full interview mastery program",
            "Take-home interview questions included",
            "Priority scheduling",
            "Session recordings available"
          ]}
          buttonText="Get Premium"
          variant="premium"
          packageId="package5"
          onPurchase={handlePurchase}
          loading={loading === 'package5'}
        />
      </div>
    </section>
  )
}

function PackageCard({ badge, title, price, priceNote, features, buttonText, variant = '', packageId, onPurchase, loading }) {
  const handleClick = (e) => {
    e.preventDefault()
    if (packageId && onPurchase) {
      onPurchase(packageId)
    }
  }

  return (
    <div className={`package-card ${variant}`}>
      {badge && <div className="package-badge">{badge}</div>}
      <h3>{title}</h3>
      <div className="package-price">
        <span className="price">{price}</span>
        {priceNote && <span className="price-note">{priceNote}</span>}
      </div>
      <ul className="package-features">
        {features.map((feature, index) => (
          <li key={index}>{feature}</li>
        ))}
      </ul>
      <button 
        onClick={handleClick} 
        className={variant === 'premium' ? 'package-btn-premium' : 'package-btn'}
        disabled={loading}
      >
        {loading ? 'Processing...' : buttonText}
      </button>
    </div>
  )
}
