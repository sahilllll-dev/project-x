import { useEffect, useState } from 'react'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import Button from '../components/ui/Button.jsx'
import { getThemes, updateStoreTheme } from '../utils/api.js'

const BUILT_IN_THEMES = [
  {
    id: 'minimal',
    name: 'Minimal Store',
    description: 'Clean and simple layout',
  },
  {
    id: 'modern',
    name: 'Modern Store',
    description: 'Bold and product-focused layout',
  },
  {
    id: 'kalles',
    name: 'Kalles Style',
    description: 'Modern fashion eCommerce layout with hero banners and product grid',
  },
]

function mergeThemes(apiThemes = []) {
  const themeMap = new Map(BUILT_IN_THEMES.map((theme) => [theme.id, theme]))

  apiThemes.forEach((theme) => {
    themeMap.set(theme.id, {
      ...themeMap.get(theme.id),
      ...theme,
    })
  })

  return Array.from(themeMap.values())
}

function Themes() {
  const { currentStore, setCurrentStore } = useAppContext()
  const { showToast } = useToast()
  const [themes, setThemes] = useState(BUILT_IN_THEMES)
  const [isLoading, setIsLoading] = useState(true)
  const [applyingThemeId, setApplyingThemeId] = useState('')

  useEffect(() => {
    async function loadThemes() {
      try {
        const response = await getThemes()
        setThemes(mergeThemes(response))
      } catch (error) {
        console.error(error)
        setThemes(BUILT_IN_THEMES)
      } finally {
        setIsLoading(false)
      }
    }

    loadThemes()
  }, [])

  async function handleApplyTheme(themeId) {
    if (!currentStore?.id) {
      return
    }

    setApplyingThemeId(themeId)

    try {
      const nextStore = await updateStoreTheme(currentStore.id, themeId)
      setCurrentStore(nextStore)
      showToast('Theme applied successfully', 'success')
    } catch (error) {
      console.error(error)
      showToast('Something went wrong, please try again', 'error')
    } finally {
      setApplyingThemeId('')
    }
  }

  return (
    <div className="themes-page">
      {!currentStore ? (
        <p className="product-empty-state">Create a store first to apply a theme.</p>
      ) : isLoading ? (
        <p className="product-empty-state">Loading themes...</p>
      ) : (
        <div className="themes-grid">
          {themes.map((theme) => {
            const isActive = currentStore.themeId === theme.id

            return (
              <article className="theme-card" key={theme.id}>
                <div className={`theme-card__preview theme-card__preview--${theme.id}`}>
                  Theme Preview
                </div>
                <div className="theme-card__content">
                  <h3>{theme.name}</h3>
                  <p>{theme.description}</p>
                  <Button
                    className={isActive ? 'theme-card__button--active' : ''}
                    disabled={applyingThemeId === theme.id}
                    fullWidth
                    variant="primary"
                    onClick={() => handleApplyTheme(theme.id)}
                  >
                    {applyingThemeId === theme.id
                      ? 'Applying...'
                      : isActive
                        ? 'Applied'
                        : 'Apply Theme'}
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Themes
