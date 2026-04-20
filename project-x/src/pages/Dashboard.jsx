import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { checkStoreSlug, getProducts, getStoreById, updateStore } from '../utils/api.js'

const setupSteps = ['Store Settings', 'Add Products', 'Sell Online']

function slugifyStoreName(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\.projectx\.com$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getStoreUrlSlug(value) {
  return String(value || '').replace(/\.projectx\.com$/i, '')
}

function getStoreLink(storeUrl) {
  if (typeof window === 'undefined' || !storeUrl) {
    return '#'
  }

  return `${window.location.origin}/store/${encodeURIComponent(getStoreUrlSlug(storeUrl))}`
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function Dashboard() {
  const navigate = useNavigate()
  const { storeId = '' } = useParams()
  const { currentUser, currentStore, notifications, setCurrentStore } = useAppContext()
  const { showToast } = useToast()
  const [storeName, setStoreName] = useState('')
  const [storeUrl, setStoreUrl] = useState('')
  const [isStoreUrlEdited, setIsStoreUrlEdited] = useState(false)
  const [isUrlAvailable, setIsUrlAvailable] = useState(null)
  const [storeUrlError, setStoreUrlError] = useState('')
  const [isFormValid, setIsFormValid] = useState(false)
  const [logoPreview, setLogoPreview] = useState('')
  const [isStoreCreated, setIsStoreCreated] = useState(false)
  const [hasProducts, setHasProducts] = useState(false)
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [activeStep, setActiveStep] = useState('store-settings')
  const [createdStoreUrl, setCreatedStoreUrl] = useState('')
  const [initialStoreFormSnapshot, setInitialStoreFormSnapshot] = useState('')
  const [formStoreId, setFormStoreId] = useState(null)
  const [isHydratingStore, setIsHydratingStore] = useState(Boolean(storeId))
  const lastTakenUrlToastRef = useRef('')
  const lowStockToastRef = useRef(new Set())
  const storeLink = getStoreLink(createdStoreUrl || storeUrl)
  const storeSlug = getStoreUrlSlug(storeUrl)
  const storeFormSnapshot = JSON.stringify({
    name: storeName.trim(),
    url: storeUrl.trim().toLowerCase(),
  })
  const hasStoreFormChanges = storeFormSnapshot !== initialStoreFormSnapshot
  const recentOrders = notifications.slice(0, 5)

  useEffect(() => {
    async function hydrateStore() {
      if (!storeId) {
        setIsHydratingStore(false)
        return
      }

      if (currentStore?.id === storeId) {
        setIsHydratingStore(false)
        return
      }

      setIsHydratingStore(true)

      try {
        const nextStore = await getStoreById(storeId)
        setCurrentStore(nextStore)
      } catch (error) {
        console.error(error)
        showToast('Store not found', 'error')
        navigate('/stores', { replace: true })
      } finally {
        setIsHydratingStore(false)
      }
    }

    hydrateStore()
  }, [currentStore?.id, navigate, setCurrentStore, showToast, storeId])

  useEffect(() => {
    const latestStore = currentStore

    if (!latestStore) {
      setStoreName('')
      setStoreUrl('')
      setIsStoreUrlEdited(false)
      setIsUrlAvailable(null)
      setStoreUrlError('')
      setIsFormValid(false)
      setIsStoreCreated(false)
      setHasProducts(false)
      setLowStockProducts([])
      setCreatedStoreUrl('')
      setInitialStoreFormSnapshot('')
      setFormStoreId(null)
      setActiveStep('store-settings')
      return
    }

    const nextStoreName = latestStore.name ?? ''
    const nextStoreUrl = latestStore.url ?? ''
    setStoreName(nextStoreName)
    setStoreUrl(nextStoreUrl)
    setIsStoreUrlEdited(true)
    setIsStoreCreated(true)
    setIsUrlAvailable(true)
    setIsFormValid(true)
    setCreatedStoreUrl(latestStore.url ?? '')
    setFormStoreId(latestStore.id)
    setInitialStoreFormSnapshot(
      JSON.stringify({
        name: nextStoreName.trim(),
        url: nextStoreUrl.trim().toLowerCase(),
      }),
    )
    const resolvedStep = Number(latestStore.onboardingStep) || 1

    if (resolvedStep >= 3 || hasProducts) {
      setActiveStep('sell-online')
      return
    }

    if (resolvedStep >= 2) {
      setActiveStep('add-products')
      return
    }

    setActiveStep('store-settings')
  }, [currentStore, hasProducts])

  useEffect(() => {
    async function loadProducts() {
      if (!currentStore?.id) {
        setHasProducts(false)
        setLowStockProducts([])
        return
      }

      try {
        const products = await getProducts(currentStore.id)
        const nextHasProducts = products.length > 0
        const nextLowStockProducts = products.filter(
          (product) =>
            Number(product.quantity) <= Number(product.lowStockThreshold ?? 5),
        )
        setHasProducts(nextHasProducts)
        setLowStockProducts(nextLowStockProducts)

        nextLowStockProducts.forEach((product) => {
          const alertKey = `${currentStore.id}:${product.id}:${product.quantity}`

          if (!lowStockToastRef.current.has(alertKey)) {
            showToast(`Low stock alert for ${product.title}`, 'info')
            lowStockToastRef.current.add(alertKey)
          }
        })

        if (nextHasProducts && Number(currentStore.onboardingStep) < 3) {
          const nextStore = await updateStore(currentStore.id, { onboardingStep: 3 })
          setCurrentStore(nextStore)
        }
      } catch (error) {
        console.error(error)
        setHasProducts(false)
        setLowStockProducts([])
      }
    }

    loadProducts()
    const intervalId = window.setInterval(loadProducts, 15000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [currentStore, setCurrentStore, showToast])

  useEffect(() => {
    if (activeStep !== 'store-settings') {
      return
    }

    if (currentStore?.id && String(formStoreId) !== String(currentStore.id)) {
      return
    }

    if (!storeUrl.trim()) {
      setIsUrlAvailable(null)
      setStoreUrlError('')
      return
    }

    async function checkStoreAvailability() {
      try {
        const slug = (getStoreUrlSlug(storeUrl) || '').toLowerCase().trim()

        if (!slug) {
          setIsUrlAvailable(false)
          setStoreUrlError('Slug is required')
          return
        }

        if (
          currentStore?.id &&
          slug === (getStoreUrlSlug(currentStore.url ?? '') || '').toLowerCase().trim()
        ) {
          setIsUrlAvailable(true)
          setStoreUrlError('')
          return
        }

        const response = await checkStoreSlug(slug, currentStore?.id)
        setIsUrlAvailable(response.available)
        setStoreUrlError(response.available ? '' : 'Store Temporary URL already used')

        if (!response.available && lastTakenUrlToastRef.current !== slug) {
          showToast('Store Temporary URL already used', 'error')
          lastTakenUrlToastRef.current = slug
        }
        if (response.available && lastTakenUrlToastRef.current === slug) {
          lastTakenUrlToastRef.current = ''
        }
      } catch (error) {
        console.error(error)
        setIsUrlAvailable(false)
        setStoreUrlError('Unable to verify URL')
        showToast('Something went wrong, please try again', 'error')
      }
    }

    const debounceTimerId = window.setTimeout(checkStoreAvailability, 300)

    return () => {
      window.clearTimeout(debounceTimerId)
    }
  }, [activeStep, currentStore, formStoreId, showToast, storeUrl])

  useEffect(() => {
    setIsFormValid(
      storeName.trim() !== '' &&
        storeUrl.trim() !== '' &&
        isUrlAvailable === true,
    )
  }, [isUrlAvailable, storeName, storeUrl])

  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview)
      }
    }
  }, [logoPreview])

  function handleLogoChange(event) {
    const file = event.target.files?.[0]

    if (logoPreview) {
      URL.revokeObjectURL(logoPreview)
    }

    if (!file) {
      setLogoPreview('')
      return
    }

    setLogoPreview(URL.createObjectURL(file))
  }

  function handleStoreNameChange(event) {
    const nextStoreName = event.target.value
    setStoreName(nextStoreName)

    if (!isStoreUrlEdited) {
      const nextSlug = slugifyStoreName(nextStoreName)
      setStoreUrl(nextSlug ? `${nextSlug}.projectx.com` : '')
    }
  }

  function handleStoreUrlChange(event) {
    const nextSlug = slugifyStoreName(event.target.value)
    setIsStoreUrlEdited(true)
    setStoreUrl(nextSlug ? `${nextSlug}.projectx.com` : '')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const name = storeName.trim()
    const slug = getStoreUrlSlug(storeUrl).trim().toLowerCase()

    if (!name || !slug) {
      showToast('Please fill all required fields', 'error')
      return
    }

    if (!isFormValid || !currentUser?.id || !currentStore?.id || !hasStoreFormChanges) {
      return
    }

    try {
      setStoreUrlError('')
      const storePayload = {
        name,
        slug,
        subdomain: slug,
        url: `${slug}.projectx.com`,
        ownerEmail: currentUser.email ?? '',
        onboardingStep: 2,
      }
      const nextStore = await updateStore(currentStore.id, storePayload)

      setCurrentStore(nextStore)
      setIsStoreCreated(true)
      setHasProducts(false)
      showToast('Store updated successfully', 'success')
      setCreatedStoreUrl(nextStore.url)
      setInitialStoreFormSnapshot(
        JSON.stringify({
          name: nextStore.name.trim(),
          url: nextStore.url.trim().toLowerCase(),
        }),
      )
      setActiveStep('add-products')
    } catch (error) {
      console.error(error)
      const parsedError = (() => {
        try {
          return JSON.parse(error.message)
        } catch {
          return null
        }
      })()
      const message = parsedError?.message || error.message || 'Something went wrong, please try again'

      if (message === 'Store Temporary URL already used') {
        setIsUrlAvailable(false)
        setStoreUrlError(message)
      }

      showToast(message, 'error')
    }
  }

  async function updateOnboardingStep(nextStep) {
    if (!currentStore?.id) {
      return null
    }

    try {
      const nextStore = await updateStore(currentStore.id, { onboardingStep: nextStep })
      setCurrentStore(nextStore)
      return nextStore
    } catch (error) {
      console.error(error)
      showToast('Something went wrong, please try again', 'error')
      return null
    }
  }

  async function handleAddProductStep() {
    await updateOnboardingStep(3)
    navigate('/products/new')
  }

  async function handleSellOnlineStep() {
    if (!currentStore?.id) {
      return
    }

    try {
      const nextStore = await updateStore(currentStore.id, {
        onboardingStep: 4,
        isOnboardingCompleted: true,
      })
      setCurrentStore(nextStore)
      navigate('/dashboard')
    } catch (error) {
      console.error(error)
      showToast('Something went wrong, please try again', 'error')
    }
  }

  if (isHydratingStore) {
    return <p className="product-empty-state">Loading store...</p>
  }

  if (!currentStore?.id) {
    return (
      <div className="dashboard">
        <div className="dashboard-intro">
          <h2>No store selected</h2>
          <p>Select an existing store or create a new one to continue onboarding.</p>
        </div>
        <SurfaceCard className="form-card">
          <Button onClick={() => navigate('/stores')} variant="outline">
            View Stores
          </Button>
          <Button onClick={() => navigate('/onboarding/new')}>
            Create New Store
          </Button>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <>
      <div className="dashboard">
        <div className="dashboard-intro">
          <h2>Get ready to sell</h2>
          <p>Here&apos;s a guide to get started. As your business grows, you&apos;ll get fresh tips and insights here.</p>
        </div>

        <section className="setup-guide">
          <div className="setup-guide__heading">
            <h3>Setup guide</h3>
            <span className="setup-guide__status">
              {`${Number(isStoreCreated) + Number(hasProducts)}/4 Completed`}
            </span>
          </div>

          <div className="setup-guide__card">
            <div className="setup-guide__steps">
              <ul className="setup-list">
                {setupSteps.map((step, index) => {
                  const isStoreSettingsStep = index === 0
                  const isAddProductsStep = index === 1
                  const isCompleted =
                    (isStoreCreated && isStoreSettingsStep) ||
                    (hasProducts && isAddProductsStep)
                  const isActive =
                    (!isStoreCreated && isStoreSettingsStep) ||
                    (isStoreCreated && !hasProducts && isAddProductsStep)
                  const isClickable =
                    (isStoreCreated && isStoreSettingsStep) ||
                    (hasProducts && isAddProductsStep)

                  return (
                    <li
                      key={step}
                      className={`setup-list__item${isActive ? ' is-active' : ''}${isCompleted ? ' is-completed' : ''}${isClickable ? ' is-clickable' : ''}`}
                    >
                      <span className="setup-list__icon" aria-hidden="true">
                        {isCompleted ? '✓' : ''}
                      </span>
                      {isClickable ? (
                        <button
                          className="setup-step-button"
                          type="button"
                          onClick={() => {
                            if (isStoreSettingsStep) {
                              setActiveStep('store-settings')
                              return
                            }

                            if (isAddProductsStep) {
                              updateOnboardingStep(3)
                              navigate('/products')
                            }
                          }}
                        >
                          {step}
                        </button>
                      ) : (
                        <span>{step}</span>
                      )}
                      {isStoreSettingsStep && isClickable && createdStoreUrl ? (
                        <a
                          className="setup-step-link"
                          href={storeLink}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${storeLink}`}
                          title={storeLink}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M10 14 21 3m0 0h-7m7 0v7"
                              fill="none"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.75"
                            />
                            <path
                              d="M21 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                              fill="none"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.75"
                            />
                          </svg>
                        </a>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>

            <section className="right-panel">
              {isStoreCreated && activeStep !== 'store-settings' ? (
                <div className="setup-product-panel">
                  <div className="setup-product-card">
                    <h3>Add your first product</h3>
                    <p>
                      Write a description, add photos, and set pricing for the products you plan
                      to sell.
                    </p>
                    <Button
                      className="setup-product-card__button"
                      onClick={handleAddProductStep}
                    >
                      Add Product
                    </Button>
                    <div className="setup-product-card__import">
                      <span>Or import from</span>
                      <span className="setup-product-card__shopify" aria-label="Shopify">
                        S
                      </span>
                    </div>
                  </div>

                  <button
                    className="setup-product-digital"
                    type="button"
                    onClick={handleAddProductStep}
                  >
                    Add your first digital product
                  </button>
                  <button
                    className="setup-product-digital"
                    type="button"
                    onClick={handleSellOnlineStep}
                  >
                    Continue to sell online
                  </button>
                </div>
              ) : (
                <SurfaceCard as="form" className="form-card" onSubmit={handleSubmit}>
                  <div className="upload-field">
                    <label htmlFor="store-logo">Store Logo</label>
                    <label className="upload-box" htmlFor="store-logo">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Store logo preview" className="upload-preview" />
                      ) : (
                        <span>
                          <strong>Click to upload</strong> or drag and drop
                          <small>SVG, PNG, JPG or GIF (Max 200KB)</small>
                        </span>
                      )}
                    </label>
                    <input
                      id="store-logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      hidden
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="store-name">Store Name*</label>
                    <input
                      id="store-name"
                      type="text"
                      value={storeName}
                      onChange={handleStoreNameChange}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="store-url">Store Temporary URL*</label>
                    <div className="url-input-group">
                      <div className="url-display">
                        <input
                        id="store-url"
                          className="url-display__input"
                          type="text"
                          value={storeSlug}
                          onChange={handleStoreUrlChange}
                          placeholder="store"
                          aria-label="Store temporary URL"
                        />
                        <span className="url-display__suffix">.projectx.com</span>
                      </div>
                      {isUrlAvailable === true ? (
                        <span className="status-icon status-icon--success" aria-label="URL available">
                          ✓
                        </span>
                      ) : null}
                      {isUrlAvailable === false ? (
                        <span className="status-icon status-icon--error" aria-label="URL unavailable">
                          ✕
                        </span>
                      ) : null}
                    </div>
                    {isUrlAvailable === false ? (
                      <p className="error-text">{storeUrlError || 'This URL is not available'}</p>
                    ) : null}
                  </div>

                  <Button
                    className="dashboard-create-button"
                    disabled={!isFormValid || !hasStoreFormChanges}
                    fullWidth
                    type="submit"
                  >
                    Update Store
                  </Button>
                </SurfaceCard>
              )}
            </section>
          </div>
        </section>

        <section className="recent-orders-panel" aria-labelledby="recent-orders-heading">
          <div className="recent-orders-panel__header">
            <div>
              <h3 id="recent-orders-heading">Recent Orders</h3>
              <p>Latest orders received for this store.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/orders')}>
              View all
            </Button>
          </div>

          {recentOrders.length > 0 ? (
            <div className="recent-orders-list">
              {recentOrders.map((order) => (
                <button
                  className="recent-orders-list__item"
                  key={order.id}
                  type="button"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <span>
                    <strong>#{order.id}</strong>
                    <small>{order.customerName || 'Guest customer'}</small>
                  </span>
                  <span>
                    <strong>{formatCurrency(order.finalAmount ?? order.totalAmount)}</strong>
                    <small>{formatDate(order.createdAt)}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="recent-orders-panel__empty">No recent orders yet.</p>
          )}
        </section>

        <section className="low-stock-panel" aria-labelledby="low-stock-heading">
          <div className="low-stock-panel__header">
            <div>
              <h3 id="low-stock-heading">Low Stock Products</h3>
              <p>Products at or below their alert threshold.</p>
            </div>
            <span>{lowStockProducts.length}</span>
          </div>

          {lowStockProducts.length > 0 ? (
            <div className="low-stock-list">
              {lowStockProducts.map((product) => (
                <div className="low-stock-list__item" key={product.id}>
                  <strong>{product.title}</strong>
                  <span>{Number(product.quantity) || 0} remaining</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="low-stock-panel__empty">No low stock products right now.</p>
          )}
        </section>
      </div>
    </>
  )
}

export default Dashboard
