import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

/**
 * Generate a cryptographically secure random string for PKCE
 */
function generateRandomString(length = 64) {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate PKCE code challenge from verifier (SHA-256)
 */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showProfileSetup, setShowProfileSetup] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check session with server on mount
  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include' // Include httpOnly cookies
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.authenticated && data.user) {
          setUser(data.user)
          setIsAdmin(data.user.isAdmin || false)
          
          // Only show profile setup for NEW users (profile not complete)
          // Once complete, never show again
          if (data.user.profileComplete) {
            setShowProfileSetup(false)
          }
          // Note: We no longer auto-show for incomplete profiles on every page load
          // It only shows on first sign-in (via URL param)
        } else {
          setUser(null)
          setIsAdmin(false)
        }
      }
    } catch (error) {
      console.error('Session check failed:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Check for auth callback results in URL
    const params = new URLSearchParams(window.location.search)
    const authResult = params.get('auth')
    const authError = params.get('auth_error')
    const profileComplete = params.get('profile_complete')

    if (authError) {
      console.error('Auth error:', authError)
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    if (authResult === 'success') {
      // Clean up URL and check session
      window.history.replaceState({}, document.title, window.location.pathname)
      
      if (profileComplete === 'false') {
        setShowProfileSetup(true)
      }
    }

    // Always verify session with server
    checkSession()
  }, [checkSession])

  /**
   * Initiate Google OAuth with Authorization Code Flow + PKCE
   */
  const signInWithGoogle = async () => {
    if (!GOOGLE_CLIENT_ID) {
      console.error('Google Sign In is not configured')
      return
    }

    try {
      // Generate PKCE code verifier and challenge
      const verifier = generateRandomString(64)
      const challenge = await generateCodeChallenge(verifier)
      
      // Generate state nonce for CSRF protection
      const nonce = generateRandomString(32)
      
      // Store verifier in state (sent to callback, not stored client-side)
      const stateData = JSON.stringify({ verifier, nonce })
      const state = btoa(stateData).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      
      // Build OAuth URL with PKCE
      const redirectUri = `${window.location.origin}/api/auth/callback`
      const scope = 'email profile'
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', scope)
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('code_challenge', challenge)
      authUrl.searchParams.set('code_challenge_method', 'S256')
      authUrl.searchParams.set('access_type', 'online')
      authUrl.searchParams.set('prompt', 'select_account')

      // Redirect to Google OAuth
      window.location.href = authUrl.toString()
    } catch (error) {
      console.error('Failed to initiate OAuth:', error)
    }
  }

  /**
   * Sign out - invalidate session on server
   */
  const signOut = async () => {
    try {
      await fetch('/api/auth/session', {
        method: 'DELETE',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    setUser(null)
    setShowProfileSetup(false)
    setIsAdmin(false)
  }

  /**
   * Mark profile setup as complete
   */
  const completeProfileSetup = async () => {
    setShowProfileSetup(false)
    // Refresh session to get updated profileComplete status
    await checkSession()
  }

  /**
   * Refresh session data from server
   */
  const refreshSession = useCallback(async () => {
    await checkSession()
  }, [checkSession])

  const value = {
    user,
    loading,
    isAdmin,
    signInWithGoogle,
    signOut,
    showProfileSetup,
    completeProfileSetup,
    refreshSession
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
