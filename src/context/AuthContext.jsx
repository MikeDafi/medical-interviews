import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showProfileSetup, setShowProfileSetup] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check for existing session in localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      setUser(userData)
      
      // Check admin status
      checkAdminStatus(userData)
      
      // Check localStorage first for profile completion
      const profileComplete = localStorage.getItem('profileComplete')
      if (profileComplete === 'true') {
        // Profile is already complete, don't show setup
        setShowProfileSetup(false)
      } else {
        // Only check API if we don't have local confirmation
        checkProfileComplete(userData)
      }
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

  const checkAdminStatus = async (userData) => {
    // Check localStorage cache first
    const cachedAdmin = localStorage.getItem('isAdmin')
    if (cachedAdmin !== null) {
      setIsAdmin(cachedAdmin === 'true')
    }

    try {
      const response = await fetch(`/api/admin?action=check&googleId=${userData.id}`)
      if (response.ok) {
        const data = await response.json()
        setIsAdmin(data.isAdmin || false)
        localStorage.setItem('isAdmin', data.isAdmin ? 'true' : 'false')
      }
    } catch (error) {
      console.log('Admin check unavailable')
    }
  }

  const checkProfileComplete = async (userData) => {
    // Check localStorage first
    const localProfileComplete = localStorage.getItem('profileComplete')
    if (localProfileComplete === 'true') {
      setShowProfileSetup(false)
      return
    }

    try {
      const response = await fetch(`/api/profile?googleId=${userData.id}&email=${encodeURIComponent(userData.email)}`)
      if (response.ok) {
        const data = await response.json()
        if (data.profile?.profile_complete) {
          localStorage.setItem('profileComplete', 'true')
          setShowProfileSetup(false)
        } else {
          setShowProfileSetup(true)
        }
      } else {
        // API not available - don't force profile setup if we can't verify
        // Only show setup for truly new users (no profileComplete flag at all)
        if (localProfileComplete === null) {
          setShowProfileSetup(true)
        }
      }
    } catch (error) {
      // API failed - don't force profile setup if we can't verify
      console.log('Profile check unavailable')
      if (localProfileComplete === null) {
        setShowProfileSetup(true)
      }
    }
  }

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
      
      // Check admin status
      checkAdminStatus(userData)
      
      // Only show profile setup if not already completed
      const profileComplete = localStorage.getItem('profileComplete')
      if (profileComplete !== 'true') {
        // Check with API if available, otherwise show setup for new users
        checkProfileComplete(userData)
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
    setShowProfileSetup(false)
    setIsAdmin(false)
    localStorage.removeItem('user')
    localStorage.removeItem('profileComplete')
    localStorage.removeItem('isAdmin')
  }

  const completeProfileSetup = () => {
    setShowProfileSetup(false)
    localStorage.setItem('profileComplete', 'true')
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
