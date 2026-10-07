import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

const MOCK_STORAGE_KEY = 'recumend_mock_user'

function generateAppUid() {
  const chars = 'abcdef0123456789'
  let result = 'u_'
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Initialize Auth
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Local development fallback
      const saved = localStorage.getItem(MOCK_STORAGE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setUser({ id: parsed.id, email: parsed.email })
          setProfile(parsed)
        } catch {
          // ignore corrupted data
        }
      }
      setLoading(false)
      return
    }

    // Real Supabase session
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user)
      }
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user)
        // Immediately scrub any auth code or hash tokens from URL bar so they never linger
        if (typeof window !== 'undefined') {
          if (window.location.hash?.includes('access_token') || window.location.search?.includes('code=')) {
            const cleanHash = window.location.hash?.startsWith('#/u/') ? window.location.hash : ''
            window.history.replaceState(null, '', window.location.pathname + cleanHash)
          }
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(authUser) {
    if (!isSupabaseConfigured) return

    try {
      // Extract Google OAuth profile picture from all standard Google claims
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
        .single()

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

            setProfile(updated || { ...data, avatar_url: googleAvatar })
          } catch (syncErr) {
            console.warn('Avatar sync to DB failed:', syncErr)
            setProfile({ ...data, avatar_url: googleAvatar })
          }
        } else {
          setProfile(data)
        }
      } else {
        // Auto create profile on first login with genuine Google avatar
        const emailPrefix = (authUser.email || 'user').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
        const newProfile = {
          id: authUser.id,
          app_uid: generateAppUid(),
          username: `${emailPrefix}_${Math.floor(100 + Math.random() * 900)}`,
          display_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || emailPrefix,
          avatar_url: googleAvatar,
        }

        const { data: created } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single()

        setProfile(created || newProfile)
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    }
  }

  // Google OAuth Sign In
  async function signInWithGoogle() {
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
      return
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) throw error
  }

  // Sign out
  async function signOut() {
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

  // Update profile details (username, display_name)
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
      loading,
      isSupabaseConfigured,
      signInWithGoogle,
      signOut,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
