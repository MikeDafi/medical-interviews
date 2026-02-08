import { useRef, useState, useEffect, useCallback } from 'react'

export default function Features() {
  const scrollRef = useRef(null)
  const rafRef = useRef(null)
  const dimensionsRef = useRef({ scrollWidth: 0, clientWidth: 0 })
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

  // Cache dimensions on resize (expensive layout reads)
  const updateDimensions = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    dimensionsRef.current = {
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth
    }
    const maxScroll = dimensionsRef.current.scrollWidth - dimensionsRef.current.clientWidth
    if (maxScroll > 0) {
      setThumbWidth((dimensionsRef.current.clientWidth / dimensionsRef.current.scrollWidth) * 100)
    }
  }, [])

  // Update scroll progress using cached dimensions (cheap)
  const updateScrollProgress = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    
    // Cancel any pending RAF
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    
    rafRef.current = requestAnimationFrame(() => {
      const { scrollWidth, clientWidth } = dimensionsRef.current
      const maxScroll = scrollWidth - clientWidth
      if (maxScroll > 0) {
        setScrollProgress((el.scrollLeft / maxScroll) * 100)
      }
    })
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    updateDimensions()
    el.addEventListener('scroll', updateScrollProgress, { passive: true })
    window.addEventListener('resize', updateDimensions)
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      el.removeEventListener('scroll', updateScrollProgress)
      window.removeEventListener('resize', updateDimensions)
    }
  }, [updateDimensions, updateScrollProgress])

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
            <h3>{feature.title}</h3>
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
