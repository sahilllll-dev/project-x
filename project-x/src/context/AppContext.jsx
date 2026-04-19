import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getOrders, getStoreApps, getStoresByUserId } from '../utils/api.js'
import { getThemeConfig } from '../utils/themeConfig.js'

const CURRENT_USER_STORAGE_KEY = 'currentUser'
const CURRENT_STORE_STORAGE_KEY = 'currentStore'
const STORE_APPS_STORAGE_KEY = 'storeApps'
const STORE_NOTIFICATION_STORAGE_KEY = 'storeNotifications'
const NEW_ORDER_EVENT = 'projectx:new-order'

export const AppContext = createContext({
  currentUser: null,
  currentStore: null,
  notifications: [],
  storeApps: [],
  hasUnreadNotifications: false,
  isAppReady: false,
  setCurrentUser: () => {},
  setCurrentStore: () => {},
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

function normalizeStore(store) {
  if (!store) {
    return null
  }

  return {
    ...store,
    themeConfig: getThemeConfig(store.themeConfig),
    onboardingStep: Number(store.onboardingStep) || 1,
    isOnboardingCompleted: Boolean(store.isOnboardingCompleted),
  }
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUserState] = useState(null)
  const [currentStore, setCurrentStoreState] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [storeApps, setStoreAppsState] = useState([])
  const [notificationMeta, setNotificationMeta] = useState({})
  const [isAppReady, setIsAppReady] = useState(false)
  const latestOrderTimestampRef = useRef({})

  useEffect(() => {
    const storedUser = readJson(CURRENT_USER_STORAGE_KEY, null)
    const storedStore = readJson(CURRENT_STORE_STORAGE_KEY, null)
    const storedStoreApps = readJson(STORE_APPS_STORAGE_KEY, [])
    const storedNotificationMeta = readJson(STORE_NOTIFICATION_STORAGE_KEY, {})

    if (storedUser) {
      setCurrentUserState(storedUser)
    }

    if (storedStore) {
      setCurrentStoreState(normalizeStore(storedStore))
    }

    setStoreAppsState(storedStoreApps)
    setNotificationMeta(storedNotificationMeta)

    setIsAppReady(true)
  }, [])

  useEffect(() => {
    writeJson(CURRENT_USER_STORAGE_KEY, currentUser)
  }, [currentUser])

  useEffect(() => {
    writeJson(CURRENT_STORE_STORAGE_KEY, currentStore)
  }, [currentStore])

  useEffect(() => {
    writeJson(STORE_APPS_STORAGE_KEY, storeApps)
  }, [storeApps])

  useEffect(() => {
    writeJson(STORE_NOTIFICATION_STORAGE_KEY, notificationMeta)
  }, [notificationMeta])

  useEffect(() => {
    async function hydrateStore() {
      if (!currentUser?.id) {
        return
      }

      try {
        const stores = await getStoresByUserId(currentUser.id)
        if (stores.length === 0) {
          setCurrentStoreState(null)
          return
        }

        const matchingStore = stores.find((store) => {
          if (currentStore?.id && store.id === currentStore.id) {
            return true
          }

          if (currentStore?.url && store.url === currentStore.url) {
            return true
          }

          return false
        })

        setCurrentStoreState(normalizeStore(matchingStore ?? stores.at(-1) ?? null))
      } catch (error) {
        console.error(error)
      }
    }

    hydrateStore()
  }, [currentStore?.id, currentStore?.url, currentUser?.id])

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

  function setCurrentStore(store) {
    setCurrentStoreState(normalizeStore(store))
  }

  function setStoreApps(nextStoreApps) {
    setStoreAppsState(nextStoreApps ?? [])
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
      setCurrentStoreState(null)
      setStoreAppsState([])
      writeJson(CURRENT_STORE_STORAGE_KEY, null)
      writeJson(STORE_APPS_STORAGE_KEY, [])
      return { user: nextUser, store: null }
    }

    const stores = await getStoresByUserId(nextUser.id)
    const nextStore = normalizeStore(stores.at(-1) ?? null)
    setCurrentStoreState(nextStore)
    writeJson(CURRENT_STORE_STORAGE_KEY, nextStore)

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
    setCurrentStoreState(null)
    setNotifications([])
    setStoreAppsState([])
    writeJson(CURRENT_USER_STORAGE_KEY, null)
    writeJson(CURRENT_STORE_STORAGE_KEY, null)
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
        notifications,
        storeApps,
        hasUnreadNotifications,
        isAppReady,
        setCurrentUser,
        setCurrentStore,
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
