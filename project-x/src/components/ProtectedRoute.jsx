import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppContext } from '../context/AppContext.jsx'

function ProtectedRoute() {
  const location = useLocation()
  const { currentUser, isAppReady } = useAppContext()

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

  return <Outlet />
}

export default ProtectedRoute
