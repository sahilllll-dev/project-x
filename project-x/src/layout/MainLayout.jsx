import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { useAppContext } from '../context/AppContext.jsx'

function MainLayout() {
  const location = useLocation()
  const { isAppReady, isStoreReady } = useAppContext()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const isSidebarLoading = !isStoreReady
  const isMainContentLoaded = isAppReady && isStoreReady

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
      <Sidebar isLoading={isSidebarLoading} />
      <div className="main">
        <Header onMenuToggle={() => setIsMobileSidebarOpen((isOpen) => !isOpen)} />
        <div className={`content main-content${isMainContentLoaded ? ' loaded' : ''}`}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default MainLayout
