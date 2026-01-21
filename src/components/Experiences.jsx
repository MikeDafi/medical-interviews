// Fallback avatar URL
const getFallbackAvatar = (name) => 
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0d9488&color=fff&size=400`

export default function Experiences() {
  const testimonials = [
    {
      id: 'sarah-m',
      name: "Sarah M.",
      school: "Accepted to Northwestern",
      image: "/person-1.jpeg",
      review: "Ashley completely transformed my interview skills. After 3 sessions, I went from freezing up to confidently handling any question thrown at me."
    },
    {
      id: 'james-l',
      name: "James L.",
      school: "Accepted to UCLA",
      image: "/person-3.jpeg",
      imageStyle: { objectPosition: 'center 10%' },
      review: "The MMI practice was incredibly realistic. I felt like I had already done my interview by the time the real one came around."
    },
    {
      id: 'priya-k',
      name: "Priya K.",
      school: "Accepted to Duke",
      image: "/person-2.png",
      review: "Honest feedback that actually helped. Ashley doesn't sugarcoat things, and that's exactly what I needed to improve."
    },
    {
      id: 'michael-t',
      name: "Michael T.",
      school: "Accepted to Emory",
      image: null,
      review: "Worth every penny. The take-home questions helped me practice on my own time and the recordings let me see exactly where I needed work."
    },
    {
      id: 'emily-r',
      name: "Emily R.",
      school: "Accepted to UChicago",
      image: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=600&fit=crop&crop=face",
      review: "I was so nervous about interviews. After working with Ashley, I actually looked forward to them. She has a gift for making you feel prepared."
    },
    {
      id: 'david-c',
      name: "David C.",
      school: "Accepted to WashU",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=600&fit=crop&crop=face",
      review: "The structured approach from beginner to advanced really helped build my confidence gradually. By session 5, I was crushing it."
    },
    {
      id: 'amanda-h',
      name: "Amanda H.",
      school: "Accepted to Michigan",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop&crop=face",
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
          {testimonials.map((testimonial) => (
            <div className="experience-card" key={testimonial.id}>
              <div className={`experience-image ${!testimonial.image ? 'anonymous' : ''}`}>
                {testimonial.image ? (
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    loading="lazy"
                    style={testimonial.imageStyle || {}}
                    onError={(e) => { 
                      e.target.onerror = null
                      e.target.src = getFallbackAvatar(testimonial.name) 
                    }}
                  />
                ) : (
                  <div className="anonymous-placeholder">
                    <span>?</span>
                  </div>
                )}
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
