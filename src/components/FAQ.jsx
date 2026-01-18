export default function FAQ() {
  const faqs = [
    {
      question: "What's the difference between MMI and traditional interviews?",
      answer: "MMI (Multiple Mini Interviews) are timed stations with different scenarios. Traditional interviews are longer, conversational discussions. Most schools now use MMI but include 1-2 traditional questions. I'll help you prep for what your target schools use."
    },
    {
      question: "How do online sessions work?",
      answer: "We meet via Zoom at your scheduled time. You'll receive a link beforehand. Sessions can be recorded upon request for your review."
    },
    {
      question: "What if I need to reschedule?",
      answer: "Free cancellation and rescheduling available. Just give me a heads up and we'll find a new time that works."
    },
    {
      question: "Which package should I choose?",
      answer: "New to interviews? Start with the trial or beginner session. Have some experience? The package of 3 covers beginner through advanced. Want comprehensive prep? The premium package of 5 includes take-home questions."
    }
  ]

  return (
    <section className="faq-section" id="faq">
      <div className="section-header">
        <h2>Frequently Asked Questions</h2>
      </div>
      <div className="faq-grid">
        {faqs.map((faq, index) => (
          <div className="faq-item" key={index}>
            <h4>{faq.question}</h4>
            <p>{faq.answer}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

