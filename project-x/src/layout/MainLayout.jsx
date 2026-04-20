import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { getStoresByUserId } from '../utils/api.js'

function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, currentStore, isAppReady } = useAppContext()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [storeCount, setStoreCount] = useState(null)
  const isNewStoreFlow = location.pathname === '/onboarding/new'
  const isStoreOnboardingRoute = /^\/onboarding\/(?!new(?:\/|$))[^/]+$/.test(location.pathname)
  const isStoresRoute = location.pathname.startsWith('/stores')
  const isNewUser = storeCount === 0
  const showHeader = !isNewStoreFlow || storeCount > 0
  const showSidebar = showHeader && Boolean(currentStore)

  useEffect(() => {
    if (
      isAppReady &&
      !currentStore &&
      !isNewStoreFlow &&
      !isStoreOnboardingRoute &&
      !isStoresRoute
    ) {
      navigate('/onboarding/new', { replace: true })
    }
  }, [currentStore, isAppReady, isNewStoreFlow, isStoreOnboardingRoute, isStoresRoute, navigate])

  useEffect(() => {
    if (!currentUser?.id || !isNewStoreFlow) {
      return
    }

    async function loadStoreCount() {
      try {
        const stores = await getStoresByUserId(currentUser.id)
        setStoreCount(stores.length)
      } catch (error) {
        console.error(error)
        setStoreCount(null)
      }
    }

    loadStoreCount()
  }, [currentUser?.id, isNewStoreFlow])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsMobileSidebarOpen(false)
    }, 0)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [location.pathname])

  return (
    <div
      className={[
        'layout',
        isMobileSidebarOpen ? 'layout--sidebar-open' : '',
        showHeader ? '' : 'layout--no-header',
        showSidebar ? '' : 'layout--no-sidebar',
        isNewUser && isNewStoreFlow ? 'layout--first-onboarding' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        className="layout__backdrop"
        type="button"
        aria-label="Close sidebar"
        onClick={() => setIsMobileSidebarOpen(false)}
      />
      {showSidebar ? <Sidebar /> : null}
      <div className="main">
        {showHeader ? (
          <Header onMenuToggle={() => setIsMobileSidebarOpen((isOpen) => !isOpen)} />
        ) : null}
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default MainLayout
