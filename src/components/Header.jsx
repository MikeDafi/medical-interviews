import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Login from './Login'
import Profile from './Profile'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
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
          <span className="logo-text">PreMedical 1-on-1</span>
          <nav className="nav-menu">
            <a href="#packages" className="nav-link">Packages</a>
            <a href="#about" className="nav-link">About</a>
            <a href="#faq" className="nav-link">FAQ</a>
            <a href="#book" className="nav-link">Contact</a>
            {user ? (
              <div className="user-menu">
                <button className="user-avatar-btn" onClick={() => setShowProfile(true)}>
                  <img 
                    src={user.picture || `https://ui-avatars.com/api/?name=${user.name || user.email}`} 
                    alt="Profile" 
                    className="user-avatar"
                  />
                </button>
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
                <>
                  <button onClick={() => { setShowProfile(true); setMobileMenuOpen(false); }} className="nav-btn-mobile">
                    My Profile
                  </button>
                  <button onClick={() => { handleAuthClick(); setMobileMenuOpen(false); }} className="nav-btn-mobile logout-btn">
                    Sign Out
                  </button>
                </>
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
