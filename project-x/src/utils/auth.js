import {
  getSupabaseSessionUser,
  isSupabaseConfigured,
  signOutFromSupabase,
} from './supabase.js'

const SESSION_STORAGE_KEY = 'projectx_admin_session'

function readJson(key, fallbackValue) {
  if (typeof window === 'undefined') {
    return fallbackValue
  }

  const rawValue = window.localStorage.getItem(key)

  if (!rawValue) {
    return fallbackValue
  }

  try {
    const parsedValue = JSON.parse(rawValue)
    return parsedValue ?? fallbackValue
  } catch {
    return fallbackValue
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

function clearStoredSession() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY)
}

function formatSessionUser(user) {
  const email = typeof user === 'string' ? user : user?.email

  if (!email) {
    return null
  }

  return {
    email,
    username: email,
  }
}

export function getCurrentUser() {
  const session = readJson(SESSION_STORAGE_KEY, null)

  if (!session?.email) {
    return null
  }

  return session
}

export function isAuthenticated() {
  return Boolean(getCurrentUser())
}

export function createSession(user) {
  const sessionUser = formatSessionUser(user)

  if (!sessionUser) {
    return
  }

  writeJson(SESSION_STORAGE_KEY, sessionUser)
}

export function clearSession() {
  clearStoredSession()
}

export async function syncSessionFromSupabase() {
  if (!isSupabaseConfigured) {
    return getCurrentUser()
  }

  const user = await getSupabaseSessionUser()

  if (!user?.email) {
    clearStoredSession()
    return null
  }

  createSession(user)
  return formatSessionUser(user)
}

export async function logoutUser() {
  if (isSupabaseConfigured) {
    await signOutFromSupabase()
  }

  clearStoredSession()
}
