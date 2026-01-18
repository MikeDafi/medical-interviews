import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Login from './Login'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const { user, signOut } = useAuth()

  const handleAuthClick = () => {
    if (user) {
      signOut()
    } else {
      setShowLogin(true)
    }
  }

  return (
    <>
      <header className="header-bar">
        <div className="header-inner">
          <span className="logo-text">Medical One-on-One</span>
          <nav className="nav-menu">
            <a href="#packages" className="nav-link">Packages</a>
            <a href="#about" className="nav-link">About</a>
            <a href="#faq" className="nav-link">FAQ</a>
            <a href="#book" className="nav-link">Contact</a>
            {user ? (
              <div className="user-menu">
                <img 
                  src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}`} 
                  alt="Profile" 
                  className="user-avatar"
                />
                <button onClick={handleAuthClick} className="nav-btn logout-btn">
                  Sign Out
                </button>
              </div>
            ) : (
              <button onClick={handleAuthClick} className="nav-btn">
                Sign In
              </button>
            )}
          </nav>

          <button 
            className="mobile-menu-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {mobileMenuOpen && (
            <div className="mobile-menu">
              <a href="#packages" onClick={() => setMobileMenuOpen(false)}>Packages</a>
              <a href="#about" onClick={() => setMobileMenuOpen(false)}>About</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
              <a href="#book" onClick={() => setMobileMenuOpen(false)}>Contact</a>
              {user ? (
                <button onClick={() => { handleAuthClick(); setMobileMenuOpen(false); }} className="nav-btn-mobile logout-btn">
                  Sign Out
                </button>
              ) : (
                <button onClick={() => { setShowLogin(true); setMobileMenuOpen(false); }} className="nav-btn-mobile">
                  Sign In
                </button>
              )}
            </div>
          )}
        </div>
      </header>
      
      {showLogin && <Login onClose={() => setShowLogin(false)} />}
    </>
  )
}
