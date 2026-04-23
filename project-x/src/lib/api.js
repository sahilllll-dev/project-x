import { ENV } from '../config/env.js'

export const API_BASE = ENV.API_BASE_URL
const API_ACTIVITY_EVENT = 'projectx:api-activity'
let activeRequestCount = 0

function emitApiActivity() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent(API_ACTIVITY_EVENT, {
      detail: {
        activeRequestCount,
        isLoading: activeRequestCount > 0,
      },
    }),
  )
}

function startApiRequest() {
  activeRequestCount += 1
  emitApiActivity()
}

function finishApiRequest() {
  activeRequestCount = Math.max(0, activeRequestCount - 1)
  emitApiActivity()
}

export function subscribeToApiActivity(listener) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  function handleApiActivity(event) {
    listener(event.detail)
  }

  window.addEventListener(API_ACTIVITY_EVENT, handleApiActivity)

  return () => {
    window.removeEventListener(API_ACTIVITY_EVENT, handleApiActivity)
  }
}

export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  }

  if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
    delete headers['Content-Type']
  }

  startApiRequest()

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      ...options,
      headers,
    })

    if (!response.ok) {
      const text = await response.text()
      const error = new Error(`API Error: ${response.status} - ${text || 'API error'}`)
      error.status = response.status
      throw error
    }

    if (response.status === 204) {
      return null
    }

    return response.json()
  } finally {
    finishApiRequest()
  }
}
