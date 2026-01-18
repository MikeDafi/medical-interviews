export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-left">
          <h1 className="hero-title">
            <span className="title-line">Mock Interviews.</span>
            <span className="title-line">Pre-Medical Advice.</span>
            <span className="title-line">Resume Review.</span>
            <span className="title-line-accent">One on One</span>
          </h1>
          <p className="hero-subtitle">
            Expert coaching from a current medical student who's been on both sides of the interview table. 
            Brutally honest feedback to push you towards excellence.
          </p>
          <div className="hero-buttons">
            <a href="#book" className="cta-btn">
              Book a Session
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
            <a href="#packages" className="cta-btn-secondary">
              View Packages
            </a>
          </div>
          <div className="hero-features">
            <span>Online via Zoom</span>
            <span>Free to Cancel</span>
            <span>Session Recording Available</span>
          </div>
        </div>
        
        <div className="hero-right">
          <div className="hero-image-container">
            <img 
              src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=800&fit=crop" 
              alt="Medical professional" 
              className="hero-image"
            />
            <div className="hero-badge">
              <span className="badge-number">100s</span>
              <span className="badge-text">of mock interviews conducted</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

