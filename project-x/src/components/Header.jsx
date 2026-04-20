import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from './ui/Button.jsx'
import IconButton from './ui/IconButton.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { logoutUser } from '../utils/auth.js'

const routeTitles = [
  { match: /^\/dashboard$/, title: 'Dashboard' },
  { match: /^\/onboarding(\/step-\d+)?$/, title: 'Dashboard' },
  { match: /^\/stores$/, title: 'All Stores' },
  { match: /^\/products$/, title: 'Products' },
  { match: /^\/products\/new$/, title: 'Add Product' },
  { match: /^\/products\/edit\/[^/]+$/, title: 'Edit Product' },
  { match: /^\/orders$/, title: 'Orders' },
  { match: /^\/orders\/[^/]+$/, title: 'Order Details' },
  { match: /^\/marketing$/, title: 'Marketing' },
  { match: /^\/customers$/, title: 'Customers' },
  { match: /^\/customers\/[^/]+$/, title: 'Customer Details' },
  { match: /^\/payments$/, title: 'Payments' },
  { match: /^\/themes$/, title: 'Themes' },
  { match: /^\/dashboard\/editor$/, title: 'Visual Editor' },
  { match: /^\/dashboard\/coupons$/, title: 'Coupons' },
  { match: /^\/apps$/, title: 'Apps' },
  { match: /^\/pages$/, title: 'Pages' },
  { match: /^\/blog-post$/, title: 'Blog Post' },
]

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

function Header({ onMenuToggle }) {
  const location = useLocation()
  const navigate = useNavigate()
  const searchInputRef = useRef(null)
  const notificationMenuRef = useRef(null)
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false)
  const {
    currentUser,
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
      const isMacShortcut = event.metaKey && event.key.toLowerCase() === 'k'
      const isWindowsShortcut = event.ctrlKey && event.key.toLowerCase() === 'k'

      if (!isMacShortcut && !isWindowsShortcut) {
        return
      }

      event.preventDefault()
      searchInputRef.current?.focus()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

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

      <div className="app-header__search">
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
        <input
          ref={searchInputRef}
          type="search"
          placeholder="Search"
          aria-label="Search"
        />
        <button
          className="app-header__shortcut"
          type="button"
          onClick={() => searchInputRef.current?.focus()}
          aria-label="Focus search using Command or Control K"
        >
          <span className="app-header__shortcut-key">
            {isMacPlatform ? '⌘' : 'Ctrl'}
          </span>
          <span className="app-header__shortcut-key">K</span>
        </button>
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

        {currentUser?.email ? (
          <div className="app-header__user">
            <span>{currentUser.email}</span>
          </div>
        ) : null}

        <Button className="app-header__logout" onClick={handleLogout} variant="outline">
          Logout
        </Button>

        <IconButton aria-label="Settings">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M10.325 4.317a1 1 0 0 1 1.35-.936l.325.156a1 1 0 0 0 .86 0l.325-.156a1 1 0 0 1 1.35.936v.378a1 1 0 0 0 .51.87l.328.189a1 1 0 0 1 .366 1.366l-.19.328a1 1 0 0 0 0 1l.19.328a1 1 0 0 1-.366 1.366l-.328.19a1 1 0 0 0-.51.869v.378a1 1 0 0 1-1.35.936l-.325-.156a1 1 0 0 0-.86 0l-.325.156a1 1 0 0 1-1.35-.936v-.378a1 1 0 0 0-.51-.87l-.328-.189a1 1 0 0 1-.366-1.366l.19-.328a1 1 0 0 0 0-1l-.19-.328a1 1 0 0 1 .366-1.366l.328-.19a1 1 0 0 0 .51-.869v-.378Z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <circle
              cx="12"
              cy="12"
              r="3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </IconButton>

        <div className="header-notifications" ref={notificationMenuRef}>
          <IconButton
            className={`header-icon-button--notification${hasUnreadNotifications ? ' is-active' : ''}`}
            aria-label="Notifications"
            onClick={handleNotificationToggle}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
              <path
                d="M9 17a3 3 0 0 0 6 0"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
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
