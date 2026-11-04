import { createClient } from '@supabase/supabase-js'

// Environment detection and credentials from .env
const isProd = import.meta.env.PROD
const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()

// True if real environment variables are configured
export const hasValidEnv = Boolean(
  envUrl &&
  envKey &&
  !envUrl.includes('your-project') &&
  !envKey.includes('your-anon-key') &&
  envUrl.startsWith('https://')
)

const isBrowser = typeof window !== 'undefined'
// Production with valid environment variables strictly locks out localStorage tampering
const storedUrl = (!hasValidEnv && isBrowser) ? (localStorage.getItem('recumend_supabase_url') || '').trim() : ''
const storedKey = (!hasValidEnv && isBrowser) ? (localStorage.getItem('recumend_supabase_anon_key') || '').trim() : ''
const isForcedDemo = (!hasValidEnv && isBrowser) && localStorage.getItem('recumend_force_demo') === 'true'

// In production or when valid env vars are supplied, environment takes absolute precedence
const activeUrl = hasValidEnv ? envUrl : (storedUrl || '')
const activeKey = hasValidEnv ? envKey : (storedKey || '')

export const isProduction = isProd
export const supabaseUrl = activeUrl
export const supabaseAnonKey = activeKey

// True when ready to connect to real Supabase instance
export const isSupabaseConfigured = Boolean(
  !isForcedDemo &&
  activeUrl &&
  activeKey &&
  activeUrl.startsWith('https://') &&
  !activeUrl.includes('your-project')
)

// Supabase client instance (or dummy client if in offline demo mode)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    })
  : createClient('https://mock-recumend.supabase.co', 'mock-anon-key')

// Save Supabase credentials to localStorage for local dev
export function saveSupabaseConfig(url, key) {
  if (hasValidEnv && isProd) {
    console.warn('Production environment variables take precedence. Ignoring local override.')
    return
  }
  if (url && key) {
    localStorage.removeItem('recumend_force_demo')
    localStorage.setItem('recumend_supabase_url', url.trim())
    localStorage.setItem('recumend_supabase_anon_key', key.trim())
    window.location.reload()
  }
}

// Reset credentials back to offline demo mode
export function clearSupabaseConfig() {
  if (hasValidEnv && isProd) {
    console.warn('Production environment variables cannot be cleared.')
    return
  }
  localStorage.setItem('recumend_force_demo', 'true')
  localStorage.removeItem('recumend_supabase_url')
  localStorage.removeItem('recumend_supabase_anon_key')
  window.location.reload()
}


