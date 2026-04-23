/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { getThemeConfig } from '../utils/themeConfig.js'

const StoreContext = createContext({
  currentStore: null,
  setCurrentStore: () => {},
  storeSwitchVersion: 0,
  stores: [],
  setStores: () => {},
})

function normalizeStore(store) {
  if (!store) {
    return null
  }

  return {
    ...store,
    themeConfig: getThemeConfig(store.themeConfig),
    onboardingStep: Number(store.onboardingStep) || 1,
    isOnboardingCompleted: Boolean(store.isOnboardingCompleted),
    isDefault: Boolean(store.isDefault),
    description: store.description ?? '',
    email: store.email ?? '',
    phone: store.phone ?? '',
    currency: store.currency ?? 'INR',
    timezone: store.timezone ?? 'Asia/Kolkata',
    logoUrl: store.logoUrl ?? store.logo_url ?? '',
    faviconUrl: store.faviconUrl ?? store.favicon_url ?? '',
    primaryColor: store.primaryColor ?? store.primary_color ?? '#000000',
    secondaryColor: store.secondaryColor ?? store.secondary_color ?? '#ffffff',
  }
}

function normalizeStores(nextStores) {
  return (nextStores ?? []).map(normalizeStore).filter(Boolean)
}

export function StoreProvider({ children }) {
  const [currentStore, setCurrentStoreState] = useState(null)
  const [storeSwitchVersion, setStoreSwitchVersion] = useState(0)
  const [stores, setStoresState] = useState([])
  const currentStoreRef = useRef(null)

  const setCurrentStore = useCallback((store) => {
    const nextStore = normalizeStore(store)
    const previousStoreId = currentStoreRef.current?.id ?? null
    const nextStoreId = nextStore?.id ?? null

    currentStoreRef.current = nextStore
    setCurrentStoreState(nextStore)

    if (previousStoreId !== nextStoreId) {
      setStoreSwitchVersion((currentVersion) => currentVersion + 1)
    }
  }, [])

  const setStores = useCallback((nextStores) => {
    setStoresState((currentStores) => {
      const resolvedStores =
        typeof nextStores === 'function' ? nextStores(currentStores) : nextStores
      return normalizeStores(resolvedStores)
    })
  }, [])

  return (
    <StoreContext.Provider
      value={{
        currentStore,
        setCurrentStore,
        storeSwitchVersion,
        stores,
        setStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  return useContext(StoreContext)
}

export { StoreContext }
