// Row 1: Ivy League & Top Medical Schools - Optimized WebP (256x256, ~8KB each)
const row1Logos = [
  { id: 'harvard', name: 'Harvard', url: '/logos/harvard.webp' },
  { id: 'yale', name: 'Yale', url: '/logos/yale.webp' },
  { id: 'princeton', name: 'Princeton', url: '/logos/princeton.webp' },
  { id: 'columbia', name: 'Columbia', url: '/logos/columbia.webp' },
  { id: 'penn', name: 'Penn', url: '/logos/penn.webp' },
  { id: 'brown', name: 'Brown', url: '/logos/brown.webp' },
  { id: 'dartmouth', name: 'Dartmouth', url: '/logos/dartmouth.webp' },
  { id: 'cornell', name: 'Cornell', url: '/logos/cornell.webp' },
  { id: 'stanford', name: 'Stanford', url: '/logos/stanford.webp' },
  { id: 'duke', name: 'Duke', url: '/logos/duke.webp' },
  { id: 'jhu', name: 'Johns Hopkins', url: '/logos/jhu.webp' },
  { id: 'northwestern', name: 'Northwestern', url: '/logos/northwestern.webp' },
  { id: 'ucla', name: 'UCLA', url: '/logos/ucla.webp' },
  { id: 'michigan', name: 'Michigan', url: '/logos/michigan.webp' },
  { id: 'vanderbilt', name: 'Vanderbilt', url: '/logos/vanderbilt.webp' },
  { id: 'uchicago', name: 'UChicago', url: '/logos/uchicago.webp' },
  { id: 'nyu', name: 'NYU', url: '/logos/nyu.webp' },
  { id: 'georgetown', name: 'Georgetown', url: '/logos/georgetown.webp' },
  { id: 'berkeley', name: 'Cal Berkeley', url: '/logos/berkeley.webp' },
  { id: 'washington', name: 'Washington', url: '/logos/washington.webp' },
]

// Row 2: More Elite Medical Schools - Optimized WebP (256x256, ~8KB each)
const row2Logos = [
  { id: 'emory', name: 'Emory', url: '/logos/emory.webp' },
  { id: 'usc', name: 'USC', url: '/logos/usc.webp' },
  { id: 'unc', name: 'UNC', url: '/logos/unc.webp' },
  { id: 'virginia', name: 'Virginia', url: '/logos/virginia.webp' },
  { id: 'pitt', name: 'Pittsburgh', url: '/logos/pitt.webp' },
  { id: 'bu', name: 'Boston University', url: '/logos/bu.webp' },
  { id: 'cwru', name: 'Case Western', url: '/logos/cwru.webp' },
  { id: 'baylor', name: 'Baylor', url: '/logos/baylor.webp' },
  { id: 'wakeforest', name: 'Wake Forest', url: '/logos/wakeforest.webp' },
  { id: 'rice', name: 'Rice', url: '/logos/rice.webp' },
  { id: 'tufts', name: 'Tufts', url: '/logos/tufts.webp' },
  { id: 'rochester', name: 'Rochester', url: '/logos/rochester.webp' },
  { id: 'tulane', name: 'Tulane', url: '/logos/tulane.webp' },
  { id: 'bc', name: 'Boston College', url: '/logos/bc.webp' },
  { id: 'notredame', name: 'Notre Dame', url: '/logos/notredame.webp' },
  { id: 'wisconsin', name: 'Wisconsin', url: '/logos/wisconsin.webp' },
  { id: 'colorado', name: 'Colorado', url: '/logos/colorado.webp' },
  { id: 'osu', name: 'Ohio State', url: '/logos/osu.webp' },
  { id: 'florida', name: 'Florida', url: '/logos/florida.webp' },
  { id: 'texas', name: 'Texas', url: '/logos/texas.webp' },
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
