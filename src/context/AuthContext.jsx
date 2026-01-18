import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

// Google OAuth configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session in localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)

    // Load Google Identity Services script
    if (GOOGLE_CLIENT_ID) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }
  }, [])

  const signInWithGoogle = () => {
    if (!GOOGLE_CLIENT_ID) {
      console.log('Google OAuth not configured - demo mode')
      // Demo mode for development
      const demoUser = {
        id: 'demo-user',
        email: 'demo@example.com',
        name: 'Demo User',
        picture: 'https://ui-avatars.com/api/?name=Demo+User'
      }
      setUser(demoUser)
      localStorage.setItem('user', JSON.stringify(demoUser))
      return
    }

    // Initialize Google Sign-In
    window.google?.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse
    })
    window.google?.accounts.id.prompt()
  }

  const handleGoogleResponse = async (response) => {
    // Decode JWT token from Google
    const payload = JSON.parse(atob(response.credential.split('.')[1]))
    const userData = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    }
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    
    // Send to backend to create/update user in database
    try {
      await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential })
      })
    } catch (error) {
      console.log('Backend auth not configured yet')
    }
  }

  const signOut = () => {
    setUser(null)
    localStorage.removeItem('user')
    window.google?.accounts.id.disableAutoSelect()
  }

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
