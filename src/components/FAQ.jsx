import { useRef, useState, useEffect } from 'react'

export default function FAQ() {
  const scrollRef = useRef(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [thumbWidth, setThumbWidth] = useState(30)

  const faqs = [
    {
      id: 'school-targeting',
      question: "Can prep be targeted to my specific school?",
      answer: "Absolutely! If you want sessions focused specifically on UCLA, Stanford, or any other school's interview style and values, we can tailor the questions and feedback to match what that school looks for. Just let me know your target schools when booking."
    },
    {
      id: 'scheduling',
      question: "What if the available times don't work for me?",
      answer: "The calendar shows my general availability, but I know schedules can be tricky. Email me at premedical1on1@gmail.com and we can work out a time that fits both of us."
    },
    {
      id: 'custom-packages',
      question: "What if I want more than the 5-session package?",
      answer: "Need more intensive prep? Email me at premedical1on1@gmail.com and we can put together a custom package based on what you need. Happy to work with you on pricing for larger commitments."
    },
    {
      id: 'experience-level',
      question: "How do I know if I'm beginner, intermediate, or advanced?",
      answer: "We'll figure that out together in your first session. I'll assess your comfort level, past experience, and how you handle a practice question. From there, I'll recommend the right starting point. Most people start at beginner and that's totally fine."
    },
    {
      id: 'scoring',
      question: "How are my mock interviews scored?",
      answer: "I use the same criteria real interviewers use: communication clarity, ethical reasoning, empathy, self-awareness, and structure. You'll get detailed feedback on each area plus an overall assessment of where you stand and what to work on."
    },
    {
      id: 'mmi-vs-traditional',
      question: "What's the difference between MMI and traditional interviews?",
      answer: "MMI (Multiple Mini Interviews) are timed stations with different scenarios. Traditional interviews are longer, conversational discussions. Most schools now use MMI but include 1-2 traditional questions. I'll help you prep for what your target schools use."
    },
    {
      id: 'session-recording',
      question: "Can I get a recording of my mock interview?",
      answer: "Yes! All sessions can be recorded so you can review your performance later. Watching yourself answer questions is one of the best ways to identify areas for improvement - body language, filler words, pacing. I'll share the recording within 24 hours after our session."
    },
    {
      id: 'when-to-start',
      question: "How far in advance should I start preparing?",
      answer: "Ideally, start 4-6 weeks before your first interview. This gives you enough time to build skills gradually without cramming. If your interview is sooner, we can do intensive prep - just be upfront about your timeline so we can prioritize what matters most."
    },
    {
      id: 'reapplicant',
      question: "I'm a reapplicant. Can you help me improve?",
      answer: "Absolutely. Reapplicants often know exactly where they struggled before. We'll do a deep dive into what went wrong, whether it was storytelling, handling tough questions, or projecting confidence. Many of my most successful students have been reapplicants who just needed targeted feedback."
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
    <section className="faq-section" id="faq">
      <div className="section-header">
        <h2>Frequently Asked Questions</h2>
      </div>
      <div className="faq-grid" ref={scrollRef}>
        {faqs.map((faq) => (
          <div className="faq-item" key={faq.id}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </div>
        ))}
      </div>
      <div className="faq-scroll-track" onClick={handleTrackClick}>
        <div 
          className="faq-scroll-thumb" 
          style={{ 
            width: `${Math.max(thumbWidth, 15)}%`,
            left: `${scrollProgress * (100 - Math.max(thumbWidth, 15)) / 100}%`
          }}
        />
      </div>
    </section>
  )
}
