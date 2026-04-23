import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import GlobalSearchModal from '../components/GlobalSearchModal.jsx'
import Header from '../components/Header.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { useAppContext } from '../context/AppContext.jsx'

function MainLayout() {
  const location = useLocation()
  const { isAppReady, isStoreReady } = useAppContext()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [globalSearchState, setGlobalSearchState] = useState({
    defaultTab: 'products',
    isOpen: false,
  })
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

  function openGlobalSearch(defaultTab = 'products') {
    setGlobalSearchState({
      defaultTab,
      isOpen: true,
    })
  }

  function closeGlobalSearch() {
    setGlobalSearchState((currentState) => ({
      ...currentState,
      isOpen: false,
    }))
  }

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
      <Sidebar isLoading={isSidebarLoading} onOpenGlobalSearch={openGlobalSearch} />
      <div className="main">
        <Header
          onMenuToggle={() => setIsMobileSidebarOpen((isOpen) => !isOpen)}
          onOpenGlobalSearch={openGlobalSearch}
        />
        <div className={`content main-content${isMainContentLoaded ? ' loaded' : ''}`}>
          <Outlet />
        </div>
      </div>
      {globalSearchState.isOpen ? (
        <GlobalSearchModal
          defaultTab={globalSearchState.defaultTab}
          isOpen
          key={globalSearchState.defaultTab}
          onClose={closeGlobalSearch}
        />
      ) : null}
    </div>
  )
}

export default MainLayout
