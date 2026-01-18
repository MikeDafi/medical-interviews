export default function SessionStructure() {
  const structures = [
    {
      level: "Beginner Hour",
      steps: [
        "Talk about past experience & comfort level",
        "Brief main tips and tricks for interviews",
        "Walk through a question together",
        "Mock interview at double time",
        "Review + feedback",
        "Real 7-minute mock interview",
        "Take-home improvement areas"
      ]
    },
    {
      level: "Intermediate Hour",
      steps: [
        "Target your weak MMI categories",
        "Focused advice for specific topics",
        "3 back-to-back mock interviews",
        "Detailed review + feedback",
        "Questions and concerns",
        "Practice plan for next session"
      ]
    },
    {
      level: "Advanced Hour",
      steps: [
        "Full 6-7 mock interview simulation",
        "Complete review and scoring",
        "Work on identified weak points",
        "Advanced technique refinement",
        "Final prep strategies"
      ]
    }
  ]

  return (
    <section className="structure-section" id="structure">
      <div className="section-header">
        <h2>How Sessions Work</h2>
        <p>Structured progression from nervous beginner to confident interviewer</p>
      </div>

      <div className="structure-tabs">
        {structures.map((structure, index) => (
          <div className="structure-card" key={index}>
            <h4>{structure.level}</h4>
            <ol>
              {structure.steps.map((step, stepIndex) => (
                <li key={stepIndex}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  )
}
