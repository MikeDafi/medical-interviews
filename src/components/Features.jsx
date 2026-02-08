import { useRef, useState, useEffect } from 'react'

export default function Features() {
  const scrollRef = useRef(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [thumbWidth, setThumbWidth] = useState(30)

  const features = [
    {
      id: 'realistic-questions',
      title: "Realistic Questions",
      description: "Mock interview questions tailored to your target school's values and interview style"
    },
    {
      id: 'online-convenient',
      title: "Online & Convenient",
      description: "Easy Zoom sessions from home or on the go. No travel required."
    },
    {
      id: 'take-home-notes',
      title: "Take-Home Notes",
      description: "Detailed feedback notes after each session to guide your improvement"
    },
    {
      id: 'session-recordings',
      title: "Session Recordings",
      description: "Option to record sessions so you can review your performance"
    },
    {
      id: 'mmi-traditional',
      title: "MMI + Traditional",
      description: "Prep for both interview types based on what your target schools use"
    },
    {
      id: 'free-cancellation',
      title: "Free Cancellation",
      description: "Life happens. Cancel anytime with no penalty."
    }
  ]

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const updateScroll = () => {
      const maxScroll = el.scrollWidth - el.clientWidth
      if (maxScroll > 0) {
        setScrollProgress((el.scrollLeft / maxScroll) * 100)
        setThumbWidth((el.clientWidth / el.scrollWidth) * 100)
      }
    }

    updateScroll()
    el.addEventListener('scroll', updateScroll)
    window.addEventListener('resize', updateScroll)
    
    return () => {
      el.removeEventListener('scroll', updateScroll)
      window.removeEventListener('resize', updateScroll)
    }
  }, [])

  const handleTrackClick = (e) => {
    const el = scrollRef.current
    if (!el) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const trackWidth = rect.width
    const scrollRatio = clickX / trackWidth
    const maxScroll = el.scrollWidth - el.clientWidth
    
    el.scrollTo({ left: scrollRatio * maxScroll, behavior: 'smooth' })
  }

  return (
    <section className="features-section">
      <div className="section-header">
        <h2>Why Prep With Me?</h2>
      </div>
      <div className="features-grid" ref={scrollRef}>
        {features.map((feature) => (
          <div className="feature-card" key={feature.id}>
            <h4>{feature.title}</h4>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>
      <div className="features-scroll-track" onClick={handleTrackClick}>
        <div 
          className="features-scroll-thumb" 
          style={{ 
            width: `${Math.max(thumbWidth, 15)}%`,
            left: `${scrollProgress * (100 - Math.max(thumbWidth, 15)) / 100}%`
          }}
        />
      </div>
    </section>
  )
}
