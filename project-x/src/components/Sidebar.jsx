import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext.jsx'
import { useStore } from '../context/StoreContext.jsx'
import { logoutUser } from '../utils/auth.js'
import { getStoresByUserId } from '../utils/api.js'
import { getStoreDestination } from '../utils/onboarding.js'
import { getStoreAvatarStyle, getStoreInitial } from '../utils/storeAvatar.js'
import appsIcon from '../assets/Dashboard Icons/Apps.svg'
import customersIcon from '../assets/Dashboard Icons/Customers.svg'
import dashboardIcon from '../assets/Dashboard Icons/Dashboard.svg'
import marketingIcon from '../assets/Dashboard Icons/Marketing.svg'
import ordersIcon from '../assets/Dashboard Icons/Orders.svg'
import pagesIcon from '../assets/Dashboard Icons/Pages.svg'
import paymentsIcon from '../assets/Dashboard Icons/Payments.svg'
import productsIcon from '../assets/Dashboard Icons/Products.svg'
import themesIcon from '../assets/Dashboard Icons/Themes.svg'

const mainMenuItems = [
  { label: 'Dashboard', to: '/dashboard', icon: dashboardIcon },
  { label: 'Products', to: '/products', icon: productsIcon },
  { label: 'Categories', to: '/categories', icon: pagesIcon },
  { label: 'Orders', to: '/orders', icon: ordersIcon },
  {
    label: 'Marketing',
    icon: marketingIcon,
    children: [
      { label: 'Overview', to: '/marketing' },
      { label: 'Coupons', to: '/dashboard/coupons' },
    ],
  },
  {
    label: 'Content',
    icon: pagesIcon,
    children: [
      { label: 'Blogs', to: '/blogs' },
    ],
  },
  { label: 'Customers', to: '/customers', icon: customersIcon },
  { label: 'Payments', to: '/payments', icon: paymentsIcon },
]

const storeMenuItems = [
  { label: 'Themes', to: '/themes', icon: themesIcon },
  { label: 'Visual Editor', to: '/dashboard/editor', icon: pagesIcon },
  { label: 'Apps', to: '/apps', icon: appsIcon, badgeKey: 'apps' },
  { label: 'Pages', to: '/pages', icon: pagesIcon, badge: '6' },
]

const logoutShortcutKeys = ['b', 'y', 'e']

function isEditableElement(element) {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element?.isContentEditable
  )
}

function SidebarSkeleton() {
  return (
    <div className="sidebar-skeleton" aria-label="Loading sidebar">
      <div className="sidebar-skeleton__store">
        <span className="sidebar-skeleton__avatar" />
        <span className="sidebar-skeleton__line sidebar-skeleton__line--title" />
        <span className="sidebar-skeleton__dots" />
      </div>

      <div className="sidebar-skeleton__section">
        <span className="sidebar-skeleton__line sidebar-skeleton__line--label" />
        {Array.from({ length: 6 }).map((_, index) => (
          <span className="sidebar-skeleton__nav" key={`main-${index}`}>
            <span className="sidebar-skeleton__icon" />
            <span className="sidebar-skeleton__line" />
          </span>
        ))}
      </div>

      <div className="sidebar-skeleton__section">
        <span className="sidebar-skeleton__line sidebar-skeleton__line--label" />
        {Array.from({ length: 5 }).map((_, index) => (
          <span className="sidebar-skeleton__nav" key={`store-${index}`}>
            <span className="sidebar-skeleton__icon" />
            <span className="sidebar-skeleton__line" />
          </span>
        ))}
      </div>
    </div>
  )
}

