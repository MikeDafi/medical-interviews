import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// Session duration: 24 hours
const SESSION_DURATION = 24 * 60 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showProfileSetup, setShowProfileSetup] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check for existing session (use sessionStorage for security)
    const session = getSession()
    if (session?.user && !isSessionExpired(session)) {
      setUser(session.user)
      checkAdminStatus(session.user)
      
      if (session.profileComplete) {
        setShowProfileSetup(false)
      } else {
        checkProfileComplete(session.user)
      }
    } else {
      // Clear expired session
      clearSession()
    }
    setLoading(false)

    // Handle OAuth callback
    const params = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = params.get('access_token')
    if (accessToken) {
      fetchGoogleUserInfo(accessToken)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // Session management functions
  const getSession = () => {
    try {
      // Try sessionStorage first (current tab), then localStorage (returning user)
      const sessionData = sessionStorage.getItem('authSession') || localStorage.getItem('authSession')
      return sessionData ? JSON.parse(sessionData) : null
    } catch {
      return null
    }
  }

  const saveSession = (userData, profileComplete = false) => {
    const session = {
      user: userData,
      profileComplete,
      createdAt: Date.now()
    }
    // Save to both: sessionStorage for security, localStorage for "remember me"
    sessionStorage.setItem('authSession', JSON.stringify(session))
    localStorage.setItem('authSession', JSON.stringify(session))
  }

  const clearSession = () => {
    sessionStorage.removeItem('authSession')
    localStorage.removeItem('authSession')
  }

  const isSessionExpired = (session) => {
    if (!session?.createdAt) return true
    return Date.now() - session.createdAt > SESSION_DURATION
  }

  const updateSessionProfileComplete = (complete) => {
    const session = getSession()
    if (session) {
      session.profileComplete = complete
      sessionStorage.setItem('authSession', JSON.stringify(session))
      localStorage.setItem('authSession', JSON.stringify(session))
    }
  }

  const checkAdminStatus = async (userData) => {
    try {
      const response = await fetch(`/api/admin?action=check&googleId=${userData.id}`)
      if (response.ok) {
        const data = await response.json()
        setIsAdmin(data.isAdmin || false)
      }
    } catch {
      // Admin check unavailable
    }
  }

  const checkProfileComplete = async (userData) => {
    try {
      const response = await fetch(`/api/profile?googleId=${userData.id}&email=${encodeURIComponent(userData.email)}`)
      if (response.ok) {
        const data = await response.json()
        if (data.profile?.profile_complete) {
          updateSessionProfileComplete(true)
          setShowProfileSetup(false)
        } else {
          setShowProfileSetup(true)
        }
      } else if (response.status === 404) {
        // New user - show profile setup
        setShowProfileSetup(true)
      }
    } catch {
      // API unavailable - check local session
      const session = getSession()
      if (!session?.profileComplete) {
        setShowProfileSetup(true)
      }
    }
  }

  const fetchGoogleUserInfo = async (accessToken) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      
      if (!response.ok) throw new Error('Failed to fetch user info')
      
      const data = await response.json()
      const userData = {
        id: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture
      }
      
      setUser(userData)
      saveSession(userData, false)
      
      // Save to backend
      try {
        await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userData })
        })
      } catch {
        // Backend save will happen on next API call
      }
      
      checkAdminStatus(userData)
      checkProfileComplete(userData)
    } catch (error) {
      console.error('Error fetching user info:', error)
      clearSession()
    }
  }

  const signInWithGoogle = () => {
    if (!GOOGLE_CLIENT_ID) {
      alert('Google Sign In is not configured yet.')
      return
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID()
    sessionStorage.setItem('oauth_state', state)

    const redirectUri = window.location.origin
    const scope = 'email profile'
    
    // Note: For production, should use authorization code flow with PKCE
    // Implicit flow is used here for simplicity but is less secure
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${state}` +
      `&prompt=select_account`

    window.location.href = authUrl
  }

  const signOut = () => {
    setUser(null)
    setShowProfileSetup(false)
    setIsAdmin(false)
    clearSession()
  }

  const completeProfileSetup = () => {
    setShowProfileSetup(false)
    updateSessionProfileComplete(true)
  }

  const value = {
    user,
    loading,
    isAdmin,
    signInWithGoogle,
    signOut,
    showProfileSetup,
    completeProfileSetup
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
