import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { deleteStore, getStoresByUserId } from '../utils/api.js'
import { getStoreDestination } from '../utils/onboarding.js'
import { getStoreAvatarStyle, getStoreInitial } from '../utils/storeAvatar.js'

function Stores() {
  const navigate = useNavigate()
  const { currentUser, currentStore, setCurrentStore } = useAppContext()
  const { showToast } = useToast()
  const [stores, setStores] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingStoreId, setDeletingStoreId] = useState(null)

  function handleSelectStore(store) {
    setCurrentStore(store)
    navigate(getStoreDestination(store))
  }

  async function fetchStores() {
    if (!currentUser?.id) {
      setStores([])
      setIsLoading(false)
      return
    }

    try {
      setStores(await getStoresByUserId(currentUser.id))
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStores()
  }, [currentUser?.id])

  function handleAddNewStore() {
    setCurrentStore(null)
    navigate('/onboarding/step-1')
  }

  async function handleDeleteStore(storeId) {
    setDeletingStoreId(storeId)

    try {
      await deleteStore(storeId)
      setStores((currentStores) => currentStores.filter((store) => store.id !== storeId))

      if (currentStore?.id === storeId) {
        setCurrentStore(null)
      }

      showToast('Store deleted', 'success')
      fetchStores()
    } catch (error) {
      console.error(error)
      showToast('Something went wrong, please try again', 'error')
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
