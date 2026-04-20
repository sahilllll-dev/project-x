import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useStore } from '../context/StoreContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { deleteStore, getStoresByUserId, setDefaultStore as saveDefaultStore } from '../utils/api.js'
import { getStoreDestination } from '../utils/onboarding.js'
import { getStoreAvatarStyle, getStoreInitial } from '../utils/storeAvatar.js'

function Stores() {
  const navigate = useNavigate()
  const { currentUser, defaultStoreId, setDefaultStore } = useAppContext()
  const { currentStore, setCurrentStore, stores, setStores } = useStore()
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [deletingStoreId, setDeletingStoreId] = useState(null)
  const userId = currentUser?.id

  function handleSelectStore(store) {
    setCurrentStore(store)
    navigate(getStoreDestination(store))
  }

  async function handleMakeDefault(store) {
    try {
      const nextDefaultStore = await saveDefaultStore(store.id)
      setDefaultStore(nextDefaultStore)
      setStores((currentStores) =>
        currentStores.map((currentStore) => ({
          ...currentStore,
          isDefault: currentStore.id === nextDefaultStore.id,
        })),
      )
      showToast(`${store.name} is now your default store`, 'success')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    }
  }

  const fetchStores = useCallback(async () => {
    if (!userId) {
      setStores([])
      setIsLoading(false)
      return
    }

    try {
      setStores(await getStoresByUserId(userId))
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [setStores, userId])

  useEffect(() => {
    const timerId = window.setTimeout(fetchStores, 0)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [fetchStores])

  function handleAddNewStore() {
    setCurrentStore(null)
    navigate('/onboarding/new')
  }

  async function handleDeleteStore(storeId) {
    setDeletingStoreId(storeId)
    const deletedStore = stores.find((store) => store.id === storeId)

    try {
      await deleteStore(storeId)
      const nextStores = stores.filter((store) => store.id !== storeId)
      setStores(nextStores)

      if (currentStore?.id === storeId) {
        setCurrentStore(null)
      }

      if (defaultStoreId === storeId || deletedStore?.isDefault) {
        if (nextStores[0]) {
          const nextDefaultStore = await saveDefaultStore(nextStores[0].id)
          setDefaultStore(nextDefaultStore)
          setStores((currentStores) =>
            currentStores.map((store) => ({
              ...store,
              isDefault: store.id === nextDefaultStore.id,
            })),
          )
        } else {
          setDefaultStore(null)
        }
      }

      showToast('Store deleted', 'success')
      fetchStores()
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setDeletingStoreId(null)
    }
  }

  return (
    <div className="stores-page">
      <div className="stores-page__header">
        <div>
          <p>Switch between your stores or create a new one.</p>
        </div>
        <Button onClick={handleAddNewStore}>
          + Add New Store
        </Button>
      </div>

      <SurfaceCard className="stores-list-card">
        {isLoading ? (
          <p className="product-empty-state">Loading stores...</p>
        ) : stores.length === 0 ? (
          <p className="product-empty-state">No stores found.</p>
        ) : (
          <div className="stores-list">
            {stores.map((store) => {
              const isActive = store.id === currentStore?.id
              const isDefault = store.isDefault || store.id === defaultStoreId

              return (
                <div className="stores-list__item" key={store.id}>
                  <div className="stores-list__identity">
                    <span className="stores-list__avatar" style={getStoreAvatarStyle(store)}>
                      {getStoreInitial(store)}
                    </span>
                    <div>
                      <strong>{store.name}</strong>
                      <p>{store.url}</p>
                    </div>
                  </div>

                  <div className="stores-list__actions">
                    {isDefault ? (
                      <span className="stores-list__active">Default</span>
                    ) : (
                      <Button variant="outline" onClick={() => handleMakeDefault(store)}>
                        Make Default
                      </Button>
                    )}
                    {isActive ? (
                      <span className="stores-list__active">Selected</span>
                    ) : (
                      <Button variant="outline" onClick={() => handleSelectStore(store)}>
                        Select Store
                      </Button>
                    )}
                    <Button
                      disabled={deletingStoreId === store.id}
                      variant="outline"
                      onClick={() => handleDeleteStore(store.id)}
                    >
                      {deletingStoreId === store.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SurfaceCard>
    </div>
  )
}

export default Stores
