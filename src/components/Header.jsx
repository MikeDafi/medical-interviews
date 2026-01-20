import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Login from './Login'
import Profile from './Profile'

const scrollToSection = (e, sectionId, callback) => {
  e.preventDefault()
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
  callback?.()
}

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
            <a href="#packages" onClick={(e) => scrollToSection(e, 'packages')} className="nav-link">Packages</a>
            <a href="#about" onClick={(e) => scrollToSection(e, 'about')} className="nav-link">About</a>
            <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className="nav-link">FAQ</a>
            <a href="mailto:premedical1on1@gmail.com" className="nav-link">Contact</a>
            {isAdmin && (
              <Link to="/admin" className="nav-link admin-link">
                Admin
              </Link>
            )}
            {user ? (
              <button 
                type="button" 
                className="user-avatar-btn" 
                onClick={() => setShowProfile(true)}
                aria-label="Open profile"
              >
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
              <button type="button" onClick={() => setShowLogin(true)} className="nav-btn">
                Sign In
              </button>
            )}
          </nav>

          <button 
            type="button"
            className="mobile-menu-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {mobileMenuOpen && (
            <div className="mobile-menu" role="navigation">
              <a href="#packages" onClick={(e) => scrollToSection(e, 'packages', () => setMobileMenuOpen(false))}>Packages</a>
              <a href="#about" onClick={(e) => scrollToSection(e, 'about', () => setMobileMenuOpen(false))}>About</a>
              <a href="#faq" onClick={(e) => scrollToSection(e, 'faq', () => setMobileMenuOpen(false))}>FAQ</a>
              <a href="mailto:premedical1on1@gmail.com" onClick={() => setMobileMenuOpen(false)}>Contact</a>
              {isAdmin && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="nav-btn-mobile admin-link-mobile">
                  Admin Dashboard
                </Link>
              )}
              {user ? (
                <button type="button" onClick={() => { setShowProfile(true); setMobileMenuOpen(false); }} className="nav-btn-mobile">
                  My Profile
                </button>
              ) : (
                <button type="button" onClick={() => { setShowLogin(true); setMobileMenuOpen(false); }} className="nav-btn-mobile">
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
