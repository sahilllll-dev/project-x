import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from './ui/Button.jsx'
import IconButton from './ui/IconButton.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { logoutUser } from '../utils/auth.js'

const routeTitles = [
  { match: /^\/dashboard$/, title: 'Dashboard' },
  { match: /^\/stores$/, title: 'All Stores' },
  { match: /^\/products$/, title: 'Products' },
  { match: /^\/categories$/, title: 'Categories' },
  { match: /^\/products\/new$/, title: 'Add Product' },
  { match: /^\/products\/edit\/[^/]+$/, title: 'Edit Product' },
  { match: /^\/orders$/, title: 'Orders' },
  { match: /^\/orders\/[^/]+$/, title: 'Order Details' },
  { match: /^\/marketing$/, title: 'Marketing' },
  { match: /^\/customers$/, title: 'Customers' },
  { match: /^\/customers\/[^/]+$/, title: 'Customer Details' },
  { match: /^\/payments$/, title: 'Payments' },
  { match: /^\/admin\/settings(\/.*)?$/, title: 'Store Settings' },
  { match: /^\/settings(\/.*)?$/, title: 'Store Settings' },
  { match: /^\/themes$/, title: 'Themes' },
  { match: /^\/dashboard\/editor$/, title: 'Visual Editor' },
  { match: /^\/dashboard\/coupons$/, title: 'Coupons' },
  { match: /^\/admin\/apps\/[^/]+$/, title: 'App' },
  { match: /^\/apps$/, title: 'Apps' },
  { match: /^\/pages$/, title: 'Pages' },
  { match: /^\/pages\/create$/, title: 'Create Page' },
  { match: /^\/pages\/edit\/[^/]+$/, title: 'Edit Page' },
  { match: /^\/preview\/page\/[^/]+$/, title: 'Page Preview' },
]

function getKeyboardKey(event) {
  return typeof event.key === 'string' ? event.key.toLowerCase() : ''
}

function getStoreUrlSlug(value) {
  return String(value || '').replace(/\.projectx\.com$/i, '')
}

function formatNotificationDate(value) {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Header({ onMenuToggle, onOpenGlobalSearch }) {
  const location = useLocation()
  const navigate = useNavigate()
  const notificationMenuRef = useRef(null)
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false)
  const {
    currentStore,
    notifications,
    hasUnreadNotifications,
    markNotificationsAsRead,
    clearAppContext,
  } = useAppContext()
  const isMacPlatform =
    typeof window !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(window.navigator.platform)
  const currentTitle =
    routeTitles.find((route) => route.match.test(location.pathname))?.title ??
    'Dashboard'

  useEffect(() => {
    function handleKeyDown(event) {
      const key = getKeyboardKey(event)
      const isMacShortcut = event.metaKey && key === 'k'
      const isWindowsShortcut = event.ctrlKey && key === 'k'

      if (!isMacShortcut && !isWindowsShortcut) {
        return
      }

      event.preventDefault()
      onOpenGlobalSearch?.('products')
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onOpenGlobalSearch])

  useEffect(() => {
    function handleClickOutside(event) {
      if (!notificationMenuRef.current?.contains(event.target)) {
        setIsNotificationMenuOpen(false)
      }
    }

    if (isNotificationMenuOpen) {
      window.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isNotificationMenuOpen])

  const currentStoreLink = currentStore
    ? `/store/${encodeURIComponent(getStoreUrlSlug(currentStore.url ?? currentStore.slug ?? currentStore.name))}`
    : ''

  async function handleLogout() {
    await logoutUser()
    clearAppContext()
    navigate('/login')
  }

  function handleNotificationToggle() {
    const nextOpenState = !isNotificationMenuOpen
    setIsNotificationMenuOpen(nextOpenState)

    if (nextOpenState) {
      markNotificationsAsRead()
    }
  }

  return (
    <header className="app-header">
      <button
        className="app-header__menu-toggle"
        type="button"
        aria-label="Open sidebar"
        onClick={onMenuToggle}
      >
        <span />
        <span />
        <span />
      </button>

      <div className="app-header__title">
        <h1>{currentTitle}</h1>
      </div>

      <div
        className="app-header__search"
        role="button"
        tabIndex="0"
        onClick={() => onOpenGlobalSearch?.('products')}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpenGlobalSearch?.('products')
          }
        }}
      >
        <span className="app-header__search-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle
              cx="11"
              cy="11"
              r="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M20 20l-4.35-4.35"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
        </span>
        <span className="app-header__search-placeholder">Search</span>
        <span
          className="app-header__shortcut"
          aria-hidden="true"
        >
          <span className="app-header__shortcut-key">
            {isMacPlatform ? '⌘' : 'Ctrl'}
          </span>
          <span className="app-header__shortcut-key">K</span>
        </span>
      </div>

      <div className="app-header__actions">
        {currentStore ? (
          <div className="app-header__store">
            <Button
              as="a"
              className="visit-store-button"
              href={currentStoreLink}
              aria-label={`Visit ${currentStore.name || 'store'}`}
              rel="noreferrer"
              target="_blank"
              variant="outline"
              title={currentStore.url || 'Visit store'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4.5 10.5 6 4.75h12l1.5 5.75"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.6"
                />
                <path
                  d="M5.25 10.5h13.5v8.75a1 1 0 0 1-1 1H6.25a1 1 0 0 1-1-1V10.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinejoin="round"
                  strokeWidth="1.6"
                />
                <path
                  d="M9 20.25v-5.5h6v5.5M4.25 10.5c.3 1.25 1.2 2 2.35 2 1.1 0 1.9-.55 2.4-1.45.5.9 1.3 1.45 2.4 1.45s1.9-.55 2.4-1.45c.5.9 1.3 1.45 2.4 1.45 1.15 0 2.05-.75 2.35-2"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.6"
                />
              </svg>
            </Button>
          </div>
        ) : null}

        <Button className="app-header__logout" onClick={handleLogout} variant="outline">
          Logout
        </Button>

        <IconButton
          className={`header-icon-button${location.pathname.startsWith('/admin/settings') || location.pathname.startsWith('/settings') ? ' header-icon-button--active' : ''}`}
          aria-label="Settings"
          title="Settings"
          onClick={() => navigate('/admin/settings')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle
              cx="12"
              cy="12"
              r="3"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.07V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.07-.33H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1.07V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.38.39.71.72.95.29.22.65.33 1.01.32H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51.73Z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </IconButton>

        <div className="header-notifications" ref={notificationMenuRef}>
          <IconButton
            className={`header-icon-button header-icon-button--notification${hasUnreadNotifications ? ' is-active' : ''}`}
            aria-label="Notifications"
            title="Notifications"
            onClick={handleNotificationToggle}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
              <path
                d="M13.73 21a2 2 0 0 1-3.46 0"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
            {hasUnreadNotifications ? <span className="notification-dot" aria-hidden="true" /> : null}
          </IconButton>

          {isNotificationMenuOpen ? (
            <div className="notification-menu">
              <div className="notification-menu__header">
                <strong>Notifications</strong>
                {notifications.length > 0 ? <span>{notifications.length} recent</span> : null}
              </div>

              {notifications.length === 0 ? (
                <p className="notification-menu__empty">No notifications yet.</p>
              ) : (
                <div className="notification-menu__list">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      className="notification-menu__item"
                      type="button"
                      onClick={() => {
                        setIsNotificationMenuOpen(false)
                        navigate('/orders')
                      }}
                    >
                      <strong>New order for {notification.productTitle}</strong>
                      <span>{notification.customerName || 'Customer order received'}</span>
                      <small>{formatNotificationDate(notification.createdAt)}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export default Header
