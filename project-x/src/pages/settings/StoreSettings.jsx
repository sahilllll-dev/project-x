import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import SurfaceCard from '../../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../../context/AppContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { getStoreById, updateStoreSettings } from '../../utils/api.js'
import { setDocumentFavicon } from '../../utils/favicon.js'
import StoreAppsSettings from './StoreAppsSettings.jsx'

const settingsNavItems = [
  {
    id: 'general',
    label: 'General',
    description: 'Business details and store defaults',
    to: '/admin/settings',
  },
  {
    id: 'branding',
    label: 'Branding',
    description: 'Logo, favicon, and brand colors',
    to: '/admin/settings/branding',
  },
  {
    id: 'apps',
    label: 'Apps',
    description: 'Install apps and manage app settings',
    to: '/admin/settings/apps',
  },
]

const currencyOptions = [
  { value: 'INR', label: 'Indian Rupee (INR)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'AUD', label: 'Australian Dollar (AUD)' },
  { value: 'CAD', label: 'Canadian Dollar (CAD)' },
  { value: 'SGD', label: 'Singapore Dollar (SGD)' },
]

const timezoneOptions = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'Europe/Paris', label: 'Europe/Paris' },
  { value: 'America/New_York', label: 'America/New_York' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney' },
]

const emptyForm = {
  name: '',
  description: '',
  email: '',
  phone: '',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
}

function getStoreForm(store) {
  return {
    name: store?.name ?? '',
    description: store?.description ?? '',
    email: store?.email ?? '',
    phone: store?.phone ?? '',
    currency: store?.currency ?? 'INR',
    timezone: store?.timezone ?? 'Asia/Kolkata',
    logoUrl: store?.logoUrl ?? store?.logo_url ?? '',
    faviconUrl: store?.faviconUrl ?? store?.favicon_url ?? '',
    primaryColor: store?.primaryColor ?? store?.primary_color ?? '#000000',
    secondaryColor: store?.secondaryColor ?? store?.secondary_color ?? '#ffffff',
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Failed to read image'))
    reader.readAsDataURL(file)
  })
}

function StoreSettingsSkeleton() {
  return (
    <div className="store-settings-skeleton" aria-label="Loading store settings">
      {Array.from({ length: 7 }).map((_, index) => (
        <span className="store-settings-skeleton__row" key={index} />
      ))}
    </div>
  )
}

