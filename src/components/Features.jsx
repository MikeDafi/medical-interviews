export default function Features() {
  const features = [
    {
      title: "Realistic Questions",
      description: "Mock interview questions tailored to your target school's values and interview style"
    },
    {
      title: "Online & Convenient",
      description: "Easy Zoom sessions from home or on the go. No travel required."
    },
    {
      title: "Take-Home Notes",
      description: "Detailed feedback notes after each session to guide your improvement"
    },
    {
      title: "Session Recordings",
      description: "Option to record sessions so you can review your performance"
    },
    {
      title: "MMI + Traditional",
      description: "Prep for both interview types based on what your target schools use"
    },
    {
      title: "Free Cancellation",
      description: "Life happens. Cancel anytime with no penalty."
    }
  ]

  return (
    <section className="features-section">
      <div className="section-header">
        <h2>Why Prep With Me?</h2>
      </div>
      <div className="features-grid">
        {features.map((feature, index) => (
          <div className="feature-card" key={index}>
            <h4>{feature.title}</h4>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

