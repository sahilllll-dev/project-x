const STORAGE_KEY = 'projectx_stores'

function isOwnedByUser(store, username) {
  if (!username) {
    return true
  }

  if (!store.ownerUsername) {
    return username === 'Trendio'
  }

  return store.ownerUsername === username
}

export function getStores(ownerUsername) {
  if (typeof window === 'undefined') {
    return []
  }

  const rawStores = window.localStorage.getItem(STORAGE_KEY)

  if (!rawStores) {
    return []
  }

  try {
    const parsedStores = JSON.parse(rawStores)
    const stores = Array.isArray(parsedStores) ? parsedStores : []
    return ownerUsername
      ? stores.filter((store) => isOwnedByUser(store, ownerUsername))
      : stores
  } catch {
    return []
  }
}

export function saveStore(store) {
  const stores = getStores()
  const nextStores = [...stores, store]
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStores))
}
