import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="legal-back">← Back to Home</Link>
        
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: January 2026</p>

        <section>
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using PreMedical 1-on-1 ("the Service"), you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use our Service.
          </p>
        </section>

        <section>
          <h2>2. Services Provided</h2>
          <p>
            PreMedical 1-on-1 provides medical school interview preparation services, including but not limited to:
          </p>
          <ul>
            <li>One-on-one mock interview sessions</li>
            <li>MMI (Multiple Mini Interview) practice</li>
            <li>Traditional interview preparation</li>
            <li>Feedback and coaching</li>
            <li>Resume and application review</li>
          </ul>
        </section>

        <section>
          <h2>3. Payment and Refunds</h2>
          <p>
            All payments are processed securely through Stripe. Session packages are non-refundable once purchased, 
            but individual sessions may be rescheduled with at least 24 hours notice.
          </p>
          <p>
            If you need to cancel a session, please do so at least 24 hours in advance. Sessions cancelled with 
            less than 24 hours notice may be forfeited.
          </p>
        </section>

        <section>
          <h2>4. User Responsibilities</h2>
          <p>You agree to:</p>
          <ul>
            <li>Provide accurate information when creating your account</li>
            <li>Attend scheduled sessions on time</li>
            <li>Communicate respectfully with your coach</li>
            <li>Not share account credentials with others</li>
          </ul>
        </section>

        <section>
          <h2>5. Intellectual Property</h2>
          <p>
            All content provided during sessions, including feedback, practice questions, and coaching materials, 
            is for your personal use only. You may not distribute, sell, or share this content without permission.
          </p>
        </section>

        <section>
          <h2>6. Disclaimer</h2>
          <p>
            PreMedical 1-on-1 provides interview preparation services but does not guarantee admission to any 
            medical school. Results vary based on individual effort and circumstances beyond our control.
          </p>
        </section>

        <section>
          <h2>7. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, PreMedical 1-on-1 shall not be liable for any indirect, 
            incidental, special, or consequential damages arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2>8. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Changes will be effective immediately upon 
            posting to the website. Your continued use of the Service constitutes acceptance of any changes.
          </p>
        </section>

        <section>
          <h2>9. Contact</h2>
          <p>
            If you have questions about these Terms of Service, please contact us at{' '}
            <a href="mailto:premedical1on1@gmail.com">premedical1on1@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  )
}

