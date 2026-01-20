import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GoogleIcon from './icons/GoogleIcon'

export default function Login({ onClose }) {
  const { signInWithGoogle, loading } = useAuth()

  const handleGoogleLogin = () => {
    signInWithGoogle()
    onClose()
  }

  return (
    <div className="login-overlay" onClick={onClose}>
      <div className="login-modal" onClick={e => e.stopPropagation()}>
        <button className="login-close" onClick={onClose} aria-label="Close login modal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        
        <div className="login-content">
          <h2>Welcome Back</h2>
          <p>Sign in to book sessions and track your progress</p>
          
          <button 
            className="google-login-btn" 
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <GoogleIcon />
            Continue with Google
          </button>
          
          <p className="login-terms">
            By signing in, you agree to our{' '}
            <Link to="/terms" onClick={onClose}>Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" onClick={onClose}>Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
