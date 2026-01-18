export default function Experiences() {
  const testimonials = [
    {
      name: "Sarah M.",
      school: "Accepted to Northwestern",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=600&fit=crop",
      review: "Ashley completely transformed my interview skills. After 3 sessions, I went from freezing up to confidently handling any question thrown at me."
    },
    {
      name: "James L.",
      school: "Accepted to UCLA",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop",
      review: "The MMI practice was incredibly realistic. I felt like I had already done my interview by the time the real one came around."
    },
    {
      name: "Priya K.",
      school: "Accepted to Duke",
      image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=600&fit=crop",
      review: "Honest feedback that actually helped. Ashley doesn't sugarcoat things, and that's exactly what I needed to improve."
    },
    {
      name: "Michael T.",
      school: "Accepted to Emory",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop",
      review: "Worth every penny. The take-home questions helped me practice on my own time and the recordings let me see exactly where I needed work."
    },
    {
      name: "Emily R.",
      school: "Accepted to UChicago",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop",
      review: "I was so nervous about interviews. After working with Ashley, I actually looked forward to them. She has a gift for making you feel prepared."
    },
    {
      name: "David C.",
      school: "Accepted to WashU",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop",
      review: "The structured approach from beginner to advanced really helped build my confidence gradually. By session 5, I was crushing it."
    },
    {
      name: "Amanda H.",
      school: "Accepted to Michigan",
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop",
      review: "Ashley's been on both sides of the table, and it shows. Her insights into what interviewers are really looking for were game-changing."
    }
  ]

  return (
    <section className="experiences-section" id="experiences">
      <div className="section-header marketing-header">
        <h2>Real Results from Real Students</h2>
        <p>See what past clients have to say about their experience</p>
      </div>

      <div className="experiences-scroll">
        <div className="experiences-track">
          {testimonials.map((testimonial, index) => (
            <div className="experience-card" key={index}>
              <div className="experience-image">
                <img src={testimonial.image} alt={testimonial.name} />
              </div>
              <div className="experience-content">
                <div className="experience-header">
                  <span className="experience-name">{testimonial.name}</span>
                  <span className="experience-school">{testimonial.school}</span>
                </div>
                <p className="experience-review">"{testimonial.review}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

