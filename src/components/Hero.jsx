// Row 1: Ivy League + Top Medical Schools - ESPN CDN
const row1Logos = [
  // All 8 Ivy League Schools
  { name: 'Harvard', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/108.png' },
  { name: 'Yale', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/43.png' },
  { name: 'Princeton', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/163.png' },
  { name: 'Columbia', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/171.png' },
  { name: 'Penn', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/219.png' },
  { name: 'Brown', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/225.png' },
  { name: 'Dartmouth', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/159.png' },
  { name: 'Cornell', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/172.png' },
  // Top Medical Schools
  { name: 'Stanford', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/24.png' },
  { name: 'Duke', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/150.png' },
  { name: 'Johns Hopkins', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/2172.png' },
  { name: 'Northwestern', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/77.png' },
  { name: 'UCLA', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/26.png' },
  { name: 'Michigan', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/130.png' },
  { name: 'Vanderbilt', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/238.png' },
  { name: 'UChicago', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/2130.png' },
  { name: 'NYU', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/2429.png' },
  { name: 'Georgetown', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/46.png' },
  { name: 'Cal Berkeley', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/25.png' },
  { name: 'Washington', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/264.png' },
]

// Row 2: More Elite Medical Schools - ESPN CDN
const row2Logos = [
  { name: 'Emory', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/2197.png' },
  { name: 'USC', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/30.png' },
  { name: 'UNC', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/153.png' },
  { name: 'Virginia', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/258.png' },
  { name: 'Pittsburgh', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/221.png' },
  { name: 'Boston University', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/104.png' },
  { name: 'Case Western', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/2086.png' },
  { name: 'Baylor', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/239.png' },
  { name: 'Wake Forest', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/154.png' },
  { name: 'Rice', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/242.png' },
  { name: 'Tufts', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/2610.png' },
  { name: 'Rochester', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/235.png' },
  { name: 'Tulane', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/2655.png' },
  { name: 'Boston College', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/103.png' },
  { name: 'Notre Dame', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/87.png' },
  { name: 'Wisconsin', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/275.png' },
  { name: 'Colorado', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/38.png' },
  { name: 'Ohio State', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/194.png' },
  { name: 'Florida', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/57.png' },
  { name: 'Texas', url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/251.png' },
]

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
          <div className="hero-logos-container">
            <div className="logos-row logos-row-1">
              <div className="logos-track">
                {[...row1Logos, ...row1Logos].map((logo, index) => (
                  <div className="logo-item" key={`row1-${index}`}>
                    <img src={logo.url} alt={logo.name} />
                  </div>
                ))}
              </div>
            </div>
            <div className="logos-row logos-row-2">
              <div className="logos-track reverse">
                {[...row2Logos, ...row2Logos].map((logo, index) => (
                  <div className="logo-item" key={`row2-${index}`}>
                    <img src={logo.url} alt={logo.name} />
                  </div>
                ))}
              </div>
            </div>
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

