import { useEffect, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { getApps, installStoreApp, toggleStoreApp } from '../utils/api.js'

function getAppIconLabel(app) {
  return app.name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function Apps() {
  const { currentStore, storeApps, setStoreApps, refreshStoreApps, isAppEnabled } =
    useAppContext()
  const { showToast } = useToast()
  const [apps, setApps] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [pendingAppId, setPendingAppId] = useState('')

  useEffect(() => {
    async function loadApps() {
      try {
        setApps(await getApps())
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    loadApps()
  }, [])

  const installedAppIds = new Set(storeApps.map((storeApp) => storeApp.appId))
  const installedApps = storeApps
    .map((storeApp) => ({
      ...storeApp,
      app: storeApp.app ?? apps.find((app) => app.id === storeApp.appId) ?? null,
    }))
    .filter((storeApp) => storeApp.app)

  async function handleInstall(appId) {
    if (!currentStore?.id) {
      return
    }

    setPendingAppId(appId)

    try {
      const installedApp = await installStoreApp(currentStore.id, appId)
      setStoreApps([
        ...storeApps.filter((storeApp) => storeApp.appId !== appId),
        installedApp,
      ])
      showToast('App installed successfully', 'success')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setPendingAppId('')
    }
  }

  async function handleToggle(appId, enabled) {
    if (!currentStore?.id) {
      return
    }

    setPendingAppId(appId)

    try {
      const updatedStoreApp = await toggleStoreApp(currentStore.id, appId, enabled)
      setStoreApps(
        storeApps.map((storeApp) =>
          storeApp.appId === appId ? { ...storeApp, ...updatedStoreApp } : storeApp,
        ),
      )
      showToast(enabled ? 'App enabled' : 'App disabled', 'success')
    } catch (error) {
      console.error(error)
      refreshStoreApps()
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setPendingAppId('')
    }
  }

  if (!currentStore?.id) {
    return (
      <div className="apps-page">
        <SurfaceCard className="apps-empty-card">
          <h3>Create a store to install apps</h3>
          <p>Apps are installed per store, so select or create a store first.</p>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <div className="apps-page">
      <section className="apps-section">
        <div className="apps-section__heading">
          <h3>App Store</h3>
          <p>Add tools that extend your store functionality.</p>
        </div>

        {isLoading ? (
          <p className="product-empty-state">Loading apps...</p>
        ) : (
          <div className="apps-grid">
            {apps.map((app) => {
              const isInstalled = installedAppIds.has(app.id)

              return (
                <SurfaceCard className="app-card" key={app.id}>
                  <div className={`app-card__icon app-card__icon--${app.icon}`}>
                    {getAppIconLabel(app)}
                  </div>
                  <div className="app-card__content">
                    <h4>{app.name}</h4>
                    <p>{app.description}</p>
                  </div>
                  <Button
                    disabled={isInstalled || pendingAppId === app.id}
                    variant={isInstalled ? 'outline' : 'primary'}
                    onClick={() => handleInstall(app.id)}
                  >
                    {isInstalled ? 'Installed' : pendingAppId === app.id ? 'Adding...' : 'Add App'}
                  </Button>
                </SurfaceCard>
              )
            })}
          </div>
        )}
      </section>

      <section className="apps-section">
        <div className="apps-section__heading">
          <h3>Installed Apps</h3>
          <p>Enable or disable apps for {currentStore.name}.</p>
        </div>

        {installedApps.length === 0 ? (
          <SurfaceCard className="apps-empty-card">
            <h3>No installed apps</h3>
            <p>Install an app from the app store section above.</p>
          </SurfaceCard>
        ) : (
          <div className="installed-apps-list">
            {installedApps.map((storeApp) => (
              <SurfaceCard className="installed-app-row" key={storeApp.id}>
                <div className={`app-card__icon app-card__icon--${storeApp.app.icon}`}>
                  {getAppIconLabel(storeApp.app)}
                </div>
                <div className="installed-app-row__content">
                  <h4>{storeApp.app.name}</h4>
                  <p>{storeApp.enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                <span
                  className={`installed-app-row__status${
                    isAppEnabled(storeApp.appId) ? ' installed-app-row__status--enabled' : ''
                  }`}
                >
                  {isAppEnabled(storeApp.appId) ? 'Active' : 'Inactive'}
                </span>
                <button
                  className={`app-toggle${storeApp.enabled ? ' app-toggle--enabled' : ''}`}
                  type="button"
                  disabled={pendingAppId === storeApp.appId}
                  onClick={() => handleToggle(storeApp.appId, !storeApp.enabled)}
                  aria-label={`${storeApp.enabled ? 'Disable' : 'Enable'} ${storeApp.app.name}`}
                >
                  <span />
                </button>
              </SurfaceCard>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Apps
