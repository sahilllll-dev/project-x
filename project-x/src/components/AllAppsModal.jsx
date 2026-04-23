import { useEffect, useMemo, useState } from 'react'
import Button from './ui/Button.jsx'

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

function AllAppsModal({
  apps,
  installedApps,
  installedAppIds,
  isAppEnabled,
  onClose,
  onInstall,
  onOpenApp,
  pendingAppId,
}) {
  const [activeTab, setActiveTab] = useState('explore')
  const [search, setSearch] = useState('')
  const searchTerm = normalizeSearch(search)
  const filteredApps = useMemo(
    () =>
      apps.filter((app) =>
        normalizeSearch(`${app.name} ${app.description}`).includes(searchTerm),
      ),
    [apps, searchTerm],
  )
  const filteredInstalledApps = useMemo(
    () =>
      installedApps.filter((storeApp) =>
        normalizeSearch(`${storeApp.app?.name} ${storeApp.appId}`).includes(searchTerm),
      ),
    [installedApps, searchTerm],
  )
  const pickedApps = filteredApps.slice(0, 3)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  function renderAppCard(app, variant = 'card') {
    const isInstalled = installedAppIds.has(app.id)

    return (
      <div
        className={`all-apps-card${variant === 'row' ? ' all-apps-card--row' : ''}`}
        key={app.id}
      >
        <span className={`app-card__icon app-card__icon--${app.icon}`}>
          {getAppIconLabel(app)}
        </span>
        <span className="all-apps-card__content">
          <strong>{app.name}</strong>
          <small>{app.description}</small>
        </span>
        <Button
          disabled={pendingAppId === app.id}
          onClick={() => (isInstalled ? onOpenApp(app.slug) : onInstall(app.id))}
          size="sm"
          variant={isInstalled ? 'outline' : 'primary'}
        >
          {isInstalled ? 'Open' : pendingAppId === app.id ? 'Installing...' : 'Install'}
        </Button>
      </div>
    )
  }

  return (
    <div
      className="all-apps-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        event.stopPropagation()
        onClose()
      }}
    >
      <section
        className="all-apps-modal"
        role="dialog"
        aria-modal="true"
        aria-label="All apps"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="all-apps-modal__header">
          <div className="all-apps-modal__search">
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="6" />
                <path d="M20 20l-4.35-4.35" />
              </svg>
            </span>
            <input
              autoFocus
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search apps"
              aria-label="Search apps"
            />
          </div>
          <button
            className="all-apps-modal__close"
            type="button"
            onClick={onClose}
            aria-label="Close app marketplace"
          >
            x
          </button>
        </div>

        <div className="all-apps-tabs" role="tablist" aria-label="App marketplace">
          <button
            className={`all-apps-tabs__button${
              activeTab === 'explore' ? ' all-apps-tabs__button--active' : ''
            }`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'explore'}
            onClick={() => setActiveTab('explore')}
          >
            Explore
          </button>
          <button
            className={`all-apps-tabs__button${
              activeTab === 'installed' ? ' all-apps-tabs__button--active' : ''
            }`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'installed'}
            onClick={() => setActiveTab('installed')}
          >
            Installed
          </button>
        </div>

        <div className="all-apps-modal__body">
          {activeTab === 'explore' ? (
            <div className="all-apps-stack" role="tabpanel">
              <section className="all-apps-section">
                <h3>Picked for you</h3>
                {pickedApps.length === 0 ? (
                  <p className="all-apps-empty">No apps found</p>
                ) : (
                  <div className="all-apps-picked-grid">
                    {pickedApps.map((app) => renderAppCard(app))}
                  </div>
                )}
              </section>

              <section className="all-apps-section">
                <h3>More apps</h3>
                {filteredApps.length === 0 ? (
                  <p className="all-apps-empty">No apps found</p>
                ) : (
                  <div className="all-apps-more-grid">
                    {filteredApps.map((app) => renderAppCard(app, 'row'))}
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {activeTab === 'installed' ? (
            <div className="all-apps-stack" role="tabpanel">
              {filteredInstalledApps.length === 0 ? (
                <p className="all-apps-empty">No installed apps</p>
              ) : (
                <div className="all-apps-installed-list">
                  {filteredInstalledApps.map((storeApp) => (
                    <div className="all-apps-installed-row" key={storeApp.id}>
                      <span className={`app-card__icon app-card__icon--${storeApp.app.icon}`}>
                        {getAppIconLabel(storeApp.app)}
                      </span>
                      <span className="all-apps-card__content">
                        <strong>{storeApp.app.name}</strong>
                        <small>{isAppEnabled(storeApp.appId) ? 'Enabled' : 'Disabled'}</small>
                      </span>
                      <span
                        className={`installed-app-row__status${
                          isAppEnabled(storeApp.appId)
                            ? ' installed-app-row__status--enabled'
                            : ''
                        }`}
                      >
                        {isAppEnabled(storeApp.appId) ? 'Active' : 'Inactive'}
                      </span>
                      <Button
                        onClick={() => onOpenApp(storeApp.app.slug ?? storeApp.appId)}
                        size="sm"
                        variant="outline"
                      >
                        Open
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

export default AllAppsModal
