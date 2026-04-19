import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { createStore, getStoresByUserId } from '../utils/api.js'
import { getStoreDestination } from '../utils/onboarding.js'
import { getStoreAvatarStyle, getStoreInitial } from '../utils/storeAvatar.js'

function Stores() {
  const navigate = useNavigate()
  const { currentUser, currentStore, setCurrentStore } = useAppContext()
  const { showToast } = useToast()
  const [stores, setStores] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  function handleSelectStore(store) {
    setCurrentStore(store)
    navigate(getStoreDestination(store))
  }

  useEffect(() => {
    async function loadStores() {
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

    loadStores()
  }, [currentUser?.id])

  async function handleAddNewStore() {
    if (!currentUser?.id) {
      return
    }

    setIsCreating(true)

    try {
      const nextStore = await createStore({
        userId: currentUser.id,
        ownerEmail: currentUser.email ?? '',
        name: '',
        url: '',
        onboardingStep: 1,
        isOnboardingCompleted: false,
      })

      setStores((currentStores) => [...currentStores, nextStore])
      setCurrentStore(nextStore)
      navigate('/onboarding/step-1')
    } catch (error) {
      console.error(error)
      showToast('Something went wrong, please try again', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="stores-page">
      <div className="stores-page__header">
        <div>
          <p>Switch between your stores or create a new one.</p>
        </div>
        <Button disabled={isCreating} onClick={handleAddNewStore}>
          {isCreating ? 'Creating...' : '+ Add New Store'}
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

                  {isActive ? (
                    <span className="stores-list__active">Selected</span>
                  ) : (
                    <Button variant="outline" onClick={() => handleSelectStore(store)}>
                      Select Store
                    </Button>
                  )}
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
