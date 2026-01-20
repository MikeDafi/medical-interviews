export default function FAQ() {
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
    }
  ]

  return (
    <section className="faq-section" id="faq">
      <div className="section-header">
        <h2>Frequently Asked Questions</h2>
      </div>
      <div className="faq-grid">
        {faqs.map((faq) => (
          <div className="faq-item" key={faq.id}>
            <h4>{faq.question}</h4>
            <p>{faq.answer}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
