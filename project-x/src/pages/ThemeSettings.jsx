import { useEffect, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { updateStoreThemeConfig } from '../utils/api.js'
import { getThemeConfig } from '../utils/themeConfig.js'

function ThemeSettings() {
  const { currentStore, setCurrentStore } = useAppContext()
  const { showToast } = useToast()
  const [formData, setFormData] = useState(getThemeConfig(currentStore?.themeConfig))
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setFormData(getThemeConfig(currentStore?.themeConfig))
  }, [currentStore?.themeConfig])

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    setFormData((currentData) => ({
      ...currentData,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!currentStore?.id) {
      return
    }

    setIsSaving(true)

    try {
      const nextStore = await updateStoreThemeConfig(currentStore.id, formData)
      setCurrentStore(nextStore)
      showToast('Theme applied successfully', 'success')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (!currentStore) {
    return <p className="product-empty-state">Create a store first to configure a theme.</p>
  }

  return (
    <div className="theme-settings-page">
      <div className="theme-settings-page__header">
        <p>Customize shared theme options for your storefront.</p>
      </div>

      <SurfaceCard as="form" className="theme-settings-form" onSubmit={handleSubmit}>
        <div className="product-form__field">
          <label htmlFor="heroTitle">Hero Title</label>
          <input
            id="heroTitle"
            name="heroTitle"
            type="text"
            value={formData.heroTitle}
            onChange={handleChange}
            placeholder="Welcome to your store"
          />
        </div>

        <label className="theme-settings-toggle" htmlFor="showBrands">
          <div>
            <strong>Show Brands</strong>
            <p>Display the brand strip on supported themes.</p>
          </div>
          <input
            id="showBrands"
            name="showBrands"
            type="checkbox"
            checked={formData.showBrands}
            onChange={handleChange}
          />
        </label>

        <div className="product-form__field">
          <label htmlFor="primaryColor">Primary Color</label>
          <div className="theme-settings-color">
            <input
              id="primaryColor"
              name="primaryColor"
              type="color"
              value={formData.primaryColor}
              onChange={handleChange}
            />
            <input
              name="primaryColor"
              type="text"
              value={formData.primaryColor}
              onChange={handleChange}
              placeholder="#111111"
            />
          </div>
        </div>

        <Button disabled={isSaving} type="submit" variant="primary">
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </SurfaceCard>
    </div>
  )
}

export default ThemeSettings
