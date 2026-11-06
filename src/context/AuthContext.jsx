import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { clearCachedVaultKeys } from '../lib/googleDriveVault'

// Authentication and user profile context
const AuthContext = createContext(null)

const MOCK_STORAGE_KEY = 'recumend_mock_user'

// Generates a random short user ID (e.g. u_8f29c4) for mock profiles
function generateAppUid() {
  const chars = 'abcdef0123456789'
  let result = 'u_'
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Reads OAuth redirect error parameters from the URL if login was cancelled or failed
function getInitialAuthError() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const errorParam = params.get('error')
  const errorDesc = params.get('error_description')
  if (errorParam || errorDesc) {
    const msg = errorDesc || errorParam || 'Authentication was cancelled or failed'
    params.delete('error')
    params.delete('error_description')
    params.delete('error_code')
    const newQuery = params.toString() ? `?${params.toString()}` : ''
    window.history.replaceState(null, '', window.location.pathname + newQuery + window.location.hash)
    return decodeURIComponent(msg)
  }
  return null
}

// Retrieves mock user data from localStorage for offline demo preview
function getInitialMockState() {
  if (typeof window === 'undefined') return { user: null, profile: null }
  const saved = localStorage.getItem(MOCK_STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      return { user: { id: parsed.id, email: parsed.email }, profile: parsed }
    } catch {
      // ignore JSON parse errors
    }
  }
  return { user: null, profile: null }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (!isSupabaseConfigured ? getInitialMockState().user : null))
  const [profile, setProfile] = useState(() => (!isSupabaseConfigured ? getInitialMockState().profile : null))
  const [providerToken, setProviderToken] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError] = useState(getInitialAuthError)

  const clearAuthError = useCallback(() => {
    setAuthError(null)
  }, [])

  // Fetch profile from Supabase and sync Google profile image if needed
  const fetchProfile = useCallback(async (authUser) => {
    if (!isSupabaseConfigured || !authUser?.id) return null

    try {
      // Extract Google OAuth profile picture from standard Google claims
      const googleAvatar =
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.picture ||
        authUser.identities?.[0]?.identity_data?.avatar_url ||
        authUser.identities?.[0]?.identity_data?.picture ||
        null

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (error) {
        console.warn('Profile fetch note:', error.message)
      }

      if (data) {
        // If user logged in with Google and DB profile is missing avatar or has old placeholder, sync it
        if (
          googleAvatar &&
          (!data.avatar_url ||
            data.avatar_url !== googleAvatar ||
            data.avatar_url.includes('unsplash.com'))
        ) {
          try {
            const { data: updated } = await supabase
              .from('profiles')
              .update({
                avatar_url: googleAvatar,
                updated_at: new Date().toISOString(),
              })
              .eq('id', authUser.id)
              .select()
              .single()

            const finalProfile = updated || { ...data, avatar_url: googleAvatar }
            setProfile(finalProfile)
            return finalProfile
          } catch (syncErr) {
            console.warn('Avatar sync to DB failed:', syncErr)
            const fallbackProfile = { ...data, avatar_url: googleAvatar }
            setProfile(fallbackProfile)
            return fallbackProfile
          }
        } else {
          setProfile(data)
          return data
        }
      } else {
        // Create new profile record on first login
        const emailPrefix = (authUser.email || 'user')
          .split('@')[0]
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '')
          .slice(0, 20) || 'user'
        const newProfile = {
          id: authUser.id,
          app_uid: generateAppUid(),
          username: `${emailPrefix}_${Math.floor(100 + Math.random() * 900)}`,
          display_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || emailPrefix,
          avatar_url: googleAvatar,
        }

        const { data: created, error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single()

        if (insertError) {
          console.warn('First-time profile insert error:', insertError.message)
        }

        const finalProfile = created || newProfile
        setProfile(finalProfile)
        return finalProfile
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      return null
    }
  }, [])

  // Check active session and listen to auth changes (sign in, token refresh, sign out)
  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    // Restore existing session on mount
    async function getSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('Supabase getSession warning:', error.message)
        }
        if (session?.user) {
          setUser(session.user)
          if (session.provider_token) {
            setProviderToken(session.provider_token)
          }
          await fetchProfile(session.user)
        }
      } catch (err) {
        console.error('getSession exception:', err)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth state events from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        if (session.provider_token) {
          setProviderToken(session.provider_token)
        }
        setIsAuthenticating(false)
        setAuthError(null)
        await fetchProfile(session.user)
        // Clean any auth code or hash tokens from URL bar after exchange is confirmed and redirect to feed
        if (typeof window !== 'undefined') {
          if (window.location.hash?.includes('access_token') || window.location.search?.includes('code=')) {
            const cleanHash = window.location.hash?.startsWith('#/u/') ? window.location.hash : ''
            window.history.replaceState(null, '', '/feed' + cleanHash)
            window.dispatchEvent(new Event('popstate'))
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setProviderToken(null)
        clearCachedVaultKeys()
        setIsAuthenticating(false)
      }
      setLoading(false)
    })

    return () => subscription?.unsubscribe?.()
  }, [fetchProfile])

  // Sign in using Google OAuth (or set demo user in offline mode)
  async function signInWithGoogle() {
    setIsAuthenticating(true)
    setAuthError(null)

    if (!isSupabaseConfigured) {
      // Mock Google Login for local preview
      const mockId = 'demo-user-123'
      const mockProf = {
        id: mockId,
        app_uid: 'u_8f29c4',
        username: 'abhishek_rec',
        display_name: 'Abhishek',
        avatar_url: null,
        email: 'abhishek@example.com'
      }
      setUser({ id: mockId, email: mockProf.email })
      setProfile(mockProf)
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(mockProf))
      setIsAuthenticating(false)
      // Navigate to /feed if currently on home/landing page
      if (typeof window !== 'undefined' && window.location.pathname === '/') {
        window.history.pushState(null, '', '/feed')
        window.dispatchEvent(new Event('popstate'))
      }
      return { success: true }
    }

    try {
      // Trigger OAuth flow with redirect to /feed and Google Drive appDataFolder scope
      const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/feed` : ''
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          scopes: 'https://www.googleapis.com/auth/drive.appdata',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })

      if (error) throw error

      // Direct fallback if browser did not auto navigate
      if (data?.url && typeof window !== 'undefined') {
        window.location.assign(data.url)
      }
      return { success: true, data }
    } catch (err) {
      console.error('Google OAuth sign-in failed:', err)
      const message = err.message || 'Google sign-in could not be initiated.'
      setAuthError(message)
      setIsAuthenticating(false)
      return { error: message }
    }
  }

  // Sign in with email and password
  async function signInWithEmail(email, password) {
    setIsAuthenticating(true)
    setAuthError(null)

    if (!isSupabaseConfigured) {
      const mockId = 'demo-user-123'
      const cleanPrefix = (email.split('@')[0] || 'user').toLowerCase()
      const mockProf = {
        id: mockId,
        app_uid: 'u_8f29c4',
        username: cleanPrefix,
        display_name: cleanPrefix,
        avatar_url: null,
        email: email.trim()
      }
      setUser({ id: mockId, email: mockProf.email })
      setProfile(mockProf)
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(mockProf))
      setIsAuthenticating(false)
      return { success: true }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })
      if (error) throw error
      if (data?.user) {
        setUser(data.user)
        await fetchProfile(data.user)
      }
      setIsAuthenticating(false)
      return { success: true, user: data.user }
    } catch (err) {
      console.error('Email sign in error:', err)
      const message = err.message || 'Sign in failed'
      setAuthError(message)
      setIsAuthenticating(false)
      return { error: message }
    }
  }

  // Register a new user with email and password
  async function signUpWithEmail(email, password, displayName) {
    setIsAuthenticating(true)
    setAuthError(null)

    if (!isSupabaseConfigured) {
      const mockId = `demo-user-${Date.now()}`
      const cleanName = displayName?.trim() || email.split('@')[0] || 'User'
      const mockProf = {
        id: mockId,
        app_uid: generateAppUid(),
        username: cleanName.toLowerCase().replace(/[^a-z0-9_]/g, ''),
        display_name: cleanName,
        avatar_url: null,
        email: email.trim()
      }
      setUser({ id: mockId, email: mockProf.email })
      setProfile(mockProf)
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(mockProf))
      setIsAuthenticating(false)
      return { success: true }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: displayName?.trim() || email.split('@')[0]
          }
        }
      })
      if (error) throw error

      if (data?.user && !data.session) {
        setIsAuthenticating(false)
        return { needsEmailConfirmation: true, email: email.trim() }
      }

      if (data?.user) {
        setUser(data.user)
        await fetchProfile(data.user)
      }
      setIsAuthenticating(false)
      return { success: true, user: data.user }
    } catch (err) {
      console.error('Email sign up error:', err)
      const message = err.message || 'Sign up failed'
      setAuthError(message)
      setIsAuthenticating(false)
      return { error: message }
    }
  }

  // Log out current user and clear local cache
  async function signOut() {
    setIsAuthenticating(false)
    setAuthError(null)
    setProviderToken(null)
    clearCachedVaultKeys()
    if (!isSupabaseConfigured) {
      localStorage.removeItem(MOCK_STORAGE_KEY)
      setUser(null)
      setProfile(null)
      return
    }
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  // Save public key JWK string to profile in Supabase for peer-to-peer recommendation sharing
  const savePublicKeyToProfile = useCallback(async (publicKeyJwkString) => {
    if (!profile?.id) return
    if (!isSupabaseConfigured) {
      setProfile(prev => prev ? { ...prev, public_key: publicKeyJwkString } : null)
      return
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ public_key: publicKeyJwkString })
        .eq('id', profile.id)
      if (error) {
        console.warn('Failed to save public_key to profile:', error.message)
      } else {
        setProfile(prev => prev ? { ...prev, public_key: publicKeyJwkString } : null)
      }
    } catch (err) {
      console.warn('savePublicKeyToProfile exception:', err)
    }
  }, [profile])

  // Update profile details (username, display name)
  async function updateProfile({ username, display_name }) {
    if (!profile) return { error: 'Not authenticated' }

    const cleanUsername = username ? username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') : ''
    if (cleanUsername.length < 2 || cleanUsername.length > 30) {
      return { error: 'Username must be between 2 and 30 alphanumeric characters' }
    }

    const cleanDisplayName = display_name ? display_name.trim() : ''
    if (!cleanDisplayName || cleanDisplayName.length > 60) {
      return { error: 'Display name must be between 1 and 60 characters' }
    }

    if (!isSupabaseConfigured) {
      const updated = { ...profile, username: cleanUsername, display_name: cleanDisplayName }
      setProfile(updated)
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(updated))
      return { success: true }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        username: cleanUsername,
        display_name: cleanDisplayName,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { error: 'Username already taken' }
      }
      return { error: error.message }
    }

    setProfile(data)
    return { success: true }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      providerToken,
      savePublicKeyToProfile,
      loading,
      isAuthenticating,
      authError,
      clearAuthError,
      isSupabaseConfigured,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to access auth user, profile, and login methods
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
