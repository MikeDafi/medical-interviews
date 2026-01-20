import { Link } from 'react-router-dom'

const scrollToSection = (e, sectionId) => {
  e.preventDefault()
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
}

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer" id="contact">
      <div className="footer-content">
        <div className="footer-brand">
          <span className="footer-logo">PreMedical 1-on-1</span>
          <p className="footer-tagline">Expert medical school interview preparation</p>
        </div>
        
        <div className="footer-links">
          <div className="footer-column">
            <h4>Services</h4>
            <ul>
              <li><a href="#packages" onClick={(e) => scrollToSection(e, 'packages')}>Mock Interviews</a></li>
              <li><a href="#packages" onClick={(e) => scrollToSection(e, 'packages')}>MMI Prep</a></li>
              <li><a href="#packages" onClick={(e) => scrollToSection(e, 'packages')}>Traditional Prep</a></li>
              <li><a href="#packages" onClick={(e) => scrollToSection(e, 'packages')}>Trial Session</a></li>
            </ul>
          </div>
          
          <div className="footer-column">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#about" onClick={(e) => scrollToSection(e, 'about')}>About</a></li>
              <li><a href="#faq" onClick={(e) => scrollToSection(e, 'faq')}>FAQ</a></li>
              <li><a href="#book" onClick={(e) => scrollToSection(e, 'book')}>Book Now</a></li>
            </ul>
          </div>
          
          <div className="footer-column">
            <h4>Contact</h4>
            <ul>
              <li><a href="mailto:premedical1on1@gmail.com" rel="noopener">premedical1on1@gmail.com</a></li>
              <li>Response within 24 hours</li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Legal</h4>
            <ul>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {currentYear} PreMedical 1-on-1. All rights reserved.</p>
      </div>
    </footer>
  )
}
