import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="legal-back">← Back to Home</Link>
        
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: January 2026</p>

        <section>
          <h2>1. Information We Collect</h2>
          <p>When you use PreMedical 1-on-1, we collect:</p>
          <ul>
            <li><strong>Account Information:</strong> Name, email address, and profile picture from your Google account</li>
            <li><strong>Profile Data:</strong> Phone number (optional), application stage, target schools, and interview concerns you provide</li>
            <li><strong>Session Data:</strong> Booking history, session notes, and feedback</li>
            <li><strong>Payment Information:</strong> Processed securely by Stripe; we do not store your card details</li>
          </ul>
        </section>

        <section>
          <h2>2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and personalize our interview preparation services</li>
            <li>Schedule and manage your sessions</li>
            <li>Send session reminders and updates</li>
            <li>Improve our services based on feedback</li>
            <li>Communicate important service updates</li>
          </ul>
        </section>

        <section>
          <h2>3. Information Sharing</h2>
          <p>We do not sell your personal information. We may share data with:</p>
          <ul>
            <li><strong>Service Providers:</strong> Google Calendar (for scheduling), Stripe (for payments), Vercel (for hosting)</li>
            <li><strong>Legal Requirements:</strong> If required by law or to protect our rights</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data, including:
          </p>
          <ul>
            <li>HTTPS encryption for all data transmission</li>
            <li>Secure authentication via Google OAuth</li>
            <li>Database encryption at rest</li>
            <li>Regular security audits</li>
          </ul>
        </section>

        <section>
          <h2>5. Data Retention</h2>
          <p>
            We retain your data while your account is active or as needed to provide services. 
            You may request deletion of your account and associated data at any time through your profile settings.
          </p>
        </section>

        <section>
          <h2>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate information</li>
            <li>Delete your account and data</li>
            <li>Export your data</li>
            <li>Opt out of marketing communications</li>
          </ul>
        </section>

        <section>
          <h2>7. Cookies and Analytics</h2>
          <p>
            We use Vercel Analytics to understand how our service is used. This helps us improve the user experience. 
            We do not use third-party advertising cookies.
          </p>
        </section>

        <section>
          <h2>8. Children's Privacy</h2>
          <p>
            Our service is not intended for individuals under 18 years of age. We do not knowingly collect 
            personal information from children.
          </p>
        </section>

        <section>
          <h2>9. Changes to Privacy Policy</h2>
          <p>
            We may update this policy periodically. We will notify you of significant changes via email 
            or through the Service.
          </p>
        </section>

        <section>
          <h2>10. Contact Us</h2>
          <p>
            For privacy-related questions or requests, please contact us at{' '}
            <a href="mailto:premedical1on1@gmail.com">premedical1on1@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  )
}

