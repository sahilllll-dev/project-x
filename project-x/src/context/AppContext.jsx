import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getOrders, getStoreApps, getStoresByUserId } from '../utils/api.js'
import { useStore } from './StoreContext.jsx'

const CURRENT_USER_STORAGE_KEY = 'currentUser'
const STORE_APPS_STORAGE_KEY = 'storeApps'
const STORE_NOTIFICATION_STORAGE_KEY = 'storeNotifications'
const DEFAULT_STORE_STORAGE_KEY = 'defaultStoreByUser'
const NEW_ORDER_EVENT = 'projectx:new-order'

export const AppContext = createContext({
  currentUser: null,
  currentStore: null,
  storeSwitchVersion: 0,
  stores: [],
  notifications: [],
  storeApps: [],
  hasUnreadNotifications: false,
  isAppReady: false,
  isStoreReady: false,
  defaultStoreId: null,
  setCurrentUser: () => {},
  setCurrentStore: () => {},
  setStores: () => {},
  setDefaultStore: () => {},
  markNotificationsAsRead: () => {},
  setStoreApps: () => {},
  refreshStoreApps: async () => [],
  isAppEnabled: () => false,
  initializeUserContext: async () => {},
  clearAppContext: () => {},
})

function readJson(key, fallbackValue) {
  if (typeof window === 'undefined') {
    return fallbackValue
  }

  const rawValue = window.localStorage.getItem(key)

  if (!rawValue) {
    return fallbackValue
  }

  try {
    return JSON.parse(rawValue) ?? fallbackValue
  } catch {
    return fallbackValue
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined') {
    return
  }

  if (value === null) {
    window.localStorage.removeItem(key)
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

function readDefaultStoreId(userId) {
  if (!userId) {
    return null
  }

  const defaultStoreByUser = readJson(DEFAULT_STORE_STORAGE_KEY, {})
  return defaultStoreByUser[userId] ?? null
}

function writeDefaultStoreId(userId, storeId) {
  if (!userId) {
    return
  }

  const defaultStoreByUser = readJson(DEFAULT_STORE_STORAGE_KEY, {})

  if (!storeId) {
    delete defaultStoreByUser[userId]
  } else {
    defaultStoreByUser[userId] = storeId
  }

  writeJson(DEFAULT_STORE_STORAGE_KEY, defaultStoreByUser)
}

export function AppProvider({ children }) {
  const { currentStore, setCurrentStore, storeSwitchVersion, stores, setStores } = useStore()
  const [currentUser, setCurrentUserState] = useState(() => readJson(CURRENT_USER_STORAGE_KEY, null))
  const [notifications, setNotifications] = useState([])
  const [storeApps, setStoreAppsState] = useState(() => readJson(STORE_APPS_STORAGE_KEY, []))
  const [notificationMeta, setNotificationMeta] = useState(() =>
    readJson(STORE_NOTIFICATION_STORAGE_KEY, {}),
  )
  const isAppReady = true
  const [isStoreReady, setIsStoreReady] = useState(false)
  const [defaultStoreId, setDefaultStoreId] = useState(null)
  const latestOrderTimestampRef = useRef({})

  useEffect(() => {
    writeJson(CURRENT_USER_STORAGE_KEY, currentUser)
  }, [currentUser])

  useEffect(() => {
    writeJson(STORE_APPS_STORAGE_KEY, storeApps)
  }, [storeApps])

  useEffect(() => {
    writeJson(STORE_NOTIFICATION_STORAGE_KEY, notificationMeta)
  }, [notificationMeta])

  useEffect(() => {
    let isCancelled = false

    async function hydrateStore() {
      if (!isAppReady) {
        return
      }

      if (!currentUser?.id) {
        setStores([])
        setCurrentStore(null)
        setDefaultStoreId(null)
        setIsStoreReady(true)
        return
      }

      setIsStoreReady(false)

      try {
        const nextStores = await getStoresByUserId(currentUser.id)

        if (isCancelled) {
          return
        }

        setStores(nextStores)

        if (nextStores.length === 0) {
          setCurrentStore(null)
          setDefaultStoreId(null)
          return
        }

        const storedDefaultStoreId = readDefaultStoreId(currentUser.id)
        const defaultStore =
          nextStores.find((store) => store.isDefault) ??
          nextStores.find((store) => store.id === storedDefaultStoreId)
        const nextStore = defaultStore ?? nextStores[0]

        setCurrentStore(nextStore)
        setDefaultStoreId(nextStore.id)

        if (!storedDefaultStoreId || !defaultStore) {
          writeDefaultStoreId(currentUser.id, nextStore.id)
        }
      } catch (error) {
        console.error(error)
      } finally {
        if (!isCancelled) {
          setIsStoreReady(true)
        }
      }

    }

    hydrateStore()

    return () => {
      isCancelled = true
    }
  }, [currentUser?.id, isAppReady, setCurrentStore, setStores])

  useEffect(() => {
    if (!currentStore?.id) {
      setNotifications([])
      return undefined
    }

    let isCancelled = false

    async function loadNotifications() {
      try {
        const orders = await getOrders(currentStore.id)

        if (isCancelled) {
          return
        }

        const sortedOrders = [...orders].sort(
          (leftOrder, rightOrder) => Number(rightOrder.createdAt) - Number(leftOrder.createdAt),
        )
        const latestOrder = sortedOrders[0]
        const previousLatestTimestamp = latestOrderTimestampRef.current[currentStore.id]

        if (latestOrder) {
          const latestTimestamp = Number(latestOrder.createdAt)

          if (
            previousLatestTimestamp !== undefined &&
            latestTimestamp > Number(previousLatestTimestamp)
          ) {
            window.dispatchEvent(
              new CustomEvent(NEW_ORDER_EVENT, {
                detail: {
                  order: latestOrder,
                  storeId: currentStore.id,
                },
              }),
            )
          }

          latestOrderTimestampRef.current[currentStore.id] = latestTimestamp
        }

        setNotifications(sortedOrders.slice(0, 8))
      } catch (error) {
        console.error(error)
      }
    }

    loadNotifications()
    const intervalId = window.setInterval(loadNotifications, 15000)

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
    }
  }, [currentStore?.id])

  const refreshStoreApps = useCallback(async () => {
    if (!currentStore?.id) {
      setStoreAppsState([])
      return []
    }

    try {
      const nextStoreApps = await getStoreApps(currentStore.id)
      setStoreAppsState(nextStoreApps)
      return nextStoreApps
    } catch (error) {
      console.error(error)
      return []
    }
  }, [currentStore?.id])

  useEffect(() => {
    refreshStoreApps()
  }, [refreshStoreApps])

  function setCurrentUser(user) {
    setCurrentUserState(user ?? null)
  }

  function setStoreApps(nextStoreApps) {
    setStoreAppsState(nextStoreApps ?? [])
  }

  function setDefaultStore(store) {
    const nextStore = store ?? null
    const nextStoreId = nextStore?.id ?? null

    setDefaultStoreId(nextStoreId)
    writeDefaultStoreId(currentUser?.id, nextStoreId)

    if (nextStore) {
      setCurrentStore(nextStore)
    }
  }

  const isAppEnabled = useCallback(
    (appId) => storeApps.some((storeApp) => storeApp.appId === appId && storeApp.enabled),
    [storeApps],
  )

  const markNotificationsAsRead = useCallback(() => {
    if (!currentStore?.id) {
      return
    }

    const latestNotificationTimestamp = notifications[0]?.createdAt ?? Date.now()

    setNotificationMeta((currentMeta) => ({
      ...currentMeta,
      [currentStore.id]: Number(latestNotificationTimestamp),
    }))
  }, [currentStore?.id, notifications])

  async function initializeUserContext(user) {
    const nextUser = user ?? null
    setCurrentUserState(nextUser)
    writeJson(CURRENT_USER_STORAGE_KEY, nextUser)

    if (!nextUser?.id) {
      setCurrentStore(null)
      setStores([])
      setStoreAppsState([])
      writeJson(STORE_APPS_STORAGE_KEY, [])
      return { user: nextUser, store: null }
    }

    const stores = await getStoresByUserId(nextUser.id)
    setStores(stores)
    const storedDefaultStoreId = readDefaultStoreId(nextUser.id)
    const nextStore =
      stores.find((store) => store.isDefault) ??
      stores.find((store) => store.id === storedDefaultStoreId) ??
      stores[0] ??
      null
    setCurrentStore(nextStore)
    setDefaultStoreId(nextStore?.id ?? null)
    if (nextStore && (!storedDefaultStoreId || storedDefaultStoreId !== nextStore.id)) {
      writeDefaultStoreId(nextUser.id, nextStore.id)
    }
    setIsStoreReady(true)

    const nextStoreApps = nextStore?.id ? await getStoreApps(nextStore.id) : []
    setStoreAppsState(nextStoreApps)
    writeJson(STORE_APPS_STORAGE_KEY, nextStoreApps)

    return {
      user: nextUser,
      store: nextStore,
    }
  }

  function clearAppContext() {
    setCurrentUserState(null)
    setCurrentStore(null)
    setStores([])
    setNotifications([])
    setStoreAppsState([])
    setDefaultStoreId(null)
    setIsStoreReady(true)
    writeJson(CURRENT_USER_STORAGE_KEY, null)
    writeJson(STORE_APPS_STORAGE_KEY, [])
  }

  const hasUnreadNotifications = notifications.some(
    (notification) =>
      Number(notification.createdAt) > Number(notificationMeta[currentStore?.id] ?? 0),
  )

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentStore,
        storeSwitchVersion,
        stores,
        notifications,
        storeApps,
        hasUnreadNotifications,
        isAppReady,
        isStoreReady,
        defaultStoreId,
        setCurrentUser,
        setCurrentStore,
        setStores,
        setDefaultStore,
        setStoreApps,
        refreshStoreApps,
        isAppEnabled,
        markNotificationsAsRead,
        initializeUserContext,
        clearAppContext,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  return useContext(AppContext)
}
