import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h1>Something went wrong</h1>
            <p>We're sorry, but something unexpected happened. Please try refreshing the page.</p>
            <button 
              type="button"
              onClick={() => window.location.reload()} 
              className="error-boundary-btn"
            >
              Refresh Page
            </button>
            <button 
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })} 
              className="error-boundary-btn-secondary"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

