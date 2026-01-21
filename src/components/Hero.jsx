// Helper to get cached logo URL via our proxy
const getLogoUrl = (espnUrl) => `/api/logo-proxy?url=${encodeURIComponent(espnUrl)}`

// Row 1: Ivy League + Top Medical Schools - ESPN CDN (cached via proxy)
const row1Logos = [
  { id: 'harvard', name: 'Harvard', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/108.png') },
  { id: 'yale', name: 'Yale', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/43.png') },
  { id: 'princeton', name: 'Princeton', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/163.png') },
  { id: 'columbia', name: 'Columbia', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/171.png') },
  { id: 'penn', name: 'Penn', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/219.png') },
  { id: 'brown', name: 'Brown', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/225.png') },
  { id: 'dartmouth', name: 'Dartmouth', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/159.png') },
  { id: 'cornell', name: 'Cornell', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/172.png') },
  { id: 'stanford', name: 'Stanford', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/24.png') },
  { id: 'duke', name: 'Duke', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/150.png') },
  { id: 'jhu', name: 'Johns Hopkins', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/2172.png') },
  { id: 'northwestern', name: 'Northwestern', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/77.png') },
  { id: 'ucla', name: 'UCLA', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/26.png') },
  { id: 'michigan', name: 'Michigan', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/130.png') },
  { id: 'vanderbilt', name: 'Vanderbilt', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/238.png') },
  { id: 'uchicago', name: 'UChicago', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/2130.png') },
  { id: 'nyu', name: 'NYU', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/2429.png') },
  { id: 'georgetown', name: 'Georgetown', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/46.png') },
  { id: 'berkeley', name: 'Cal Berkeley', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/25.png') },
  { id: 'washington', name: 'Washington', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/264.png') },
]

// Row 2: More Elite Medical Schools - ESPN CDN (cached via proxy)
const row2Logos = [
  { id: 'emory', name: 'Emory', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/2197.png') },
  { id: 'usc', name: 'USC', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/30.png') },
  { id: 'unc', name: 'UNC', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/153.png') },
  { id: 'virginia', name: 'Virginia', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/258.png') },
  { id: 'pitt', name: 'Pittsburgh', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/221.png') },
  { id: 'bu', name: 'Boston University', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/104.png') },
  { id: 'cwru', name: 'Case Western', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/2086.png') },
  { id: 'baylor', name: 'Baylor', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/239.png') },
  { id: 'wakeforest', name: 'Wake Forest', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/154.png') },
  { id: 'rice', name: 'Rice', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/242.png') },
  { id: 'tufts', name: 'Tufts', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/2610.png') },
  { id: 'rochester', name: 'Rochester', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/235.png') },
  { id: 'tulane', name: 'Tulane', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/2655.png') },
  { id: 'bc', name: 'Boston College', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/103.png') },
  { id: 'notredame', name: 'Notre Dame', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/87.png') },
  { id: 'wisconsin', name: 'Wisconsin', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/275.png') },
  { id: 'colorado', name: 'Colorado', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/38.png') },
  { id: 'osu', name: 'Ohio State', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/194.png') },
  { id: 'florida', name: 'Florida', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/57.png') },
  { id: 'texas', name: 'Texas', url: getLogoUrl('https://a.espncdn.com/i/teamlogos/ncaa/500/251.png') },
]

const scrollToSection = (e, sectionId) => {
  e.preventDefault()
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
}

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
            <a 
              href="#book" 
              className="cta-btn"
              onClick={(e) => scrollToSection(e, 'book')}
            >
              Book a Session
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
            <a 
              href="#packages" 
              className="cta-btn-secondary"
              onClick={(e) => scrollToSection(e, 'packages')}
            >
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
                  <div className="logo-item" key={`row1-${logo.id}-${index}`}>
                    <img 
                      src={logo.url} 
                      alt={logo.name} 
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="logos-row logos-row-2">
              <div className="logos-track reverse">
                {[...row2Logos, ...row2Logos].map((logo, index) => (
                  <div className="logo-item" key={`row2-${logo.id}-${index}`}>
                    <img 
                      src={logo.url} 
                      alt={logo.name} 
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
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
