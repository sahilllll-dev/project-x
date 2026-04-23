import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import SurfaceCard from '../../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../../context/AppContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import {
  getApps,
  getStoreAppConfig,
  installStoreApp,
  toggleStoreApp,
  uninstallStoreApp,
  updateStoreAppConfig,
} from '../../utils/api.js'

function getAppIconLabel(app) {
  return app.name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function StoreAppsSettings() {
  const { currentStore, storeApps, setStoreApps, refreshStoreApps, isAppEnabled } =
    useAppContext()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('explore')
  const [apps, setApps] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [pendingAppId, setPendingAppId] = useState('')
  const [configApp, setConfigApp] = useState(null)
  const [configText, setConfigText] = useState('{}')
  const [isConfigLoading, setIsConfigLoading] = useState(false)
  const [isConfigSaving, setIsConfigSaving] = useState(false)
  const [configError, setConfigError] = useState('')
  const currentStoreId = currentStore?.id ?? ''

  useEffect(() => {
    let isCancelled = false

    async function loadApps() {
      setIsLoading(true)

      try {
        const nextApps = await getApps()

        if (!isCancelled) {
          setApps(nextApps)
        }
      } catch (error) {
        console.error(error)

        if (!isCancelled) {
          showToast(error.message || 'Failed to load apps', 'error')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadApps()

    return () => {
      isCancelled = true
    }
  }, [showToast])

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
      setActiveTab('installed')
      showToast('App installed', 'success')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Failed to install app', 'error')
    } finally {
      setPendingAppId('')
    }
  }

  async function handleToggle(appId, enabled) {
    if (!currentStoreId) {
      return
    }

    setPendingAppId(appId)

    try {
      const updatedStoreApp = await toggleStoreApp(currentStoreId, appId, enabled)
      setStoreApps(
        storeApps.map((storeApp) =>
          storeApp.appId === appId ? { ...storeApp, ...updatedStoreApp } : storeApp,
        ),
      )
      showToast(enabled ? 'App enabled' : 'App disabled', 'success')
    } catch (error) {
      console.error(error)
      refreshStoreApps()
      showToast(error.message || 'Failed to update app', 'error')
    } finally {
      setPendingAppId('')
    }
  }

  async function handleUninstall(appId) {
    if (!currentStoreId) {
      return
    }

    setPendingAppId(appId)

    try {
      await uninstallStoreApp(currentStoreId, appId)
      setStoreApps(storeApps.filter((storeApp) => storeApp.appId !== appId))

      if (configApp?.id === appId) {
        setConfigApp(null)
      }

      showToast('App uninstalled', 'success')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Failed to uninstall app', 'error')
    } finally {
      setPendingAppId('')
    }
  }

  async function handleOpenSettings(storeApp) {
    if (!currentStoreId || !storeApp.app) {
      return
    }

    if ((storeApp.app.slug ?? storeApp.appId) === 'whatsapp-chat') {
      navigate('/admin/apps/whatsapp-chat')
      return
    }

    setConfigApp(storeApp.app)
    setConfigText('{}')
    setConfigError('')
    setIsConfigLoading(true)

    try {
      const appConfig = await getStoreAppConfig(currentStoreId, storeApp.app.slug ?? storeApp.appId)
      setConfigText(JSON.stringify(appConfig.config ?? {}, null, 2))
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Failed to load app settings', 'error')
    } finally {
      setIsConfigLoading(false)
    }
  }

  async function handleSaveConfig() {
    if (!currentStoreId || !configApp || isConfigSaving) {
      return
    }

    let parsedConfig

    try {
      parsedConfig = JSON.parse(configText)
    } catch {
      setConfigError('Enter valid JSON')
      return
    }

    if (!parsedConfig || typeof parsedConfig !== 'object' || Array.isArray(parsedConfig)) {
      setConfigError('Config must be a JSON object')
      return
    }

    setConfigError('')
    setIsConfigSaving(true)

    try {
      const savedConfig = await updateStoreAppConfig(
        currentStoreId,
        configApp.slug ?? configApp.id,
        parsedConfig,
      )
      setConfigText(JSON.stringify(savedConfig.config ?? {}, null, 2))
      showToast('App settings saved', 'success')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Failed to save app settings', 'error')
    } finally {
      setIsConfigSaving(false)
    }
  }

  if (!currentStoreId) {
    return (
      <SurfaceCard className="apps-empty-card">
        <h3>Create a store to install apps</h3>
        <p>Apps are installed per store, so select or create a store first.</p>
      </SurfaceCard>
    )
  }

  return (
    <div className="settings-apps">
      <div className="settings-apps__tabs" role="tablist" aria-label="Apps tabs">
        <button
          className={`settings-apps__tab${
            activeTab === 'explore' ? ' settings-apps__tab--active' : ''
          }`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'explore'}
          onClick={() => setActiveTab('explore')}
        >
          Explore Apps
        </button>
        <button
          className={`settings-apps__tab${
            activeTab === 'installed' ? ' settings-apps__tab--active' : ''
          }`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'installed'}
          onClick={() => setActiveTab('installed')}
        >
          Installed Apps
        </button>
      </div>

      {activeTab === 'explore' ? (
        <div className="store-settings-stack" role="tabpanel">
          {isLoading ? (
            <SurfaceCard className="store-settings-panel">
              <p className="product-empty-state">Loading apps...</p>
            </SurfaceCard>
          ) : (
            <div className="apps-grid">
              {apps.map((app) => {
                const isInstalled = installedAppIds.has(app.id)

                return (
                  <SurfaceCard className="app-card settings-app-card" key={app.id}>
                    <div className={`app-card__icon app-card__icon--${app.icon}`}>
                      {getAppIconLabel(app)}
                    </div>
                    <div className="app-card__content">
                      <h4>{app.name}</h4>
                      <p>{app.description}</p>
                    </div>
                    <Button
                      disabled={isInstalled || pendingAppId === app.id}
                      onClick={() => handleInstall(app.id)}
                      size="sm"
                      variant={isInstalled ? 'outline' : 'primary'}
                    >
                      {isInstalled ? 'Installed' : pendingAppId === app.id ? 'Installing...' : 'Install'}
                    </Button>
                  </SurfaceCard>
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === 'installed' ? (
        <div className="store-settings-stack" role="tabpanel">
          {installedApps.length === 0 ? (
            <SurfaceCard className="apps-empty-card">
              <h3>No installed apps</h3>
              <p>Install an app from Explore Apps.</p>
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
                  <div className="installed-app-row__actions">
                    <Button
                      disabled={pendingAppId === storeApp.appId}
                      onClick={() => handleOpenSettings(storeApp)}
                      size="sm"
                      variant="outline"
                    >
                      Open Settings
                    </Button>
                    <Button
                      disabled={pendingAppId === storeApp.appId}
                      onClick={() => handleUninstall(storeApp.appId)}
                      size="sm"
                      variant="outline"
                    >
                      Uninstall
                    </Button>
                    <button
                      className={`app-toggle${storeApp.enabled ? ' app-toggle--enabled' : ''}`}
                      type="button"
                      disabled={pendingAppId === storeApp.appId}
                      onClick={() => handleToggle(storeApp.appId, !storeApp.enabled)}
                      aria-label={`${storeApp.enabled ? 'Disable' : 'Enable'} ${storeApp.app.name}`}
                    >
                      <span />
                    </button>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          )}

          {configApp ? (
            <SurfaceCard className="store-settings-panel settings-app-config">
              <div className="store-settings-panel__header settings-app-config__header">
                <div>
                  <h4>{configApp.name} Settings</h4>
                  <p>Configuration saved for this store.</p>
                </div>
                <Button onClick={() => setConfigApp(null)} size="sm" variant="outline">
                  Close
                </Button>
              </div>

              {isConfigLoading ? (
                <div className="store-settings-skeleton" aria-label="Loading app settings">
                  <span className="store-settings-skeleton__row" />
                  <span className="store-settings-skeleton__row" />
                </div>
              ) : (
                <>
                  <label className="store-settings-field" htmlFor="settings-app-config-json">
                    <span>Config JSON</span>
                    <textarea
                      id="settings-app-config-json"
                      rows="9"
                      value={configText}
                      onChange={(event) => {
                        setConfigText(event.target.value)
                        setConfigError('')
                      }}
                    />
                    {configError ? (
                      <small className="store-settings-field__error">{configError}</small>
                    ) : null}
                  </label>
                  <div className="settings-app-config__actions">
                    <Button
                      disabled={isConfigSaving}
                      onClick={handleSaveConfig}
                      type="button"
                    >
                      {isConfigSaving ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                </>
              )}
            </SurfaceCard>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default StoreAppsSettings
