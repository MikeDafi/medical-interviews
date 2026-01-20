import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="not-found-btn">
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}

