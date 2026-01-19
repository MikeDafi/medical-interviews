import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

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

    // Handle OAuth callback
    const params = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = params.get('access_token')
    if (accessToken) {
      fetchGoogleUserInfo(accessToken)
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const fetchGoogleUserInfo = async (accessToken) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const data = await response.json()
      const userData = {
        id: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture
      }
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      
      // Save to backend
      try {
        await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userData })
        })
      } catch (e) {
        console.log('Backend save pending')
      }
    } catch (error) {
      console.error('Error fetching user info:', error)
    }
  }

  const signInWithGoogle = () => {
    if (!GOOGLE_CLIENT_ID) {
      alert('Google Sign In is not configured yet.')
      return
    }

    const redirectUri = window.location.origin
    const scope = 'email profile'
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(scope)}` +
      `&prompt=select_account`

    window.location.href = authUrl
  }

  const signOut = () => {
    setUser(null)
    localStorage.removeItem('user')
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
