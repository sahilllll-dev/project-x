import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { checkStoreSlug, createStore } from '../utils/api.js'

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function NewStoreOnboarding() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, setCurrentStore, setStores, stores } = useAppContext()
  const { showToast } = useToast()
  const [storeName, setStoreName] = useState('')
  const [slug, setSlug] = useState('')
  const [isSlugEdited, setIsSlugEdited] = useState(false)
  const [isSlugAvailable, setIsSlugAvailable] = useState(null)
  const [slugError, setSlugError] = useState('')
  const [isCheckingSlug, setIsCheckingSlug] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isAddingStore = location.pathname === '/onboarding/new' && stores.length > 0
  const canContinue =
    Boolean(storeName.trim() && slug.trim()) && isSlugAvailable === true && !isSubmitting

  useEffect(() => {
    if (!slug.trim()) {
      setIsSlugAvailable(null)
      setSlugError('')
      setIsCheckingSlug(false)
      return undefined
    }

    let isCancelled = false

    async function checkAvailability() {
      setIsCheckingSlug(true)

      try {
        const response = await checkStoreSlug(slug)

        if (isCancelled) {
          return
        }

        setIsSlugAvailable(response.available)
        setSlugError(response.available ? '' : 'Already taken')
      } catch (error) {
        console.error(error)

        if (!isCancelled) {
          setIsSlugAvailable(false)
          setSlugError('Unable to check slug')
        }
      } finally {
        if (!isCancelled) {
          setIsCheckingSlug(false)
        }
      }
    }

    const timerId = window.setTimeout(checkAvailability, 300)

    return () => {
      isCancelled = true
      window.clearTimeout(timerId)
    }
  }, [slug])

  function handleStoreNameChange(event) {
    const nextName = event.target.value
    setStoreName(nextName)

    if (!isSlugEdited) {
      setSlug(slugify(nextName))
    }
  }

  function handleSlugChange(event) {
    setIsSlugEdited(true)
    setSlug(slugify(event.target.value))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const name = storeName.trim()
    const nextSlug = slugify(slug)

    if (!name) {
      showToast('Store name is required', 'error')
      return
    }

    if (!nextSlug) {
      showToast('Slug is required', 'error')
      return
    }

    if (isSlugAvailable !== true) {
      showToast(slugError || 'Choose an available slug', 'error')
      return
    }

    if (!currentUser?.id) {
      showToast('Please sign in to create a store', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      const nextStore = await createStore({
        name,
        slug: nextSlug,
        userId: currentUser.id,
        ownerEmail: currentUser.email ?? '',
        onboardingStep: 2,
        isOnboardingCompleted: false,
      })

      setCurrentStore(nextStore)
      setStores((currentStores) => {
        if (currentStores.some((store) => store.id === nextStore.id)) {
          return currentStores
        }

        return [...currentStores, nextStore]
      })
      showToast('Store created successfully', 'success')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error(error)
      const message = error.message || 'Failed to create store'

      if (message === 'Store Temporary URL already used') {
        setIsSlugAvailable(false)
        setSlugError('Already taken')
      }

      showToast(message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="onboarding-page">
      <SurfaceCard className="onboarding-card">
        <div className="onboarding-card__header">
          {isAddingStore ? (
            <button
              className="onboarding-card__back"
              type="button"
              onClick={() => navigate('/stores')}
            >
              Back to stores
            </button>
          ) : null}
          <span className="onboarding-card__eyebrow">Project X</span>
          <h1>{isAddingStore ? 'Create another store' : 'Create your store'}</h1>
          <p>
            Add your store name and choose a clean URL. You must create a store before
            using the admin dashboard.
          </p>
        </div>

        <form className="onboarding-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="store-name">Store name</label>
            <input
              id="store-name"
              type="text"
              value={storeName}
              onChange={handleStoreNameChange}
              placeholder="My Store Name"
              autoFocus
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="store-slug">Slug</label>
            <div className="onboarding-slug-field">
              <input
                id="store-slug"
                type="text"
                value={slug}
                onChange={handleSlugChange}
                placeholder="my-store-name"
                required
              />
              <span>.projectx.com</span>
            </div>

            <div className="onboarding-slug-status" aria-live="polite">
              {isCheckingSlug ? <span>Checking...</span> : null}
              {!isCheckingSlug && isSlugAvailable === true ? (
                <span className="onboarding-slug-status--success">Available</span>
              ) : null}
              {!isCheckingSlug && isSlugAvailable === false ? (
                <span className="onboarding-slug-status--error">
                  {slugError || 'Already taken'}
                </span>
              ) : null}
            </div>
          </div>

          <Button
            className="onboarding-card__button"
            disabled={!canContinue}
            fullWidth
            type="submit"
          >
            {isSubmitting ? 'Creating...' : 'Continue'}
          </Button>
        </form>
      </SurfaceCard>
    </main>
  )
}

export default NewStoreOnboarding
