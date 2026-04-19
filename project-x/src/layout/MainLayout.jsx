import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { useAppContext } from '../context/AppContext.jsx'

function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentStore, isAppReady } = useAppContext()
  const isOnboardingRoute = location.pathname.startsWith('/onboarding')

  useEffect(() => {
    if (isAppReady && !currentStore && !isOnboardingRoute) {
      navigate('/onboarding', { replace: true })
    }
  }, [currentStore, isAppReady, isOnboardingRoute, navigate])

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <Header />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default MainLayout
