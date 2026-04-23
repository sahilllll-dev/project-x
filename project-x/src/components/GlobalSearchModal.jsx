import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  getApps,
  getCustomers,
  getOrders,
  getProducts,
  installStoreApp,
} from '../utils/api.js'
import AllAppsModal from './AllAppsModal.jsx'
import Button from './ui/Button.jsx'

const searchTabs = [
  { id: 'apps', label: 'Apps' },
  { id: 'products', label: 'Products' },
  { id: 'orders', label: 'Orders' },
  { id: 'customers', label: 'Customers' },
]

function normalizeSearch(value) {
  return String(value ?? '').trim().toLowerCase()
}

function getAppIconLabel(app) {
  return String(app?.name ?? app?.slug ?? 'App')
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getAppSlug(storeApp) {
  return storeApp?.app?.slug ?? storeApp?.appId ?? storeApp?.id ?? ''
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function GlobalSearchModal({ defaultTab = 'products', isOpen, onClose }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const {
    currentStore,
    storeApps,
    setStoreApps,
    refreshStoreApps,
    isAppEnabled,
  } = useAppContext()
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [query, setQuery] = useState('')
  const [apps, setApps] = useState([])
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [pendingAppId, setPendingAppId] = useState('')
  const [isAllAppsModalOpen, setIsAllAppsModalOpen] = useState(false)
  const currentStoreId = currentStore?.id ?? ''

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isAllAppsModalOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isAllAppsModalOpen, isOpen, onClose])

  useEffect(() => {
    let isCancelled = false

    async function loadSearchData() {
      if (!isOpen || !currentStoreId) {
        setApps([])
        setProducts([])
        setOrders([])
        setCustomers([])
        return
      }

      setIsLoading(true)

      try {
        const [nextApps, nextProducts, nextOrders, nextCustomers] = await Promise.all([
          getApps(),
          getProducts(currentStoreId),
          getOrders(currentStoreId),
          getCustomers(currentStoreId),
          refreshStoreApps(),
        ])

        if (isCancelled) {
          return
        }

        setApps(nextApps)
        setProducts(nextProducts)
        setOrders(nextOrders)
        setCustomers(nextCustomers)
      } catch (error) {
        console.error(error)

        if (!isCancelled) {
          showToast(error.message || 'Failed to load search results', 'error')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadSearchData()

    return () => {
      isCancelled = true
    }
  }, [currentStoreId, isOpen, refreshStoreApps, showToast])

  const installedAppIds = useMemo(
    () => new Set(storeApps.map((storeApp) => storeApp.appId)),
    [storeApps],
  )
  const installedApps = useMemo(
    () =>
      storeApps
        .map((storeApp) => ({
          ...storeApp,
          app: storeApp.app ?? apps.find((app) => app.id === storeApp.appId) ?? null,
        }))
        .filter((storeApp) => storeApp.app),
    [apps, storeApps],
  )
  const recommendedApps = useMemo(
    () => apps.filter((app) => !installedAppIds.has(app.id)),
    [apps, installedAppIds],
  )
  const searchTerm = normalizeSearch(query)
  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        normalizeSearch(`${product.title} ${product.sku} ${product.status}`).includes(searchTerm),
      ),
    [products, searchTerm],
  )
  const filteredOrders = useMemo(
    () =>
      orders.filter((order) =>
        normalizeSearch(`${order.id} ${order.customerName} ${order.paymentStatus}`).includes(
          searchTerm,
        ),
      ),
    [orders, searchTerm],
  )
  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) =>
        normalizeSearch(`${customer.name} ${customer.email}`).includes(searchTerm),
      ),
    [customers, searchTerm],
  )
  const filteredInstalledApps = useMemo(
    () =>
      installedApps.filter((storeApp) =>
        normalizeSearch(`${storeApp.app?.name} ${storeApp.appId}`).includes(searchTerm),
      ),
    [installedApps, searchTerm],
  )
  const filteredRecommendedApps = useMemo(
    () =>
      recommendedApps.filter((app) =>
        normalizeSearch(`${app.name} ${app.description}`).includes(searchTerm),
      ),
    [recommendedApps, searchTerm],
  )
  const recommendedAppsPreview = filteredRecommendedApps.slice(0, 3)

  function navigateAndClose(path) {
    onClose()
    navigate(path)
  }

  async function handleInstall(appId) {
    if (!currentStoreId) {
      return
    }

    setPendingAppId(appId)

    try {
      const installedApp = await installStoreApp(currentStoreId, appId)
      setStoreApps([
        ...storeApps.filter((storeApp) => storeApp.appId !== appId),
        installedApp,
      ])
      showToast('App installed', 'success')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Failed to install app', 'error')
    } finally {
      setPendingAppId('')
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="global-search-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="global-search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="global-search-modal__header">
          <div className="global-search-modal__input">
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="6" />
                <path d="M20 20l-4.35-4.35" />
              </svg>
            </span>
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search"
            />
          </div>
          <button
            className="global-search-modal__close"
            type="button"
            onClick={onClose}
            aria-label="Close search"
          >
            x
          </button>
        </div>

        <div className="global-search-tabs" role="tablist" aria-label="Search sections">
          {searchTabs.map((tab) => (
            <button
              className={`global-search-tabs__button${
                activeTab === tab.id ? ' global-search-tabs__button--active' : ''
              }`}
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="global-search-modal__body">
          {!currentStoreId ? (
            <p className="global-search-empty">Create a store to search admin data.</p>
          ) : null}

          {currentStoreId && activeTab === 'apps' ? (
            <div className="global-search-stack" role="tabpanel">
              <div className="global-search-section">
                <div className="global-search-section__heading">
                  <h3>Installed Apps</h3>
                  <Button
                    onClick={() => navigateAndClose('/admin/settings/apps')}
                    size="sm"
                    variant="outline"
                  >
                    App Settings
                  </Button>
                </div>
                {filteredInstalledApps.length === 0 ? (
                  <p className="global-search-empty">
                    {isLoading ? 'Loading apps...' : 'No installed apps'}
                  </p>
                ) : (
                  <div className="global-search-list">
                    {filteredInstalledApps.map((storeApp) => (
                      <button
                        className="global-search-result"
                        key={storeApp.id}
                        type="button"
                        onClick={() => navigateAndClose(`/admin/apps/${getAppSlug(storeApp)}`)}
                      >
                        <span className={`app-card__icon app-card__icon--${storeApp.app.icon}`}>
                          {getAppIconLabel(storeApp.app)}
                        </span>
                        <span>
                          <strong>{storeApp.app.name}</strong>
                          <small>{isAppEnabled(storeApp.appId) ? 'Enabled' : 'Disabled'}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="global-search-section">
                <div className="global-search-section__heading">
                  <h3>Recommended Apps</h3>
                  <button
                    className="global-search-link"
                    type="button"
                    onClick={() => setIsAllAppsModalOpen(true)}
                  >
                    View All Apps
                  </button>
                </div>
                {recommendedAppsPreview.length === 0 ? (
                  <p className="global-search-empty">
                    {isLoading ? 'Loading apps...' : 'No recommendations'}
                  </p>
                ) : (
                  <div className="global-search-list">
                    {recommendedAppsPreview.map((app) => {
                      const isInstalled = installedAppIds.has(app.id)

                      return (
                        <div className="global-search-result" key={app.id}>
                          <span className={`app-card__icon app-card__icon--${app.icon}`}>
                            {getAppIconLabel(app)}
                          </span>
                          <span>
                            <strong>{app.name}</strong>
                            <small>{isInstalled ? 'Installed' : app.description}</small>
                          </span>
                          <Button
                            disabled={pendingAppId === app.id}
                            onClick={() =>
                              isInstalled
                                ? navigateAndClose(`/admin/apps/${app.slug}`)
                                : handleInstall(app.id)
                            }
                            size="sm"
                            variant={isInstalled ? 'outline' : 'primary'}
                          >
                            {isInstalled ? 'Open' : pendingAppId === app.id ? 'Installing...' : 'Install'}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {currentStoreId && activeTab === 'products' ? (
            <div className="global-search-list" role="tabpanel">
              {filteredProducts.length === 0 ? (
                <p className="global-search-empty">
                  {isLoading ? 'Loading products...' : 'No products found'}
                </p>
              ) : (
                filteredProducts.slice(0, 8).map((product) => (
                  <button
                    className="global-search-result"
                    key={product.id}
                    type="button"
                    onClick={() => navigateAndClose(`/products/edit/${product.id}`)}
                  >
                    <span>
                      <strong>{product.title}</strong>
                      <small>{product.status}</small>
                    </span>
                    <small>{formatCurrency(product.price)}</small>
                  </button>
                ))
              )}
            </div>
          ) : null}

          {currentStoreId && activeTab === 'orders' ? (
            <div className="global-search-list" role="tabpanel">
              {filteredOrders.length === 0 ? (
                <p className="global-search-empty">
                  {isLoading ? 'Loading orders...' : 'No orders found'}
                </p>
              ) : (
                filteredOrders.slice(0, 8).map((order) => (
                  <button
                    className="global-search-result"
                    key={order.id}
                    type="button"
                    onClick={() => navigateAndClose(`/orders/${order.id}`)}
                  >
                    <span>
                      <strong>#{order.id}</strong>
                      <small>{order.customerName || 'Guest customer'}</small>
                    </span>
                    <small>{formatCurrency(order.finalAmount ?? order.totalAmount)}</small>
                  </button>
                ))
              )}
            </div>
          ) : null}

          {currentStoreId && activeTab === 'customers' ? (
            <div className="global-search-list" role="tabpanel">
              {filteredCustomers.length === 0 ? (
                <p className="global-search-empty">
                  {isLoading ? 'Loading customers...' : 'No customers found'}
                </p>
              ) : (
                filteredCustomers.slice(0, 8).map((customer) => (
                  <button
                    className="global-search-result"
                    key={customer.id}
                    type="button"
                    onClick={() => navigateAndClose(`/customers/${customer.id}`)}
                  >
                    <span>
                      <strong>{customer.name || 'Guest customer'}</strong>
                      <small>{customer.email || '-'}</small>
                    </span>
                    <small>{customer.totalOrders ?? 0} orders</small>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </section>
      {isAllAppsModalOpen ? (
        <AllAppsModal
          apps={apps}
          installedAppIds={installedAppIds}
          installedApps={installedApps}
          isAppEnabled={isAppEnabled}
          onClose={() => setIsAllAppsModalOpen(false)}
          onInstall={handleInstall}
          onOpenApp={(appSlug) => navigateAndClose(`/admin/apps/${appSlug}`)}
          pendingAppId={pendingAppId}
        />
      ) : null}
    </div>
  )
}

export default GlobalSearchModal
