export default function Packages() {
  return (
    <section className="packages-section" id="packages">
      <div className="section-header marketing-header">
        <h2>Prep Packages</h2>
        <p>(Interviews, Advice, or Resume Review)</p>
      </div>
      
      <div className="packages-grid">
        <PackageCard
          badge="Try It Out"
          title="30 Min Trial"
          price="$30"
          features={[
            "Brief introduction & assessment",
            "One MMI question practice",
            "7 min timed response (2 min prep + 5 min answer)",
            "Immediate feedback & debrief"
          ]}
          buttonText="Book Trial"
          variant="trial"
        />

        <PackageCard
          title="1 Hour Session"
          price="$100"
          features={[
            "Full prep & coaching session",
            "MMI or traditional interview practice",
            "Detailed feedback & review",
            "Take-home notes on improvement areas"
          ]}
          buttonText="Book Session"
        />

        <PackageCard
          badge="Popular"
          title="Package of 3"
          price="$250"
          priceNote="Save $50"
          features={[
            "3 one-hour sessions",
            "Progressive skill building",
            "Beginner to Intermediate to Advanced",
            "Comprehensive feedback after each"
          ]}
          buttonText="Get Package"
          variant="popular"
        />

        <PackageCard
          badge="Premium"
          title="Package of 5"
          price="$450"
          priceNote="Save $50"
          features={[
            "5 one-hour sessions",
            "Full interview mastery program",
            "Take-home interview questions included",
            "Priority scheduling",
            "Session recordings available"
          ]}
          buttonText="Get Premium"
          variant="premium"
        />
      </div>
    </section>
  )
}

function PackageCard({ badge, title, price, priceNote, features, buttonText, variant = '' }) {
  return (
    <div className={`package-card ${variant}`}>
      {badge && <div className="package-badge">{badge}</div>}
      <h3>{title}</h3>
      <div className="package-price">
        <span className="price">{price}</span>
        {priceNote && <span className="price-note">{priceNote}</span>}
      </div>
      <ul className="package-features">
        {features.map((feature, index) => (
          <li key={index}>{feature}</li>
        ))}
      </ul>
      <a href="#book" className={variant === 'premium' ? 'package-btn-premium' : 'package-btn'}>
        {buttonText}
      </a>
    </div>
  )
}
