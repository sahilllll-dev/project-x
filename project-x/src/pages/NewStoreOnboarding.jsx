import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { checkStoreSlug, createStore, getStoresByUserId } from '../utils/api.js'

const initialFormData = {
  name: '',
  address1: '',
  address2: '',
  slug: '',
}

function normalizeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9-]/g, '')
}

function parseApiError(error) {
  try {
    return JSON.parse(error.message)?.message || error.message
  } catch {
    return error.message
  }
}

function OnboardingLayout({ children, showBackButton, title }) {
  const navigate = useNavigate()
  const steps = ['Store Settings', 'Add Products', 'Sell Online']

  return (
    <div className="dashboard">
      <div className="dashboard-intro">
        {showBackButton ? (
          <button className="product-editor__back" type="button" onClick={() => navigate('/stores')}>
            Back to stores
          </button>
        ) : null}
        <h2>{title}</h2>
        <p>Add the basic details for your new storefront.</p>
      </div>

      <section className="setup-guide">
        <div className="setup-guide__heading">
          <h3>Setup guide</h3>
          <span className="setup-guide__status">0/4 Completed</span>
        </div>

        <div className="setup-guide__card">
          <div className="setup-guide__steps">
            <ul className="setup-list">
              {steps.map((step, index) => (
                <li
                  className={`setup-list__item${index === 0 ? ' is-active' : ''}`}
                  key={step}
                >
                  <span className="setup-list__icon" aria-hidden="true">
                    {index === 0 ? '✓' : ''}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <section className="right-panel">
            {children}
          </section>
        </div>
      </section>
    </div>
  )
}

function NewStoreOnboarding() {
  const navigate = useNavigate()
  const { currentUser, setCurrentStore } = useAppContext()
  const { showToast } = useToast()
  const [formData, setFormData] = useState(initialFormData)
  const [isSlugEdited, setIsSlugEdited] = useState(false)
  const [isSlugAvailable, setIsSlugAvailable] = useState(null)
  const [slugError, setSlugError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [storeCount, setStoreCount] = useState(null)
  const isNewUser = storeCount === 0
  const isValid = Boolean(formData.name.trim() && formData.slug.trim() && isSlugAvailable === true)

  useEffect(() => {
    setCurrentStore(null)
  }, [setCurrentStore])

  useEffect(() => {
    if (!currentUser?.id) {
      return
    }

    async function loadStoreCount() {
      try {
        const stores = await getStoresByUserId(currentUser.id)
        setStoreCount(stores.length)
      } catch (error) {
        console.error(error)
        setStoreCount(null)
      }
    }

    loadStoreCount()
  }, [currentUser?.id])

  useEffect(() => {
    const slug = normalizeSlug(formData.slug)

    if (!slug) {
      return undefined
    }

    async function checkAvailability() {
      try {
        const response = await checkStoreSlug(slug)
        setIsSlugAvailable(response.available)
        setSlugError(response.available ? '' : 'Store Temporary URL already used')
      } catch (error) {
        console.error(error)
        setIsSlugAvailable(false)
        setSlugError('Unable to verify URL')
      }
    }

    const debounceTimerId = window.setTimeout(checkAvailability, 300)

    return () => {
      window.clearTimeout(debounceTimerId)
    }
  }, [formData.slug])

  function handleChange(event) {
    const { name, value } = event.target

    if (name === 'name') {
      const nextSlug = isSlugEdited ? formData.slug : normalizeSlug(value)
      setFormData((currentFormData) => ({
        ...currentFormData,
        name: value,
        slug: nextSlug,
      }))

      if (!nextSlug) {
        setIsSlugAvailable(null)
        setSlugError('')
      }

      return
    }

    if (name === 'slug') {
      setIsSlugEdited(true)
      const nextSlug = normalizeSlug(value)
      setFormData((currentFormData) => ({
        ...currentFormData,
        slug: nextSlug,
      }))

      if (!nextSlug) {
        setIsSlugAvailable(null)
        setSlugError('')
      }

      return
    }

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: name === 'slug' ? normalizeSlug(value) : value,
    }))
  }

  async function handleCreateStore(event) {
    event.preventDefault()

    const name = formData.name.trim()
    const slug = normalizeSlug(formData.slug)

    if (!name || !slug) {
      showToast('Please fill all required fields', 'error')
      return
    }

    if (!currentUser?.id || isSlugAvailable !== true) {
      return
    }

    const payload = {
      name,
      slug,
      subdomain: slug,
      address1: formData.address1.trim(),
      address2: formData.address2.trim(),
      userId: currentUser.id,
      ownerEmail: currentUser.email ?? '',
      onboardingStep: 2,
      isOnboardingCompleted: false,
    }
    console.log('Creating store with:', payload)

    setIsSubmitting(true)

    try {
      const nextStore = await createStore(payload)
      setCurrentStore(nextStore)
      showToast('Store created successfully', 'success')
      navigate(`/onboarding/${nextStore.id}`)
    } catch (error) {
      console.error(error)
      const message = parseApiError(error) || 'Something went wrong, please try again'
      if (message === 'Store Temporary URL already used') {
        setIsSlugAvailable(false)
        setSlugError(message)
      }
      showToast(message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <OnboardingLayout
      showBackButton={!isNewUser && storeCount !== null}
      title={isNewUser ? 'Create Your First Store' : 'Add New Store'}
    >
      <SurfaceCard as="form" className="form-card" onSubmit={handleCreateStore}>
        <div className="form-field">
          <label htmlFor="new-store-name">Store Name*</label>
          <input
            id="new-store-name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="new-store-address1">Address</label>
          <input
            id="new-store-address1"
            name="address1"
            type="text"
            value={formData.address1}
            onChange={handleChange}
          />
        </div>

        <div className="form-field">
          <label htmlFor="new-store-address2">Address line 2</label>
          <input
            id="new-store-address2"
            name="address2"
            type="text"
            value={formData.address2}
            onChange={handleChange}
          />
        </div>

        <div className="form-field">
          <label htmlFor="new-store-slug">Store Temporary URL*</label>
          <div className="url-input-group">
            <div className="url-display">
              <input
                id="new-store-slug"
                className="url-display__input"
                name="slug"
                type="text"
                value={formData.slug}
                onChange={handleChange}
                placeholder="store"
                required
              />
              <span className="url-display__suffix">.projectx.com</span>
            </div>
            {isSlugAvailable === true ? (
              <span className="status-icon status-icon--success" aria-label="URL available">
                ✓
              </span>
            ) : null}
            {isSlugAvailable === false ? (
              <span className="status-icon status-icon--error" aria-label="URL unavailable">
                ✕
              </span>
            ) : null}
          </div>
          {slugError ? <p className="error-text">{slugError}</p> : null}
        </div>

        <Button
          className="dashboard-create-button"
          disabled={!isValid || isSubmitting}
          fullWidth
          type="submit"
        >
          {isSubmitting ? 'Creating...' : 'Create Store'}
        </Button>
      </SurfaceCard>
    </OnboardingLayout>
  )
}

export default NewStoreOnboarding
