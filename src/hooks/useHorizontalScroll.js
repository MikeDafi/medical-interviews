import { useRef, useState, useEffect, useCallback } from 'react'

/**
 * Shared hook for horizontal scroll tracking with progress bar.
 * Used by Features and FAQ sections.
 */
export function useHorizontalScroll() {
  const scrollRef = useRef(null)
  const rafRef = useRef(null)
  const dimensionsRef = useRef({ scrollWidth: 0, clientWidth: 0 })
  const [scrollProgress, setScrollProgress] = useState(0)
  const [thumbWidth, setThumbWidth] = useState(30)

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

  const handleTrackClick = useCallback((e) => {
    const el = scrollRef.current
    if (!el) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const trackWidth = rect.width
    const scrollRatio = clickX / trackWidth
    const maxScroll = el.scrollWidth - el.clientWidth
    
    el.scrollTo({ left: scrollRatio * maxScroll, behavior: 'smooth' })
  }, [])

  return { scrollRef, scrollProgress, thumbWidth, handleTrackClick }
}

