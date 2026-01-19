import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Login from './Login'
import Profile from './Profile'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const { user, isAdmin } = useAuth()

  return (
    <>
      <header className="header-bar">
        <div className="header-inner">
          <span className="logo-text">PreMedical 1-on-1</span>
          <nav className="nav-menu">
            <a href="#packages" className="nav-link">Packages</a>
            <a href="#about" className="nav-link">About</a>
            <a href="#faq" className="nav-link">FAQ</a>
            <a href="#book" className="nav-link">Contact</a>
            {isAdmin && (
              <Link to="/admin" className="nav-link admin-link">
                Admin
              </Link>
            )}
            {user ? (
              <button className="user-avatar-btn" onClick={() => setShowProfile(true)}>
                <img 
                  src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email)}&background=0d9488&color=fff`} 
                  alt="Profile" 
                  className="user-avatar"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email)}&background=0d9488&color=fff`
                  }}
                />
              </button>
            ) : (
              <button onClick={() => setShowLogin(true)} className="nav-btn">
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
              {isAdmin && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="nav-btn-mobile admin-link-mobile">
                  Admin Dashboard
                </Link>
              )}
              {user ? (
                <button onClick={() => { setShowProfile(true); setMobileMenuOpen(false); }} className="nav-btn-mobile">
                  My Profile
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
      {showProfile && <Profile onClose={() => setShowProfile(false)} />}
    </>
  )
}
