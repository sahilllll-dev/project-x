import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppContext } from '../context/AppContext.jsx'

function ProtectedRoute() {
  const location = useLocation()
  const { currentUser, currentStore, isAppReady, isStoreReady, stores } = useAppContext()
  const isOnboardingRoute =
    location.pathname === '/onboarding' || location.pathname === '/onboarding/new'
  const hasStore = Boolean(currentStore?.id || stores.length > 0)

  if (!isAppReady) {
    return null
  }

  if (!currentUser) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  if (!isStoreReady) {
    return null
  }

  if (!hasStore && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />
  }

  if (hasStore && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
