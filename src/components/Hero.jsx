// Row 1: Ivy League + Top Medical Schools - ESPN CDN (browser cached)
// Row 1: Ivy League & Top Medical Schools - Local assets for better SEO & performance
const row1Logos = [
  { id: 'harvard', name: 'Harvard', url: '/logos/harvard.png' },
  { id: 'yale', name: 'Yale', url: '/logos/yale.png' },
  { id: 'princeton', name: 'Princeton', url: '/logos/princeton.png' },
  { id: 'columbia', name: 'Columbia', url: '/logos/columbia.png' },
  { id: 'penn', name: 'Penn', url: '/logos/penn.png' },
  { id: 'brown', name: 'Brown', url: '/logos/brown.png' },
  { id: 'dartmouth', name: 'Dartmouth', url: '/logos/dartmouth.png' },
  { id: 'cornell', name: 'Cornell', url: '/logos/cornell.png' },
  { id: 'stanford', name: 'Stanford', url: '/logos/stanford.png' },
  { id: 'duke', name: 'Duke', url: '/logos/duke.png' },
  { id: 'jhu', name: 'Johns Hopkins', url: '/logos/jhu.png' },
  { id: 'northwestern', name: 'Northwestern', url: '/logos/northwestern.png' },
  { id: 'ucla', name: 'UCLA', url: '/logos/ucla.png' },
  { id: 'michigan', name: 'Michigan', url: '/logos/michigan.png' },
  { id: 'vanderbilt', name: 'Vanderbilt', url: '/logos/vanderbilt.png' },
  { id: 'uchicago', name: 'UChicago', url: '/logos/uchicago.png' },
  { id: 'nyu', name: 'NYU', url: '/logos/nyu.png' },
  { id: 'georgetown', name: 'Georgetown', url: '/logos/georgetown.png' },
  { id: 'berkeley', name: 'Cal Berkeley', url: '/logos/berkeley.png' },
  { id: 'washington', name: 'Washington', url: '/logos/washington.png' },
]

// Row 2: More Elite Medical Schools - Local assets for better SEO & performance
const row2Logos = [
  { id: 'emory', name: 'Emory', url: '/logos/emory.png' },
  { id: 'usc', name: 'USC', url: '/logos/usc.png' },
  { id: 'unc', name: 'UNC', url: '/logos/unc.png' },
  { id: 'virginia', name: 'Virginia', url: '/logos/virginia.png' },
  { id: 'pitt', name: 'Pittsburgh', url: '/logos/pitt.png' },
  { id: 'bu', name: 'Boston University', url: '/logos/bu.png' },
  { id: 'cwru', name: 'Case Western', url: '/logos/cwru.png' },
  { id: 'baylor', name: 'Baylor', url: '/logos/baylor.png' },
  { id: 'wakeforest', name: 'Wake Forest', url: '/logos/wakeforest.png' },
  { id: 'rice', name: 'Rice', url: '/logos/rice.png' },
  { id: 'tufts', name: 'Tufts', url: '/logos/tufts.png' },
  { id: 'rochester', name: 'Rochester', url: '/logos/rochester.png' },
  { id: 'tulane', name: 'Tulane', url: '/logos/tulane.png' },
  { id: 'bc', name: 'Boston College', url: '/logos/bc.png' },
  { id: 'notredame', name: 'Notre Dame', url: '/logos/notredame.png' },
  { id: 'wisconsin', name: 'Wisconsin', url: '/logos/wisconsin.png' },
  { id: 'colorado', name: 'Colorado', url: '/logos/colorado.png' },
  { id: 'osu', name: 'Ohio State', url: '/logos/osu.png' },
  { id: 'florida', name: 'Florida', url: '/logos/florida.png' },
  { id: 'texas', name: 'Texas', url: '/logos/texas.png' },
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
                      alt={`${logo.name} Medical School`}
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
                      alt={`${logo.name} Medical School`}
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