function Sidebar({ isLoading = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const dropdownRef = useRef(null)
  const { currentUser, storeApps, clearAppContext } = useAppContext()
  const { currentStore, setCurrentStore, stores, setStores } = useStore()
  const [isStoreMenuOpen, setIsStoreMenuOpen] = useState(false)
  const [openMenuKey, setOpenMenuKey] = useState('')
  const hasStore = Boolean(currentStore?.name)
  const storeTitle = hasStore ? currentStore.name : 'Create Store'
  const storeInitial = hasStore ? getStoreInitial(currentStore) : 'S'
  const activeDropdownKey = mainMenuItems.find((item) =>
    item.children?.some((child) => child.to === location.pathname),
  )?.label
  const expandedMenuKey = openMenuKey || activeDropdownKey

  useEffect(() => {
    async function loadStores() {
      if (!currentUser?.id) {
        setStores([])
        return
      }

      try {
        setStores(await getStoresByUserId(currentUser.id))
      } catch (error) {
        console.error(error)
      }
    }

    if (isStoreMenuOpen) {
      loadStores()
    }
  }, [currentUser?.id, isStoreMenuOpen, setStores])

  useEffect(() => {
    function handleClickOutside(event) {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsStoreMenuOpen(false)
      }
    }

    if (isStoreMenuOpen) {
      window.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isStoreMenuOpen])

  useEffect(() => {
    const pressedKeys = new Set()

    function handleKeyDown(event) {
      if (isEditableElement(event.target)) {
        return
      }

      const key = event.key.toLowerCase()

      if (!logoutShortcutKeys.includes(key)) {
        return
      }

      pressedKeys.add(key)

      if (logoutShortcutKeys.every((shortcutKey) => pressedKeys.has(shortcutKey))) {
        event.preventDefault()
        handleLogout()
      }
    }

    function handleKeyUp(event) {
      pressedKeys.delete(event.key.toLowerCase())
    }

    function handleWindowBlur() {
      pressedKeys.clear()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleWindowBlur)
    }
  })

  async function handleLogout() {
    await logoutUser()
    clearAppContext()
    navigate('/login')
  }

  function handleStoreMenuToggle() {
    setIsStoreMenuOpen((isOpen) => !isOpen)
  }

  function handleStoreSelect(store) {
    setCurrentStore(store)
    setIsStoreMenuOpen(false)
    navigate(getStoreDestination(store))
  }

  return (
    <aside className="app-sidebar">
      {isLoading ? <SidebarSkeleton /> : null}

      {!isLoading ? (
      <div className="sidebar-body">
        <div className="sidebar-store" ref={dropdownRef}>
          <button
            className={`sidebar-store__brand${hasStore ? '' : ' sidebar-store__brand--empty'}`}
            type="button"
            onClick={handleStoreMenuToggle}
          >
            <div className="sidebar-logo" style={getStoreAvatarStyle(currentStore)}>
              {storeInitial}
            </div>
            <div className="sidebar-store__copy">
              <p className="sidebar-store__name">{storeTitle}</p>
            </div>
            <span className="sidebar-store__menu" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>

          {isStoreMenuOpen ? (
            <div className="sidebar-store-dropdown">
              <div className="sidebar-store-dropdown__stores">
                {currentStore ? (
                  <button
                    className="sidebar-store-option sidebar-store-option--active"
                    type="button"
                    onClick={() => handleStoreSelect(currentStore)}
                  >
                    <span
                      className="sidebar-store-option__avatar"
                      style={getStoreAvatarStyle(currentStore)}
                    >
                      {getStoreInitial(currentStore)}
                    </span>
                    <span>{currentStore.name}</span>
                    <span className="sidebar-store-option__check">✓</span>
                  </button>
                ) : null}

                {stores
                  .filter((store) => store.id !== currentStore?.id)
                  .map((store) => (
                    <button
                      className="sidebar-store-option"
                      type="button"
                      key={store.id}
                      onClick={() => handleStoreSelect(store)}
                    >
                      <span
                        className="sidebar-store-option__avatar"
                        style={getStoreAvatarStyle(store)}
                      >
                        {getStoreInitial(store)}
                      </span>
                      <span>{store.name}</span>
                    </button>
                  ))}

                {!currentStore && stores.length === 0 ? (
                  <div className="sidebar-store-empty">
                    <span className="sidebar-store-option__avatar">S</span>
                    <div>
                      <strong>No stores yet</strong>
                      <p>Create a store to start selling.</p>
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                className="sidebar-store-dropdown__all"
                type="button"
                onClick={() => {
                  setIsStoreMenuOpen(false)
                  navigate('/stores')
                }}
              >
                All Stores
              </button>

              <div className="sidebar-store-dropdown__links">
                <button type="button">Help Center</button>
                <button type="button">Keyboard Shortcuts</button>
                <button type="button">Manage your account</button>
                <button
                  className="sidebar-store-dropdown__logout"
                  type="button"
                  onClick={handleLogout}
                >
                  <span>Logout</span>
                  <span className="sidebar-shortcut-keys" aria-label="Shortcut B Y E">
                    <kbd>B</kbd>
                    <kbd>Y</kbd>
                    <kbd>E</kbd>
                  </span>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="sidebar-section">
          <p className="sidebar-section__title">Main Menu</p>
          <nav className="sidebar-nav" aria-label="Main menu">
            {mainMenuItems.map((item) => {
              if (item.children) {
                const isExpanded = expandedMenuKey === item.label
                const isActive = item.children.some((child) => child.to === location.pathname)

                return (
                  <div className="sidebar-dropdown" key={item.label}>
                    <button
                      className={`sidebar-link sidebar-link--button${
                        isActive ? ' sidebar-link--active' : ''
                      }`}
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setOpenMenuKey((currentKey) =>
                          currentKey === item.label ? '' : item.label,
                        )
                      }
                    >
                      <span className="sidebar-link__icon" aria-hidden="true">
                        <img src={item.icon} alt="" />
                      </span>
                      <span>{item.label}</span>
                      <span className="sidebar-link__chevron" aria-hidden="true">
                        {isExpanded ? '⌃' : '⌄'}
                      </span>
                    </button>

                    {isExpanded ? (
                      <div className="sidebar-subnav">
                        {item.children.map((child) => (
                          <NavLink
                            className={({ isActive: isChildActive }) =>
                              `sidebar-subnav__link${
                                isChildActive ? ' sidebar-subnav__link--active' : ''
                              }`
                            }
                            key={child.to}
                            to={child.to}
                          >
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `sidebar-link${isActive ? ' sidebar-link--active' : ''}`
                  }
                >
                  <span className="sidebar-link__icon" aria-hidden="true">
                    <img src={item.icon} alt="" />
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-section__title">Store</p>
          <nav className="sidebar-nav" aria-label="Store menu">
            {storeMenuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? ' sidebar-link--active' : ''}`
                }
              >
                <span className="sidebar-link__icon" aria-hidden="true">
                  <img src={item.icon} alt="" />
                </span>
                <span>{item.label}</span>
                {item.badge || item.badgeKey === 'apps' ? (
                  <span className="sidebar-badge">
                    {item.badgeKey === 'apps' ? storeApps.length : item.badge}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      ) : null}

    </aside>
  )
}

export default Sidebar
