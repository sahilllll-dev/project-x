import { useEffect, useMemo, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import SurfaceCard from '../../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../../context/AppContext.jsx'
import {
  getApps,
  getOrders,
  getProducts,
  getStoreAppConfig,
  saveWhatsAppApp,
  updateStoreAppConfig,
} from '../../utils/api.js'
import { useToast } from '../../context/ToastContext.jsx'
import {
  getWhatsAppPhoneError,
  normalizeWhatsAppPhone,
} from '../../utils/whatsapp.js'

const DEFAULT_WHATSAPP_MESSAGE = 'Hi! I have a question about your products.'

function getAppIconLabel(app) {
  return String(app?.name ?? app?.slug ?? 'App')
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function getWhatsAppSettings(config, isEnabled) {
  return {
    phone: String(config?.phone ?? ''),
    message: String(config?.message ?? DEFAULT_WHATSAPP_MESSAGE),
    position: String(config?.position ?? '').toLowerCase() === 'left' ? 'left' : 'right',
    isEnabled,
  }
}

function SeoHelperUi({ currentStore, products }) {
  const activeProducts = products.filter((product) => product.status === 'active').length
  const productsWithImages = products.filter((product) => Boolean(product.imageUrl)).length
  const score = Math.min(
    100,
    55 +
      (currentStore?.description ? 15 : 0) +
      (activeProducts > 0 ? 15 : 0) +
      (productsWithImages > 0 ? 15 : 0),
  )

  return (
    <div className="app-usage-grid">
      <SurfaceCard className="app-usage-panel app-usage-metric">
        <span>SEO Score</span>
        <strong>{score}</strong>
        <p>{currentStore?.name || 'Store'} search readiness</p>
      </SurfaceCard>
      <SurfaceCard className="app-usage-panel">
        <h3>Store Metadata</h3>
        <div className="app-usage-checklist">
          <span className={currentStore?.description ? 'is-complete' : ''}>
            Store description
          </span>
          <span className={activeProducts > 0 ? 'is-complete' : ''}>Active products</span>
          <span className={productsWithImages > 0 ? 'is-complete' : ''}>Product images</span>
        </div>
      </SurfaceCard>
      <SurfaceCard className="app-usage-panel">
        <h3>Product Coverage</h3>
        <div className="app-usage-stats">
          <span>
            <strong>{products.length}</strong>
            Products
          </span>
          <span>
            <strong>{activeProducts}</strong>
            Active
          </span>
          <span>
            <strong>{productsWithImages}</strong>
            With images
          </span>
        </div>
      </SurfaceCard>
    </div>
  )
}

function AnalyticsUi({ orders, products }) {
  const revenue = orders.reduce(
    (total, order) => total + Number(order.finalAmount ?? order.totalAmount ?? 0),
    0,
  )
  const paidOrders = orders.filter((order) => order.paymentStatus === 'paid').length

  return (
    <div className="app-usage-grid app-usage-grid--metrics">
      <SurfaceCard className="app-usage-panel app-usage-metric">
        <span>Revenue</span>
        <strong>{formatCurrency(revenue)}</strong>
        <p>All tracked orders</p>
      </SurfaceCard>
      <SurfaceCard className="app-usage-panel app-usage-metric">
        <span>Orders</span>
        <strong>{orders.length}</strong>
        <p>{paidOrders} paid</p>
      </SurfaceCard>
      <SurfaceCard className="app-usage-panel app-usage-metric">
        <span>Catalog</span>
        <strong>{products.length}</strong>
        <p>Products tracked</p>
      </SurfaceCard>
    </div>
  )
}

function ProductLabelsUi() {
  const labels = ['New arrival', 'Bestseller', 'Limited stock', 'Sale']

  return (
    <SurfaceCard className="app-usage-panel">
      <h3>Label Presets</h3>
      <div className="app-label-preview-grid">
        {labels.map((label) => (
          <span className="app-label-preview" key={label}>
            {label}
          </span>
        ))}
      </div>
    </SurfaceCard>
  )
}

function CustomScriptsUi({ config, isSaving, onSave }) {
  const [scriptText, setScriptText] = useState(config.script ?? '')

  return (
    <SurfaceCard className="app-usage-panel">
      <div className="app-usage-panel__heading">
        <h3>Script Console</h3>
        <Button
          disabled={isSaving}
          onClick={() => onSave({ ...config, script: scriptText })}
          size="sm"
        >
          {isSaving ? 'Saving...' : 'Save Script'}
        </Button>
      </div>
      <textarea
        className="app-script-editor"
        rows="12"
        value={scriptText}
        onChange={(event) => setScriptText(event.target.value)}
        spellCheck="false"
      />
    </SurfaceCard>
  )
}

function WhatsAppChatUi({ config, isEnabled, isInstalled, isSaving, onSave }) {
  const [form, setForm] = useState(() => getWhatsAppSettings(config, isEnabled))
  const normalizedPhone = normalizeWhatsAppPhone(form.phone)
  const phoneError = form.isEnabled ? getWhatsAppPhoneError(form.phone) : ''
  const canSave = !isSaving && (!form.isEnabled || !phoneError)

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  return (
    <div className="app-usage-grid">
      <SurfaceCard className="app-usage-panel">
        <div className="app-usage-panel__heading">
          <div>
            <h3>Widget Settings</h3>
            <p className="app-usage-muted">
              Show a floating WhatsApp button on every storefront page.
            </p>
          </div>
          <Button
            disabled={!canSave}
            onClick={() => onSave(form)}
            size="sm"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <div className="store-settings-grid">
          <label className="store-settings-field store-settings-field--full" htmlFor="whatsapp-phone">
            Phone Number
            <input
              id="whatsapp-phone"
              type="text"
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              placeholder="919876543210"
            />
            {phoneError ? <span className="store-settings-field__error">{phoneError}</span> : null}
          </label>

          <label className="store-settings-field" htmlFor="whatsapp-position">
            Position
            <select
              id="whatsapp-position"
              value={form.position}
              onChange={(event) => updateField('position', event.target.value)}
            >
              <option value="right">Bottom right</option>
              <option value="left">Bottom left</option>
            </select>
          </label>

          <div className="whatsapp-app-toggle">
            <div>
              <strong>{form.isEnabled ? 'Enabled' : 'Disabled'}</strong>
              <p>{isInstalled ? 'Installed for this store' : 'Will install on first save'}</p>
            </div>
            <button
              className={`app-toggle${form.isEnabled ? ' app-toggle--enabled' : ''}`}
              type="button"
              onClick={() => updateField('isEnabled', !form.isEnabled)}
              aria-label={`${form.isEnabled ? 'Disable' : 'Enable'} WhatsApp Chat`}
            >
              <span />
            </button>
          </div>

          <label
            className="store-settings-field store-settings-field--full"
            htmlFor="whatsapp-message"
          >
            Welcome Message
            <textarea
              id="whatsapp-message"
              rows="5"
              value={form.message}
              onChange={(event) => updateField('message', event.target.value)}
              placeholder={DEFAULT_WHATSAPP_MESSAGE}
            />
          </label>
        </div>

        <p className="app-usage-muted">
          Use a full phone number with country code. Example: 919876543210
        </p>
      </SurfaceCard>

      <SurfaceCard className="app-usage-panel whatsapp-app-preview">
        <div className="app-usage-panel__heading">
          <div>
            <h3>Storefront Preview</h3>
            <p className="app-usage-muted">This is how the floating button will appear.</p>
          </div>
          <span className={`whatsapp-app-status${form.isEnabled ? ' whatsapp-app-status--enabled' : ''}`}>
            {form.isEnabled ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="whatsapp-app-preview__canvas">
          <div
            className={`whatsapp-app-preview__button whatsapp-app-preview__button--${form.position}`}
          >
            <span className="whatsapp-app-preview__icon" aria-hidden="true">
              <MessageCircle size={18} strokeWidth={2.4} />
            </span>
            <span>WhatsApp us</span>
          </div>
        </div>

        <div className="app-usage-stats">
          <span>
            <strong>{normalizedPhone || '--'}</strong>
            Destination
          </span>
          <span>
            <strong>{form.position === 'left' ? 'Left' : 'Right'}</strong>
            Placement
          </span>
        </div>
      </SurfaceCard>
    </div>
  )
}

function AppUsage() {
  const { appSlug } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { currentStore, storeApps, refreshStoreApps, isAppEnabled } = useAppContext()
  const [apps, setApps] = useState([])
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [config, setConfig] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const currentStoreId = currentStore?.id ?? ''

  useEffect(() => {
    let isCancelled = false

    async function loadAppUsage() {
      setIsLoading(true)

      try {
        const [nextApps, nextProducts, nextOrders] = await Promise.all([
          getApps(),
          currentStoreId ? getProducts(currentStoreId) : Promise.resolve([]),
          currentStoreId ? getOrders(currentStoreId) : Promise.resolve([]),
          currentStoreId ? refreshStoreApps() : Promise.resolve([]),
        ])

        if (isCancelled) {
          return
        }

        setApps(nextApps)
        setProducts(nextProducts)
        setOrders(nextOrders)

        if (currentStoreId && appSlug) {
          const appConfig = await getStoreAppConfig(currentStoreId, appSlug)

          if (!isCancelled) {
            setConfig(appConfig.config ?? {})
          }
        }
      } catch (error) {
        console.error(error)

        if (!isCancelled) {
          showToast(error.message || 'Failed to load app', 'error')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadAppUsage()

    return () => {
      isCancelled = true
    }
  }, [appSlug, currentStoreId, refreshStoreApps, showToast])

  const installedApp = useMemo(
    () => storeApps.find((storeApp) => storeApp.appId === appSlug),
    [appSlug, storeApps],
  )
  const appDetails = installedApp?.app ?? apps.find((app) => app.slug === appSlug)
  const isInstalled = Boolean(installedApp)
  const isEnabled = isAppEnabled(appSlug)
  const supportsDirectSettings = appSlug === 'whatsapp-chat'

  async function handleSaveConfig(nextConfig) {
    if (!currentStoreId || !appSlug) {
      return
    }

    setIsSaving(true)

    try {
      const savedConfig = await updateStoreAppConfig(currentStoreId, appSlug, nextConfig)
      setConfig(savedConfig.config ?? {})
      showToast('App saved', 'success')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Failed to save app', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveWhatsApp(nextSettings) {
    if (!currentStoreId) {
      return
    }

    if (nextSettings.isEnabled) {
      const phoneError = getWhatsAppPhoneError(nextSettings.phone)

      if (phoneError) {
        showToast(phoneError, 'error')
        return
      }
    }

    setIsSaving(true)

    try {
      const savedSettings = await saveWhatsAppApp(currentStoreId, {
        phone: normalizeWhatsAppPhone(nextSettings.phone),
        message: nextSettings.message,
        position: nextSettings.position,
        is_enabled: nextSettings.isEnabled,
      })
      setConfig(savedSettings.config ?? {})
      await refreshStoreApps()
      showToast('WhatsApp chat saved', 'success')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Failed to save WhatsApp chat', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  function renderAppUi() {
    if (appSlug === 'seo-helper') {
      return <SeoHelperUi currentStore={currentStore} products={products} />
    }

    if (appSlug === 'analytics') {
      return <AnalyticsUi orders={orders} products={products} />
    }

    if (appSlug === 'product-labels') {
      return <ProductLabelsUi />
    }

    if (appSlug === 'custom-scripts') {
      return (
        <CustomScriptsUi
          config={config}
          isSaving={isSaving}
          key={config.script ?? ''}
          onSave={handleSaveConfig}
        />
      )
    }

    if (appSlug === 'whatsapp-chat') {
      return (
        <WhatsAppChatUi
          config={config}
          isEnabled={isEnabled}
          isInstalled={isInstalled}
          isSaving={isSaving}
          key={JSON.stringify([config?.phone ?? '', config?.message ?? '', config?.position ?? '', isEnabled])}
          onSave={handleSaveWhatsApp}
        />
      )
    }

    return (
      <SurfaceCard className="app-usage-panel">
        <h3>{appDetails?.name ?? 'App'}</h3>
        <p className="app-usage-muted">This app is ready for a custom admin surface.</p>
      </SurfaceCard>
    )
  }

  if (!currentStoreId) {
    return <p className="product-empty-state">Create a store first to use apps.</p>
  }

  return (
    <div className="app-usage-page">
      <div className="app-usage-header">
        <div className={`app-card__icon app-card__icon--${appDetails?.icon ?? ''}`}>
          {getAppIconLabel(appDetails)}
        </div>
        <div>
          <h2>{appDetails?.name ?? appSlug}</h2>
          <p>{appDetails?.description ?? 'Installed app'}</p>
        </div>
        <Button
          className="app-usage-header__settings"
          onClick={() => navigate('/admin/settings/apps')}
          variant="outline"
        >
          App Settings
        </Button>
      </div>

      {isLoading ? (
        <SurfaceCard className="store-settings-panel">
          <div className="store-settings-skeleton" aria-label="Loading app">
            <span className="store-settings-skeleton__row" />
            <span className="store-settings-skeleton__row" />
          </div>
        </SurfaceCard>
      ) : null}

      {!isLoading && !supportsDirectSettings && !isInstalled ? (
        <SurfaceCard className="app-usage-panel">
          <h3>App Not Installed</h3>
          <p className="app-usage-muted">
            Install this app from app management before opening its workspace.
          </p>
          <Button onClick={() => navigate('/admin/settings/apps')}>Open App Management</Button>
        </SurfaceCard>
      ) : null}

      {!isLoading && !supportsDirectSettings && isInstalled && !isEnabled ? (
        <SurfaceCard className="app-usage-panel">
          <h3>App Disabled</h3>
          <p className="app-usage-muted">
            Enable this app in app management to use its workspace.
          </p>
          <Button onClick={() => navigate('/admin/settings/apps')}>Open App Management</Button>
        </SurfaceCard>
      ) : null}

      {!isLoading && (supportsDirectSettings || (isInstalled && isEnabled)) ? renderAppUi() : null}
    </div>
  )
}

export default AppUsage
