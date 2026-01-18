import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="app">
      {/* Background Image with Blur */}
      <div className="background-layer">
        <img 
          src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1920&q=80" 
          alt="" 
          className="bg-image"
        />
        <div className="bg-overlay"></div>
      </div>

      {/* Sticky Header */}
      <header className={`header-fixed ${scrolled ? 'scrolled' : ''}`}>
        <div className="header-inner">
          <div className="logo">
            <span className="logo-text">Medical One-on-One</span>
          </div>
          
          <nav className="nav-menu">
            <a href="#services" className="nav-link">FAQ</a>
            <a href="#contact" className="nav-link">Contact Us</a>
            <a href="#packages" className="nav-link">Packages</a>
            <a href="#book" className="nav-btn">Book Now</a>
          </nav>

          <button 
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {menuOpen && (
            <div className="mobile-menu">
              <a href="#services" onClick={() => setMenuOpen(false)}>FAQ</a>
              <a href="#contact" onClick={() => setMenuOpen(false)}>Contact Us</a>
              <a href="#packages" onClick={() => setMenuOpen(false)}>Packages</a>
              <a href="#book" className="nav-btn-mobile" onClick={() => setMenuOpen(false)}>Book Now</a>
            </div>
          )}
        </div>
      </header>

      {/* Main Container with Border */}
      <div className="main-container">
        <div className="inner-border">
          
          {/* Hero Section */}
          <section className="hero">
            <div className="hero-content">
              <div className="hero-left">
                <h1 className="hero-title">
                  <span className="title-line-1">Interviews</span>
                  <span className="title-line-2">.advice</span>
                  <span className="title-line-3">one-on-one</span>
                </h1>
                <p className="hero-subtitle">
                  Expert coaching and mock interviews to help you secure your dream position in healthcare.
                </p>
                <button className="cta-btn">
                  Get Started
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
                
                {/* Category Icons */}
                <div className="category-icons">
                  <button className="category-icon">
                    <span>🩺</span>
                  </button>
                  <button className="category-icon active">
                    <span>💼</span>
                  </button>
                  <button className="category-icon">
                    <span>📋</span>
                  </button>
                  <button className="category-icon">
                    <span>🎯</span>
                  </button>
                </div>
              </div>
              
              <div className="hero-right">
                <div className="hero-image-container">
                  <img 
                    src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&h=600&fit=crop" 
                    alt="Medical professional" 
                    className="hero-image"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Services Cards Section */}
          <section className="services-section fade-section" id="services">
            <div className="services-wrapper">
              <button className="nav-arrow nav-prev">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              
              <div className="service-cards">
                <div className="service-card">
                  <div className="service-card-image">
                    <img 
                      src="https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&h=200&fit=crop" 
                      alt="Mock Interview"
                    />
                  </div>
                  <button className="wishlist-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                    </svg>
                  </button>
                  <h3 className="service-card-title">Mock Interview</h3>
                  <p className="service-card-desc">1-on-1 Practice Session</p>
                  <div className="service-card-footer">
                    <span className="service-price">$ 99.00</span>
                    <button className="book-btn">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="service-card">
                  <div className="service-card-image">
                    <img 
                      src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&h=200&fit=crop" 
                      alt="Resume Review"
                    />
                  </div>
                  <button className="wishlist-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                    </svg>
                  </button>
                  <h3 className="service-card-title">CV Review</h3>
                  <p className="service-card-desc">Expert Feedback</p>
                  <div className="service-card-footer">
                    <span className="service-price">$ 49.00</span>
                    <button className="book-btn">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <button className="nav-arrow nav-next">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>

              <div className="services-text">
                <h2>Expert Coaching for<br />Medical Professionals</h2>
                <p>
                  Our team of experienced healthcare recruiters and physicians 
                  provide personalized interview preparation to help you succeed 
                  in your medical career journey.
                </p>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section className="about-section fade-section">
            <div className="about-content">
              <div className="about-left">
                <h2>
                  Our team of experienced physicians and<br />
                  healthcare professionals provide<br />
                  personalized interview coaching.
                </h2>
                <p>
                  With years of experience in medical recruitment and residency 
                  interviews, we understand what it takes to stand out. Our 
                  coaches have helped hundreds of candidates secure positions 
                  at top medical institutions.
                </p>
              </div>
              <div className="about-right">
                <div className="about-image-container">
                  <img 
                    src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop" 
                    alt="Medical consultation"
                    className="about-image"
                  />
                  <div className="price-tag">
                    <span>From $49</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Packages Section */}
          <section className="packages-section fade-section" id="packages">
            <div className="packages-content">
              <div className="package-mockups">
                <div className="package-card-left">
                  <div className="package-screen">
                    <div className="package-header">
                      <span className="package-icon">🩺</span>
                    </div>
                    <h4>Interview Prep</h4>
                    <p className="package-subtitle">Comprehensive preparation</p>
                    <div className="package-features">
                      <span>✓ Mock Interviews</span>
                      <span>✓ CV Review</span>
                      <span>✓ Question Bank</span>
                      <span>✓ Feedback Report</span>
                    </div>
                    <div className="package-items">
                      <div className="package-item">
                        <div className="package-item-icon">📝</div>
                        <span>Basic Plan</span>
                        <small>2 Sessions</small>
                        <strong>$ 149.00</strong>
                      </div>
                      <div className="package-item">
                        <div className="package-item-icon">⭐</div>
                        <span>Premium Plan</span>
                        <small>5 Sessions</small>
                        <strong>$ 349.00</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="package-card-right">
                  <div className="package-screen">
                    <div className="carousel-nav">
                      <button className="carousel-btn">‹</button>
                      <span className="carousel-indicator">|</span>
                      <button className="carousel-btn">›</button>
                    </div>
                    <div className="package-image">
                      <img 
                        src="https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=200&h=200&fit=crop" 
                        alt="Consultation"
                      />
                    </div>
                    <div className="package-info">
                      <h4>Residency Package</h4>
                      <p>Complete preparation for residency interviews including 
                      MMI practice, traditional interviews, and application review. 
                      Perfect for medical students.</p>
                      <div className="package-footer">
                        <div className="package-price">
                          <small>Starting at</small>
                          <strong>$ 299.00</strong>
                        </div>
                        <button className="book-now-btn">
                          Book Now
                          <span className="btn-plus">+</span>
                        </button>
                      </div>
                    </div>
                    <div className="session-time">
                      <span>⏱ 60 Min</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="packages-info">
                <h2>Flexible Packages</h2>
                <p>
                  Choose from our range of interview preparation packages 
                  designed for medical students, residents, and practicing 
                  physicians. Available on web and mobile platforms.
                </p>
                <div className="platform-buttons">
                  <button className="platform-btn primary">
                    <svg width="20" height="24" viewBox="0 0 20 24" fill="currentColor">
                      <path d="M15.769 12.642c-.026-2.651 2.164-3.925 2.262-3.988-1.232-1.8-3.15-2.047-3.833-2.075-1.632-.165-3.186.961-4.013.961-.827 0-2.104-.937-3.46-.912-1.781.026-3.423 1.036-4.339 2.631-1.85 3.208-.473 7.961 1.33 10.564.882 1.276 1.933 2.711 3.314 2.66 1.33-.053 1.833-.861 3.441-.861 1.608 0 2.061.861 3.467.834 1.431-.026 2.337-1.302 3.213-2.585 1.013-1.483 1.43-2.919 1.456-2.993-.032-.013-2.794-1.072-2.821-4.253l-.017.017z"/>
                    </svg>
                    <div className="platform-text">
                      <small>Download on the</small>
                      <span>App Store</span>
                    </div>
                  </button>
                  <button className="platform-btn secondary">
                    <svg width="20" height="22" viewBox="0 0 20 22" fill="currentColor">
                      <path d="M.542 0C.25.266 0 .686 0 1.205v19.59c0 .52.25.94.542 1.205l.057.053L11.23 11.47v-.134L.6.054.542 0z"/>
                      <path d="M14.778 15.02l-3.548-3.548v-.134l3.548-3.548.08.046 4.205 2.39c1.2.68 1.2 1.795 0 2.476l-4.205 2.39-.08.028z"/>
                    </svg>
                    <div className="platform-text">
                      <small>GET IT ON</small>
                      <span>Google Play</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="cta-section fade-section" id="book">
            <div className="cta-content">
              <div className="cta-text">
                <span className="cta-label">LET'S TALK.</span>
                <h2>Ready to Book a Session?</h2>
              </div>
              <button className="contact-btn">Contact Us Now</button>
            </div>
            <div className="cta-divider"></div>
            <p className="cta-description">
              We're a team of experienced medical professionals dedicated to helping 
              you succeed in your healthcare career journey.
            </p>
          </section>

          {/* Footer */}
          <footer className="footer fade-section" id="contact">
            <div className="footer-content">
              <div className="footer-brand">
                <span className="footer-logo">Medical One-on-One</span>
              </div>
              
              <div className="footer-links">
                <div className="footer-column">
                  <h4>Our Services</h4>
                  <ul>
                    <li><a href="#">Mock Interviews</a></li>
                    <li><a href="#">CV Review</a></li>
                    <li><a href="#">MMI Prep</a></li>
                    <li><a href="#">Career Coaching</a></li>
                  </ul>
                </div>
                
                <div className="footer-column">
                  <h4>Company</h4>
                  <ul>
                    <li><a href="#">About Us</a></li>
                    <li><a href="#">Our Coaches</a></li>
                    <li><a href="#">Testimonials</a></li>
                  </ul>
                </div>
                
                <div className="footer-column">
                  <h4>Contact</h4>
                  <ul>
                    <li>support@medicaloneonone.com</li>
                    <li>1-800-MED-PREP</li>
                    <li>Mon-Fri: 9AM-6PM EST</li>
                  </ul>
                </div>
              </div>
              
              <div className="footer-image">
                <img 
                  src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=150&h=150&fit=crop" 
                  alt="Medical"
                  className="footer-img"
                />
              </div>
            </div>
          </footer>

        </div>
      </div>
    </div>
  )
}

export default App
