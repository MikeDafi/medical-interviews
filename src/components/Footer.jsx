export default function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="footer-content">
        <div className="footer-brand">
          <span className="footer-logo">Medical One-on-One</span>
          <p className="footer-tagline">Expert medical school interview preparation</p>
        </div>
        
        <div className="footer-links">
          <div className="footer-column">
            <h4>Services</h4>
            <ul>
              <li><a href="#packages">Mock Interviews</a></li>
              <li><a href="#packages">MMI Prep</a></li>
              <li><a href="#packages">Traditional Prep</a></li>
              <li><a href="#packages">Trial Session</a></li>
            </ul>
          </div>
          
          <div className="footer-column">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#about">About</a></li>
              <li><a href="#faq">FAQ</a></li>
              <li><a href="#book">Book Now</a></li>
            </ul>
          </div>
          
          <div className="footer-column">
            <h4>Contact</h4>
            <ul>
              <li><a href="mailto:contact@medicaloneonone.com">contact@medicaloneonone.com</a></li>
              <li>Response within 24 hours</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 Medical One-on-One. All rights reserved.</p>
      </div>
    </footer>
  )
}

