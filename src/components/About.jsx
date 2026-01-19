export default function About() {
  const credentials = [
    {
      title: "Current M1 at Rosalind Franklin",
      description: "Part of the incoming M1 student panel for admissions review and interview feedback"
    },
    {
      title: "Accepted First Cycle",
      description: "Successfully navigated the medical school admissions process"
    },
    {
      title: "Real Interview Experience",
      description: "Interviewed candidates for both job positions and medical school admissions"
    },
    {
      title: "100s of Hours of Mock Interviews",
      description: "Extensive experience with both traditional and MMI formats"
    }
  ]

  return (
    <section className="about-section" id="about">
      <div className="about-content">
        <div className="about-left">
          <h2>Your Interview Coach</h2>
          <p className="coach-name">Ashley Kumar</p>
          <div className="about-credentials">
            {credentials.map((credential, index) => (
              <div className="credential" key={index}>
                <div>
                  <strong>{credential.title}</strong>
                  <p>{credential.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="about-quote">
            <p>"Look, I've been exactly where you are. The nerves before interviews, the uncertainty about what they're really looking for. After going through it myself and now being on the other side, I know what works. Let me help you feel confident walking into that room."</p>
          </div>
        </div>
        <div className="about-right">
          <div className="about-image-container">
            <img 
              src="/ashley-kumar.png" 
              alt="Ashley Kumar - Interview Coach"
              className="about-image"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
