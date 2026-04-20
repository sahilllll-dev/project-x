import { useEffect, useMemo, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import ThemeRenderer from '../components/themes/ThemeRenderer.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { getActiveTheme, getProducts, saveThemeConfig } from '../utils/api.js'
import { DEFAULT_THEME_CONFIG, getThemeConfig } from '../utils/themeConfig.js'

function getSampleProducts(storeId) {
  return [
    {
      id: 'preview-product-1',
      storeId,
      title: 'Signature Product',
      price: 2499,
      discountedPrice: 1999,
      quantity: 12,
      image: '',
      seo: { slug: 'signature-product' },
      status: 'active',
    },
    {
      id: 'preview-product-2',
      storeId,
      title: 'Premium Collection',
      price: 3499,
      discountedPrice: 0,
      quantity: 8,
      image: '',
      seo: { slug: 'premium-collection' },
      status: 'active',
    },
    {
      id: 'preview-product-3',
      storeId,
      title: 'Everyday Essential',
      price: 999,
      discountedPrice: 799,
      quantity: 16,
      image: '',
      seo: { slug: 'everyday-essential' },
      status: 'active',
    },
  ]
}

function configsMatch(firstConfig, secondConfig) {
  return JSON.stringify(getThemeConfig(firstConfig)) === JSON.stringify(getThemeConfig(secondConfig))
}

function ThemeEditor() {
  const { currentStore, setCurrentStore } = useAppContext()
  const { showToast } = useToast()
  const [theme, setTheme] = useState(null)
  const [config, setConfig] = useState(DEFAULT_THEME_CONFIG)
  const [savedConfig, setSavedConfig] = useState(DEFAULT_THEME_CONFIG)
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState('desktop')
  const hasUnsavedChanges = !configsMatch(config, savedConfig)

  const previewProducts = useMemo(() => {
    return products.length > 0 ? products : getSampleProducts(currentStore?.id)
  }, [currentStore?.id, products])

  useEffect(() => {
    let isCancelled = false

    async function loadThemeEditor() {
      if (!currentStore?.id) {
        setTheme(null)
        setConfig(DEFAULT_THEME_CONFIG)
        setSavedConfig(DEFAULT_THEME_CONFIG)
        setProducts([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const [themeResponse, productResponse] = await Promise.all([
          getActiveTheme(currentStore.id),
          getProducts(currentStore.id),
        ])

        if (isCancelled) {
          return
        }

        const nextConfig = getThemeConfig(themeResponse.config)
        setTheme(themeResponse.theme)
        setConfig(nextConfig)
        setSavedConfig(nextConfig)
        setProducts(productResponse.filter((product) => product.status === 'active'))
      } catch (error) {
        console.error(error)
        showToast(error.message || 'Something went wrong', 'error')
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadThemeEditor()

    return () => {
      isCancelled = true
    }
  }, [currentStore?.id, showToast])

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return undefined
    }

    function warnBeforeUnload(event) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warnBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload)
    }
  }, [hasUnsavedChanges])

  function updateConfig(key, value) {
    setConfig((currentConfig) => ({
      ...currentConfig,
      [key]: value,
    }))
  }

  async function handleSave() {
    if (!currentStore?.id) {
      return
    }

    setIsSaving(true)

    try {
      const response = await saveThemeConfig(currentStore.id, config)
      const nextConfig = getThemeConfig(response.config)
      setConfig(nextConfig)
      setSavedConfig(nextConfig)
      if (response.store) {
        setCurrentStore(response.store)
      }
      showToast('Theme saved', 'success')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  function handleReset() {
    setConfig(DEFAULT_THEME_CONFIG)
  }

  if (!currentStore?.id) {
    return <p className="product-empty-state">Create a store first to customize a theme.</p>
  }

  if (isLoading) {
    return <p className="product-empty-state">Loading theme editor...</p>
  }

  return (
    <div className="theme-editor-page">
      <div className="theme-editor-page__header">
        <div>
          <h2>Theme Editor</h2>
          <p>{theme?.name ?? 'Current theme'} for {currentStore.name}</p>
        </div>
        {hasUnsavedChanges ? <span className="theme-editor-page__dirty">Unsaved changes</span> : null}
      </div>

      <div className="editor">
        <SurfaceCard className="controls">
          <div className="controls__header">
            <h3>Settings</h3>
            <Button type="button" variant="outline" onClick={handleReset}>
              Reset to default
            </Button>
          </div>

          <div className="product-form__field">
            <label htmlFor="theme-primary-color">Primary Color</label>
            <input
              id="theme-primary-color"
              type="color"
              value={config.primaryColor}
              onChange={(event) => updateConfig('primaryColor', event.target.value)}
            />
          </div>

          <div className="product-form__field">
            <label htmlFor="theme-font">Font</label>
            <select
              id="theme-font"
              value={config.font}
              onChange={(event) => updateConfig('font', event.target.value)}
            >
              <option value="Inter">Inter</option>
              <option value="Poppins">Poppins</option>
            </select>
          </div>

          <div className="product-form__field">
            <label htmlFor="theme-layout">Layout</label>
            <select
              id="theme-layout"
              value={config.layout}
              onChange={(event) => updateConfig('layout', event.target.value)}
            >
              <option value="grid">Grid</option>
              <option value="list">List</option>
            </select>
          </div>

          <div className="product-form__field">
            <label htmlFor="theme-hero-title">Hero Title</label>
            <input
              id="theme-hero-title"
              type="text"
              value={config.heroTitle}
              onChange={(event) => updateConfig('heroTitle', event.target.value)}
            />
          </div>

          <label className="theme-settings-toggle" htmlFor="theme-show-brands">
            <div>
              <strong>Show Brands</strong>
              <p>Display supported brand sections.</p>
            </div>
            <input
              id="theme-show-brands"
              type="checkbox"
              checked={Boolean(config.showBrands)}
              onChange={(event) => updateConfig('showBrands', event.target.checked)}
            />
          </label>

          <Button
            disabled={!hasUnsavedChanges || isSaving}
            fullWidth
            type="button"
            onClick={handleSave}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </SurfaceCard>

        <div className="preview">
          <div className="preview__toolbar">
            <span>Live preview</span>
            <div className="preview__modes" aria-label="Preview mode">
              <button
                className={previewMode === 'desktop' ? 'is-active' : ''}
                type="button"
                onClick={() => setPreviewMode('desktop')}
              >
                Desktop
              </button>
              <button
                className={previewMode === 'mobile' ? 'is-active' : ''}
                type="button"
                onClick={() => setPreviewMode('mobile')}
              >
                Mobile
              </button>
            </div>
          </div>

          <div className={`preview__canvas preview__canvas--${previewMode}`}>
            <ThemeRenderer
              themeCode={theme?.code ?? currentStore.themeId}
              config={config}
              store={currentStore}
              products={previewProducts}
              onBuyNow={() => {}}
              useSeoProductUrls={false}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThemeEditor
