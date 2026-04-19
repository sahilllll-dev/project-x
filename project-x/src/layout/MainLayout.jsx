import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { useAppContext } from '../context/AppContext.jsx'

function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentStore, isAppReady } = useAppContext()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const isOnboardingRoute = location.pathname.startsWith('/onboarding')

  useEffect(() => {
    if (isAppReady && !currentStore && !isOnboardingRoute) {
      navigate('/onboarding', { replace: true })
    }
  }, [currentStore, isAppReady, isOnboardingRoute, navigate])

  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className={`layout${isMobileSidebarOpen ? ' layout--sidebar-open' : ''}`}>
      <button
        className="layout__backdrop"
        type="button"
        aria-label="Close sidebar"
        onClick={() => setIsMobileSidebarOpen(false)}
      />
      <Sidebar />
      <div className="main">
        <Header onMenuToggle={() => setIsMobileSidebarOpen((isOpen) => !isOpen)} />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default MainLayout
