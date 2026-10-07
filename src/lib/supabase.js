import { createClient } from '@supabase/supabase-js'

const envUrl = import.meta.env.VITE_SUPABASE_URL || ''
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''

const storedUrl = typeof window !== 'undefined' ? (localStorage.getItem('recumend_supabase_url') || '') : ''
const storedKey = typeof window !== 'undefined' ? (localStorage.getItem('recumend_supabase_anon_key') || '') : ''

export const supabaseUrl = envUrl && !envUrl.includes('your-project') ? envUrl : storedUrl
export const supabaseAnonKey = envKey && !envKey.includes('your-anon-key') ? envKey : storedKey

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&  
  !supabaseUrl.includes('your-project') &&
  supabaseUrl.startsWith('https://')
)

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

export function saveSupabaseConfig(url, key) {
  if (url && key) {
    localStorage.setItem('recumend_supabase_url', url.trim())
    localStorage.setItem('recumend_supabase_anon_key', key.trim())
    window.location.reload()
  }
}

export function clearSupabaseConfig() {
  localStorage.removeItem('recumend_supabase_url')
  localStorage.removeItem('recumend_supabase_anon_key')
  window.location.reload()
}