function StoreSettings() {
  const {
    currentStore,
    isStoreReady,
    setCurrentStore,
    setStores,
  } = useAppContext()
  const { showToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const currentStoreId = currentStore?.id ?? ''
  const hasStore = Boolean(currentStoreId)
  const activeTab = useMemo(() => {
    if (location.pathname.endsWith('/apps')) {
      return 'apps'
    }

    if (location.pathname.endsWith('/branding')) {
      return 'branding'
    }

    return 'general'
  }, [location.pathname])
  const isGeneralTab = activeTab === 'general'
  const isBrandingTab = activeTab === 'branding'
  const isAppsTab = activeTab === 'apps'
  const canSave = hasStore && !isLoading && !isSaving && !isAppsTab
  const selectedCurrency = useMemo(
    () =>
      currencyOptions.some((option) => option.value === form.currency)
        ? form.currency
        : 'INR',
    [form.currency],
  )
  const selectedTimezone = useMemo(
    () =>
      timezoneOptions.some((option) => option.value === form.timezone)
        ? form.timezone
        : 'Asia/Kolkata',
    [form.timezone],
  )
  const activeSettingsItem =
    settingsNavItems.find((item) => item.id === activeTab) ?? settingsNavItems[0]

  useEffect(() => {
    let isCancelled = false

    async function loadStoreSettings() {
      if (!isStoreReady) {
        return
      }

      if (!currentStoreId) {
        setForm(emptyForm)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const store = await getStoreById(currentStoreId)

        if (isCancelled) {
          return
        }

        setForm(getStoreForm(store))
      } catch (loadError) {
        console.error(loadError)

        if (!isCancelled) {
          setForm(emptyForm)
          showToast(loadError.message || 'Failed to load store settings', 'error')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadStoreSettings()

    return () => {
      isCancelled = true
    }
  }, [currentStoreId, isStoreReady, showToast])

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
    setError('')
  }

  async function handleImageChange(event, field) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      showToast('Select an image file', 'error')
      return
    }

    try {
      updateField(field, await readFileAsDataUrl(file))
    } catch (imageError) {
      console.error(imageError)
      showToast(imageError.message || 'Failed to read image', 'error')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!currentStoreId || isSaving) {
      return
    }

    const name = form.name.trim()

    if (!name) {
      setError('Store name is required')
      showToast('Store name is required', 'error')
      navigate('/admin/settings')
      return
    }

    setIsSaving(true)

    try {
      const updatedStore = await updateStoreSettings(currentStoreId, {
        name,
        description: form.description,
        email: form.email,
        phone: form.phone,
        currency: selectedCurrency,
        timezone: selectedTimezone,
        logo_url: form.logoUrl,
        favicon_url: form.faviconUrl,
        primary_color: form.primaryColor,
        secondary_color: form.secondaryColor,
      })

      setCurrentStore(updatedStore)
      setStores((currentStores) =>
        currentStores.map((store) =>
          store.id === updatedStore.id ? updatedStore : store,
        ),
      )
      setForm(getStoreForm(updatedStore))
      setDocumentFavicon(updatedStore.faviconUrl)
      showToast('Store settings saved', 'success')
    } catch (saveError) {
      console.error(saveError)
      showToast(saveError.message || 'Failed to save store settings', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (!hasStore && isStoreReady) {
    return (
      <div className="store-settings-page">
        <p className="product-empty-state">Create a store first to manage settings.</p>
      </div>
    )
  }

  return (
    <div className="store-settings-page">
      <div className="store-settings-page__header">
        <div>
          <h2>Store Settings</h2>
          <p>Manage store details, brand assets, and regional defaults.</p>
        </div>
      </div>

      <form className="store-settings-layout" onSubmit={handleSubmit}>
        <SurfaceCard as="aside" className="store-settings-sidebar">
          <nav className="store-settings-sidebar__nav" aria-label="Settings sections">
            {settingsNavItems.map((item) => (
              <button
                className={`store-settings-sidebar__item${
                  activeTab === item.id ? ' store-settings-sidebar__item--active' : ''
                }`}
                key={item.id}
                type="button"
                aria-current={activeTab === item.id ? 'page' : undefined}
                onClick={() => navigate(item.to)}
              >
                <span>{item.label}</span>
                <small>{item.description}</small>
              </button>
            ))}
          </nav>
        </SurfaceCard>

        <div className="store-settings-main">
          <div className="store-settings-main__heading">
            <div>
              <h3>{activeSettingsItem.label}</h3>
              <p>{activeSettingsItem.description}</p>
            </div>
            {!isAppsTab ? (
              <Button disabled={!canSave} type="submit">
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            ) : null}
          </div>

          {isLoading || !isStoreReady ? (
            <SurfaceCard className="store-settings-panel">
              <StoreSettingsSkeleton />
            </SurfaceCard>
          ) : (
            <>
              {isGeneralTab ? (
                <div className="store-settings-stack" role="tabpanel">
                  <SurfaceCard className="store-settings-panel">
                    <div className="store-settings-panel__header">
                      <h4>Business Details</h4>
                      <p>Used across your storefront, admin, and apps.</p>
                    </div>
                    <div className="store-settings-grid">
                      <label className="store-settings-field" htmlFor="store-settings-name">
                        <span>Store Name</span>
                        <input
                          id="store-settings-name"
                          type="text"
                          value={form.name}
                          onChange={(event) => updateField('name', event.target.value)}
                        />
                        {error ? <small className="store-settings-field__error">{error}</small> : null}
                      </label>

                      <label className="store-settings-field store-settings-field--full" htmlFor="store-settings-description">
                        <span>Description</span>
                        <textarea
                          id="store-settings-description"
                          rows="4"
                          value={form.description}
                          onChange={(event) => updateField('description', event.target.value)}
                        />
                      </label>
                    </div>
                  </SurfaceCard>

                  <SurfaceCard className="store-settings-panel">
                    <div className="store-settings-panel__header">
                      <h4>Store Contact Details</h4>
                      <p>Customers can use these details to contact your store.</p>
                    </div>
                    <div className="store-settings-grid">
                      <label className="store-settings-field" htmlFor="store-settings-email">
                        <span>Email</span>
                        <input
                          id="store-settings-email"
                          type="email"
                          value={form.email}
                          onChange={(event) => updateField('email', event.target.value)}
                        />
                      </label>

                      <label className="store-settings-field" htmlFor="store-settings-phone">
                        <span>Phone</span>
                        <input
                          id="store-settings-phone"
                          type="tel"
                          value={form.phone}
                          onChange={(event) => updateField('phone', event.target.value)}
                        />
                      </label>
                    </div>
                  </SurfaceCard>

                  <SurfaceCard className="store-settings-panel">
                    <div className="store-settings-panel__header">
                      <h4>Store Defaults</h4>
                      <p>Controls currency formatting and reporting time zones.</p>
                    </div>
                    <div className="store-settings-grid">
                      <label className="store-settings-field" htmlFor="store-settings-currency">
                        <span>Currency</span>
                        <select
                          id="store-settings-currency"
                          value={selectedCurrency}
                          onChange={(event) => updateField('currency', event.target.value)}
                        >
                          {currencyOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="store-settings-field" htmlFor="store-settings-timezone">
                        <span>Timezone</span>
                        <select
                          id="store-settings-timezone"
                          value={selectedTimezone}
                          onChange={(event) => updateField('timezone', event.target.value)}
                        >
                          {timezoneOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </SurfaceCard>
                </div>
              ) : null}

              {isBrandingTab ? (
                <div className="store-settings-stack" role="tabpanel">
                  <SurfaceCard className="store-settings-panel">
                    <div className="store-settings-panel__header">
                      <h4>Brand Assets</h4>
                      <p>Upload the images used for your store identity.</p>
                    </div>
                    <div className="store-settings-branding">
                      <label className="store-settings-upload" htmlFor="store-settings-logo">
                        <span>Logo</span>
                        <strong>
                          {form.logoUrl ? (
                            <img src={form.logoUrl} alt="" />
                          ) : (
                            <span className="store-settings-upload__empty">Upload logo</span>
                          )}
                        </strong>
                        <input
                          id="store-settings-logo"
                          type="file"
                          accept="image/*"
                          onChange={(event) => handleImageChange(event, 'logoUrl')}
                        />
                      </label>

                      <label className="store-settings-upload store-settings-upload--favicon" htmlFor="store-settings-favicon">
                        <span>Favicon</span>
                        <strong>
                          {form.faviconUrl ? (
                            <img src={form.faviconUrl} alt="" />
                          ) : (
                            <span className="store-settings-upload__empty">Upload favicon</span>
                          )}
                        </strong>
                        <input
                          id="store-settings-favicon"
                          type="file"
                          accept="image/*"
                          onChange={(event) => handleImageChange(event, 'faviconUrl')}
                        />
                      </label>
                    </div>
                  </SurfaceCard>

                  <SurfaceCard className="store-settings-panel">
                    <div className="store-settings-panel__header">
                      <h4>Brand Colors</h4>
                      <p>Set the primary colors used by your storefront theme.</p>
                    </div>
                    <div className="store-settings-branding">
                      <label className="store-settings-color" htmlFor="store-settings-primary-color">
                        <span>Primary Color</span>
                        <input
                          id="store-settings-primary-color"
                          type="color"
                          value={form.primaryColor}
                          onChange={(event) => updateField('primaryColor', event.target.value)}
                        />
                        <strong>{form.primaryColor}</strong>
                      </label>

                      <label className="store-settings-color" htmlFor="store-settings-secondary-color">
                        <span>Secondary Color</span>
                        <input
                          id="store-settings-secondary-color"
                          type="color"
                          value={form.secondaryColor}
                          onChange={(event) => updateField('secondaryColor', event.target.value)}
                        />
                        <strong>{form.secondaryColor}</strong>
                      </label>
                    </div>
                  </SurfaceCard>
                </div>
              ) : null}

              {isAppsTab ? <StoreAppsSettings /> : null}
            </>
          )}
        </div>
      </form>
    </div>
  )
}

export default StoreSettings
