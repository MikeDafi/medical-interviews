import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { useAuth } from '../context/AuthContext'
import GoogleIcon from './icons/GoogleIcon'

// Initialize Stripe with publishable key
const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null

export default function Packages() {
  const [loading, setLoading] = useState(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [activeCategory, setActiveCategory] = useState('interviews')
  const { user, signInWithGoogle } = useAuth()

  const handlePurchase = async (packageId) => {
    // Require login before purchasing
    if (!user) {
      setShowLoginPrompt(true)
      return
    }
    
    setLoading(packageId)
    
    try {
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
      
      console.error('API response:', response.status, data)
      throw new Error(data.error || 'Failed to create checkout session')
      
    } catch (error) {
      console.error('Payment error:', error)
      alert(`Payment error: ${error.message}. Please try again.`)
    }
    
    setLoading(null)
  }

  const categories = [
    { id: 'interviews', label: 'Interview Prep', icon: '🎤' },
    { id: 'resume', label: 'CV & Strategy', icon: '📄' },
    { id: 'advisory', label: 'Advisory', icon: '💬' }
  ]

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
            <p>Please sign in with Google to purchase a session package.</p>
            <button className="login-prompt-btn" onClick={() => { signInWithGoogle(); setShowLoginPrompt(false); }}>
              <GoogleIcon />
              Sign in with Google
            </button>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="packages-tabs">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`packages-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span className="tab-icon">{cat.icon}</span>
            <span className="tab-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Interview Prep Packages */}
      {activeCategory === 'interviews' && (
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
              "Beginner → Intermediate → Advanced",
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
              "Take-home interview questions",
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
      )}

      {/* CV & Strategy Packages */}
      {activeCategory === 'resume' && (
        <div className="packages-grid">
          <PackageCard
            badge="Try It Out"
            title="30 Min Strategy Snapshot"
            price="$30"
            features={[
              "Rapid assessment of where you are",
              "High-level CV review or verbal walkthrough",
              "Identify major gaps & misprioritized activities",
              "Clear actionable next steps"
            ]}
            notIncluded={[
              "Detailed CV phrasing",
              "Long-term planning"
            ]}
            buttonText="Book Snapshot"
            variant="trial"
            packageId="cv_trial"
            onPurchase={handlePurchase}
            loading={loading === 'cv_trial'}
          />

          <PackageCard
            title="1 Hour In-Depth Review"
            price="$100"
            features={[
              "Full CV or activity review (live)",
              "Blunt but supportive assessment",
              "Clear prioritization of what matters",
              "Guidance on clinical, volunteering, leadership, research",
              "Realistic hour expectations"
            ]}
            highlight="You leave knowing exactly what to focus on and why."
            buttonText="Book Review"
            packageId="cv_single"
            onPurchase={handlePurchase}
            loading={loading === 'cv_single'}
          />

          <PackageCard
            badge="Flexible"
            title="3 Session Package"
            price="$250"
            priceNote="Save $50"
            features={[
              "Three 1-hour sessions",
              "Use anytime (no expiration)",
              "Session 1: Full strategy + CV review",
              "Session 2: Progress check & course correction",
              "Session 3: Refinement & leadership framing"
            ]}
            buttonText="Get Package"
            variant="popular"
            packageId="cv_package3"
            onPurchase={handlePurchase}
            loading={loading === 'cv_package3'}
          />

          <PackageCard
            badge="Long-Term"
            title="5 Session Package"
            price="$450"
            priceNote="Save $50"
            features={[
              "Five 1-hour sessions",
              "Use across months or years",
              "Mentorship-style advising",
              "Long-term planning with recalibration",
              "Ideal for college or gap year students"
            ]}
            buttonText="Get Package"
            variant="premium"
            packageId="cv_package5"
            onPurchase={handlePurchase}
            loading={loading === 'cv_package5'}
          />
        </div>
      )}

      {/* Advisory Packages */}
      {activeCategory === 'advisory' && (
        <div className="packages-grid advisory-grid">
          <PackageCard
            title="Email-Only Advisory"
            price="$50"
            priceNote="/month"
            features={[
              "Email access for short questions",
              "Help with opportunity evaluation",
              "Prioritization guidance",
              "Timing decisions",
              "Response within 48 hours"
            ]}
            buttonText="Subscribe"
            variant="advisory"
            packageId="advisory_email"
            onPurchase={handlePurchase}
            loading={loading === 'advisory_email'}
          />

          <PackageCard
            badge="Popular"
            title="Monthly Check-In"
            price="$60"
            priceNote="/month"
            features={[
              "One 30-minute Zoom call per month",
              "Progress review",
              "Priority adjustments",
              "Short-term planning",
              "Unused sessions roll over"
            ]}
            buttonText="Subscribe"
            variant="popular advisory"
            packageId="advisory_checkin"
            onPurchase={handlePurchase}
            loading={loading === 'advisory_checkin'}
          />

          <PackageCard
            badge="Best Value"
            title="Email + Check-In"
            price="$100"
            priceNote="/month"
            features={[
              "Email access included",
              "One 30-min Zoom check-in monthly",
              "Real mentorship relationship",
              "Ongoing guidance & support",
              "Best for serious applicants"
            ]}
            buttonText="Subscribe"
            variant="premium advisory"
            packageId="advisory_full"
            onPurchase={handlePurchase}
            loading={loading === 'advisory_full'}
          />
        </div>
      )}

      {/* Category Descriptions */}
      <div className="packages-info">
        {activeCategory === 'interviews' && (
          <p className="packages-description">
            Mock interview sessions tailored to your target schools. Practice MMI, traditional, or combination formats with realistic questions and brutally honest feedback.
          </p>
        )}
        {activeCategory === 'resume' && (
          <p className="packages-description">
            Strategic guidance on building a competitive application. Get honest assessment of your CV, activity prioritization, and clear direction on what to focus on.
          </p>
        )}
        {activeCategory === 'advisory' && (
          <p className="packages-description">
            Ongoing mentorship for students who want consistent guidance throughout their pre-med journey. No long-term contracts—cancel anytime.
          </p>
        )}
      </div>
    </section>
  )
}

function PackageCard({ badge, title, price, priceNote, features, notIncluded, highlight, buttonText, variant = '', packageId, onPurchase, loading }) {
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
          <li key={index}><span className="feature-check">✓</span> {feature}</li>
        ))}
      </ul>
      {notIncluded && notIncluded.length > 0 && (
        <ul className="package-not-included">
          {notIncluded.map((item, index) => (
            <li key={index}><span className="feature-x">✗</span> {item}</li>
          ))}
        </ul>
      )}
      {highlight && (
        <p className="package-highlight">{highlight}</p>
      )}
      <button 
        onClick={handleClick} 
        className={variant.includes('premium') ? 'package-btn-premium' : 'package-btn'}
        disabled={loading}
      >
        {loading ? 'Processing...' : buttonText}
      </button>
    </div>
  )
}
