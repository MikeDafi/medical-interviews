import { useEffect, useState } from 'react'

// Package names for display
const PACKAGE_NAMES = {
  trial: '30 Min Trial',
  single: '1 Hour Session',
  package3: 'Package of 3',
  package5: 'Package of 5 (Premium)'
}

export default function PaymentStatus() {
  const [status, setStatus] = useState(null)
  const [packageName, setPackageName] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const payment = params.get('payment')
    const pkg = params.get('package')

    if (payment === 'success' && pkg) {
      setStatus('success')
      setPackageName(PACKAGE_NAMES[pkg] || 'your package')
      
      // Dispatch event so other components refresh from DB
      window.dispatchEvent(new CustomEvent('paymentCompleted'))
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname)
      // Auto-hide after 8 seconds
      setTimeout(() => setStatus(null), 8000)
    } else if (payment === 'cancelled') {
      setStatus('cancelled')
      window.history.replaceState({}, document.title, window.location.pathname)
      setTimeout(() => setStatus(null), 5000)
    }
  }, [])

  if (!status) return null

  return (
    <div className={`payment-status-toast ${status}`}>
      {status === 'success' ? (
        <>
          <div className="payment-status-icon success">✓</div>
          <div className="payment-status-content">
            <strong>Payment Successful!</strong>
            <p>Thank you for purchasing {packageName}. Go book your session now! Also sent you an email for confirmation.</p>
          </div>
        </>
      ) : (
        <>
          <div className="payment-status-icon cancelled">×</div>
          <div className="payment-status-content">
            <strong>Payment Cancelled</strong>
            <p>No worries! Your card was not charged.</p>
          </div>
        </>
      )}
      <button className="payment-status-close" onClick={() => setStatus(null)}>×</button>
    </div>
  )
}

