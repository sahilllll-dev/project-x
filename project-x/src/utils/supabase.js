import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null

function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    )
  }

  return supabase
}

function getEmailRedirectUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:5173/login?verified=true'
  }

  return `${window.location.origin}/login?verified=true`
}

function normalizeAuthError(error, fallbackMessage) {
  const message = error?.message?.trim()
  return new Error(message || fallbackMessage)
}

export async function signUpWithSupabase({ email, password }) {
  const client = getSupabaseClient()
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getEmailRedirectUrl(),
    },
  })

  if (error) {
    throw normalizeAuthError(error, 'Signup failed')
  }

  return data
}

export async function signInWithSupabase({ email, password }) {
  const client = getSupabaseClient()
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw normalizeAuthError(error, 'Login failed')
  }

  return data
}

export async function signOutFromSupabase() {
  if (!supabase) {
    return
  }

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw normalizeAuthError(error, 'Logout failed')
  }
}

export async function getSupabaseSessionUser() {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase.auth.getUser()

  if (error) {
    throw normalizeAuthError(error, 'Failed to read Supabase session')
  }

  return data.user ?? null
}
