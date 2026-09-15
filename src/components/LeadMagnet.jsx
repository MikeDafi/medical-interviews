import { useState } from 'react'

// Legitimate, opt-in email capture: visitors voluntarily submit their own email in exchange for
// a free interview prep guide (see api/leads/index.js -> sendLeadMagnetEmail in api/_lib/email.js
// for the actual content sent). This is the ONLY way this app collects emails for broadcast -
// intentionally consent-based, never sourced from a third-party/external mailing list.
export default function LeadMagnet() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('submitting')
    setError('')

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      })

      if (response.ok) {
        setStatus('success')
      } else {
        const data = await response.json().catch(() => ({}))
        setError(data.error || 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch (err) {
      console.error('Lead signup error:', err)
      setError('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <section className="lead-magnet-section" id="free-guide">
      <div className="lead-magnet-card">
        <span className="lead-magnet-label">FREE GUIDE</span>
        <h2 className="lead-magnet-title">10 Real MMI &amp; Traditional Interview Questions</h2>
        <p className="lead-magnet-copy">
          Get a free guide with real medical school interview questions, plus a quick framework
          for approaching ethics scenarios and behavioral questions. Sent straight to your inbox.
        </p>

        {status === 'success' ? (
          <p className="lead-magnet-success">✅ Check your inbox — your guide is on its way!</p>
        ) : (
          <form className="lead-magnet-form" onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={status === 'submitting'}
              aria-label="Email address"
            />
            <button type="submit" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Sending...' : 'Send Me the Guide'}
            </button>
          </form>
        )}
        {status === 'error' && <p className="lead-magnet-error">{error}</p>}
        <p className="lead-magnet-fineprint">No spam. Unsubscribe anytime. We'll never share your email.</p>
      </div>
    </section>
  )
}
