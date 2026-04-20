import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { createProduct, getCategories, getProducts, updateProduct } from '../utils/api.js'

const initialFormState = {
  title: '',
  description: '',
  category: '',
  price: '',
  discountedPrice: '',
  quantity: '',
  lowStockThreshold: '5',
  sku: '',
  status: 'active',
  image: '',
  seo: {
    title: '',
    description: '',
    slug: '',
  },
}

function slugifyProductTitle(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function calculateDiscount(price, discountedPrice) {
  const priceValue = Number(price)
  const discountedValue = Number(discountedPrice)

  if (!priceValue || !discountedValue || discountedValue > priceValue) {
    return null
  }

  return Math.round(((priceValue - discountedValue) / priceValue) * 100)
}

function normalizeCategory(category) {
  return {
    id: category.id,
    name: category.name ?? '',
    parentId: category.parentId ?? category.parent_id ?? '',
  }
}

function buildCategoryOptions(categories) {
  const childrenByParentId = new Map()
  const options = []

  categories.forEach((category) => {
    const parentKey = category.parentId ? String(category.parentId) : 'root'
    const children = childrenByParentId.get(parentKey) ?? []
    children.push(category)
    childrenByParentId.set(parentKey, children)
  })

  function appendOptions(parentKey = 'root', depth = 0) {
    const children = childrenByParentId.get(parentKey) ?? []
    children
      .sort((left, right) => left.name.localeCompare(right.name))
      .forEach((category) => {
        options.push({ ...category, depth })
        appendOptions(String(category.id), depth + 1)
      })
  }

  appendOptions()
  return options
}

function getEditableSnapshot(formData, shippingData, galleryImage, limitSinglePurchase) {
  return JSON.stringify({
    formData,
    shippingData,
    galleryImage,
    limitSinglePurchase,
  })
}

function AddProduct() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = Boolean(id)
  const { currentStore, isAppEnabled } = useAppContext()
  const { showToast } = useToast()
  const [formData, setFormData] = useState(initialFormState)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [limitSinglePurchase, setLimitSinglePurchase] = useState(false)
  const [shippingData, setShippingData] = useState({
    weight: '',
    length: '',
    width: '',
    height: '',
  })
  const [galleryImage, setGalleryImage] = useState('')
  const [categories, setCategories] = useState([])
  const [isSeoSlugEdited, setIsSeoSlugEdited] = useState(false)
  const [initialEditableSnapshot, setInitialEditableSnapshot] = useState('')

  const isSeoHelperEnabled = isAppEnabled('seo-helper')
  const categoryOptions = buildCategoryOptions(categories)
  const shouldShowCurrentCategoryOption =
    formData.category &&
    !categoryOptions.some((category) => category.name === formData.category)
  const currentEditableSnapshot = getEditableSnapshot(
    formData,
    shippingData,
    galleryImage,
    limitSinglePurchase,
  )
  const hasProductChanges = !isEditMode || currentEditableSnapshot !== initialEditableSnapshot
  const discountPercent = calculateDiscount(formData.price, formData.discountedPrice)
  const hasInvalidDiscount =
    formData.price !== '' &&
    formData.discountedPrice !== '' &&
    Number(formData.discountedPrice) > Number(formData.price)

  useEffect(() => {
    async function loadProduct() {
      if (!isEditMode) {
        return
      }

      try {
        const products = await getProducts(currentStore?.id)
        const currentProduct = products.find((entry) => String(entry.id) === id)

        if (!currentProduct) {
          navigate('/products')
          return
        }

        const nextFormData = {
          title: currentProduct.title ?? '',
          description: currentProduct.description ?? '',
          category: currentProduct.category ?? '',
          price: String(currentProduct.price ?? ''),
          discountedPrice: String(currentProduct.discountedPrice ?? ''),
          quantity: String(currentProduct.quantity ?? ''),
          lowStockThreshold: String(currentProduct.lowStockThreshold ?? 5),
          sku: currentProduct.sku ?? '',
          status: currentProduct.status ?? 'active',
          image: currentProduct.image ?? currentProduct.imageUrl ?? '',
          seo: {
            title: currentProduct.seo?.title ?? currentProduct.title ?? '',
            description: currentProduct.seo?.description ?? currentProduct.description ?? '',
            slug: currentProduct.seo?.slug ?? String(currentProduct.id),
          },
        }
        const nextShippingData = {
          weight: String(currentProduct.shipping?.weight ?? ''),
          length: String(currentProduct.shipping?.length ?? ''),
          width: String(currentProduct.shipping?.width ?? ''),
          height: String(currentProduct.shipping?.height ?? ''),
        }
        const nextGalleryImage = currentProduct.galleryImage ?? ''
        const nextLimitSinglePurchase = Boolean(currentProduct.limitSinglePurchase)

        setFormData(nextFormData)
        setShippingData(nextShippingData)
        setGalleryImage(nextGalleryImage)
        setLimitSinglePurchase(nextLimitSinglePurchase)
        setInitialEditableSnapshot(
          getEditableSnapshot(
            nextFormData,
            nextShippingData,
            nextGalleryImage,
            nextLimitSinglePurchase,
          ),
        )
        setIsSeoSlugEdited(Boolean(currentProduct.seo?.slug))
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProduct()
  }, [currentStore?.id, id, isEditMode, navigate])

  useEffect(() => {
    let isCancelled = false

    async function loadCategories() {
      if (!currentStore?.id) {
        setCategories([])
        return
      }

      try {
        const response = await getCategories(currentStore.id)

        if (!isCancelled) {
          setCategories((response ?? []).map(normalizeCategory))
        }
      } catch (error) {
        console.error(error)
        if (!isCancelled) {
          setCategories([])
        }
      }
    }

    loadCategories()

    return () => {
      isCancelled = true
    }
  }, [currentStore?.id])

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
      seo:
        name === 'title' && isSeoHelperEnabled && !isSeoSlugEdited
          ? {
              ...currentData.seo,
              title: currentData.seo.title || value,
              slug: slugifyProductTitle(value),
            }
          : currentData.seo,
    }))

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: '',
    }))
  }

  function handleSeoChange(event) {
    const { name, value } = event.target

    if (name === 'slug') {
      setIsSeoSlugEdited(true)
    }

    setFormData((currentData) => ({
      ...currentData,
      seo: {
        ...currentData.seo,
        [name]: name === 'slug' ? slugifyProductTitle(value) : value,
      },
    }))
  }

  function handleShippingChange(event) {
    const { name, value } = event.target

    setShippingData((currentData) => ({
      ...currentData,
      [name]: value,
    }))
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        image: 'Please upload a valid image file',
      }))
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setFormData((currentData) => ({
        ...currentData,
        image: typeof reader.result === 'string' ? reader.result : '',
      }))

      setErrors((currentErrors) => ({
        ...currentErrors,
        image: '',
      }))
    }

    reader.readAsDataURL(file)
  }

  function handleGalleryImageChange(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        gallery: 'Please upload a valid image file',
      }))
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setGalleryImage(typeof reader.result === 'string' ? reader.result : '')

      setErrors((currentErrors) => ({
        ...currentErrors,
        gallery: '',
      }))
    }

    reader.readAsDataURL(file)
  }

  function handleRemoveImage() {
    setFormData((currentData) => ({
      ...currentData,
      image: '',
    }))
  }

  function validateForm() {
    const nextErrors = {}

    if (!formData.title.trim()) {
      nextErrors.title = 'Title is required'
    }

    if (!formData.price.trim()) {
      nextErrors.price = 'Price is required'
    }

    if (hasInvalidDiscount) {
      nextErrors.discountedPrice = 'Discounted price cannot be greater than price'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (isEditMode && !hasProductChanges) {
      return
    }

    if (!validateForm()) {
      return
    }

    if (!currentStore?.id) {
      return
    }

    const payload = {
      storeId: currentStore.id,
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category.trim(),
      price: Number(formData.price) || 0,
      discountedPrice: Number(formData.discountedPrice) || 0,
      quantity: Number(formData.quantity) || 0,
      lowStockThreshold:
        formData.lowStockThreshold === '' ? 5 : Math.max(0, Number(formData.lowStockThreshold) || 0),
      sku: formData.sku.trim(),
      status: formData.status,
      image: formData.image,
      galleryImage,
      limitSinglePurchase,
      shipping: {
        weight: shippingData.weight,
        length: shippingData.length,
        width: shippingData.width,
        height: shippingData.height,
      },
      createdAt: Date.now(),
    }

    if (isSeoHelperEnabled) {
      payload.seo = {
        title: formData.seo.title.trim(),
        description: formData.seo.description.trim(),
        slug: formData.seo.slug.trim() || slugifyProductTitle(formData.title) || String(id ?? ''),
      }
    }

    setIsSubmitting(true)

    try {
      if (isEditMode) {
        await updateProduct(id, payload)
        setInitialEditableSnapshot(currentEditableSnapshot)
        showToast('Product updated successfully', 'success')
        if (payload.quantity <= payload.lowStockThreshold) {
          showToast(`Low stock alert for ${payload.title}`, 'info')
        }
      } else {
        await createProduct(payload)
        showToast('Product added successfully', 'success')
        if (payload.quantity <= payload.lowStockThreshold) {
          showToast(`Low stock alert for ${payload.title}`, 'info')
        }
        navigate('/products')
      }
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <p className="product-empty-state">Loading product...</p>
  }

  return (
    <div className="product-editor">
      <button className="product-editor__back" type="button" onClick={() => navigate('/products')}>
        <span aria-hidden="true">‹</span>
        Products
      </button>

      <h2 className="product-editor__title">{isEditMode ? 'Edit Product' : 'Add New Product'}</h2>

      <form className="product-editor__grid" onSubmit={handleSubmit}>
        <div className="product-editor__main">
          <SurfaceCard className="product-panel">
            <div className="product-form__field">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                placeholder="Men Dunk Low Retro"
              />
              {errors.title ? <p className="error-text">{errors.title}</p> : null}
            </div>

            <div className="product-form__field">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Lorem Ipsum is simply dummy text"
                rows="7"
              />
            </div>

            <div className="product-form__field">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="">Select category</option>
                {shouldShowCurrentCategoryOption ? (
                  <option value={formData.category}>{formData.category}</option>
                ) : null}
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.name}>
                    {`${'-- '.repeat(category.depth)}${category.name}`}
                  </option>
                ))}
              </select>
            </div>
          </SurfaceCard>

          <SurfaceCard className="product-panel">
            <h3>Pricing</h3>
            <div className="product-form__columns">
              <div className="product-form__field">
                <label htmlFor="price">Price</label>
                <div className="input-wrapper">
                  <span className="currency">₹</span>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="1000"
                  />
                </div>
                {errors.price ? <p className="error-text">{errors.price}</p> : null}
              </div>

              <div className="product-form__field">
                <label htmlFor="discountedPrice">Discounted Price</label>
                <div className="input-wrapper">
                  <span className="currency">₹</span>
                  <input
                    id="discountedPrice"
                    name="discountedPrice"
                    type="number"
                    min="0"
                    value={formData.discountedPrice}
                    onChange={handleChange}
                    placeholder="800"
                  />
                </div>
                {errors.discountedPrice || hasInvalidDiscount ? (
                  <p className="error-text">
                    {errors.discountedPrice || 'Discounted price cannot be greater than price'}
                  </p>
                ) : null}
              </div>
            </div>

            {discountPercent ? (
              <div className="product-price-summary">
                <span>
                  Price: <strong>₹{Number(formData.discountedPrice).toLocaleString('en-IN')}</strong>
                </span>
                <s>₹{Number(formData.price).toLocaleString('en-IN')}</s>
                <span className="product-discount-badge">{discountPercent}% OFF</span>
              </div>
            ) : null}
          </SurfaceCard>

          <SurfaceCard className="product-panel">
            <h3>Inventory</h3>
            <div className="product-form__columns">
              <div className="product-form__field">
                <label htmlFor="quantity">Quantity</label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="1"
                />
              </div>

              <div className="product-form__field">
                <label htmlFor="lowStockThreshold">Low Stock Alert</label>
                <input
                  id="lowStockThreshold"
                  name="lowStockThreshold"
                  type="number"
                  min="0"
                  value={formData.lowStockThreshold}
                  onChange={handleChange}
                  placeholder="5"
                />
              </div>
            </div>

            <div className="product-form__field">
              <label htmlFor="sku">SKU</label>
              <input
                id="sku"
                name="sku"
                type="text"
                value={formData.sku}
                onChange={handleChange}
                placeholder="13223"
              />
            </div>
            <label className="product-checkbox">
              <input
                type="checkbox"
                checked={limitSinglePurchase}
                onChange={(event) => setLimitSinglePurchase(event.target.checked)}
              />
              <span />
              Limit purchases to 1 item per order
            </label>
          </SurfaceCard>

          <SurfaceCard className="product-panel">
            <h3>Shipping</h3>
            <div className="product-form__columns product-form__columns--shipping">
              <div className="product-form__field">
                <label htmlFor="weight">Shipment Weight (kg)</label>
                <input
                  id="weight"
                  name="weight"
                  type="number"
                  min="0"
                  value={shippingData.weight}
                  onChange={handleShippingChange}
                  placeholder="Eg. 1.2"
                />
              </div>

              <div className="product-form__field">
                <label>Dimensions (cm)</label>
                <div className="product-dimensions">
                  <input
                    aria-label="Length"
                    name="length"
                    type="number"
                    min="0"
                    value={shippingData.length}
                    onChange={handleShippingChange}
                    placeholder="Length"
                  />
                  <input
                    aria-label="Width"
                    name="width"
                    type="number"
                    min="0"
                    value={shippingData.width}
                    onChange={handleShippingChange}
                    placeholder="Width"
                  />
                  <input
                    aria-label="Height"
                    name="height"
                    type="number"
                    min="0"
                    value={shippingData.height}
                    onChange={handleShippingChange}
                    placeholder="Height"
                  />
                </div>
              </div>
            </div>
          </SurfaceCard>

          {isSeoHelperEnabled ? (
            <SurfaceCard className="product-panel">
              <h3>SEO</h3>
              <div className="product-form__field">
                <label htmlFor="seo-title">Title Tag</label>
                <input
                  id="seo-title"
                  name="title"
                  type="text"
                  value={formData.seo.title}
                  onChange={handleSeoChange}
                  placeholder={formData.title || 'Men Dunk Low Retro'}
                />
              </div>

              <div className="product-form__field">
                <label htmlFor="seo-description">Description</label>
                <textarea
                  id="seo-description"
                  name="description"
                  value={formData.seo.description}
                  onChange={handleSeoChange}
                  placeholder={formData.description || 'Write a short search result description'}
                  rows="4"
                />
              </div>

              <div className="product-form__field">
                <label htmlFor="seo-slug">Slug</label>
                <input
                  id="seo-slug"
                  name="slug"
                  type="text"
                  value={formData.seo.slug}
                  onChange={handleSeoChange}
                  placeholder="men-dunk-low-retro"
                />
              </div>

              <div className="seo-preview">
                <span>{currentStore?.url ?? 'yourstore.com'}/products/{formData.seo.slug || 'product-slug'}</span>
                <strong>{formData.seo.title || formData.title || 'Product title'}</strong>
                <p>
                  {formData.seo.description ||
                    formData.description ||
                    'Your product description will appear here in Google search previews.'}
                </p>
              </div>
            </SurfaceCard>
          ) : null}
        </div>

        <aside className="product-editor__sidebar">
          <SurfaceCard className="product-panel">
            <div className="product-form__field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <Button
              disabled={isSubmitting || (isEditMode && !hasProductChanges)}
              fullWidth
              type="submit"
              variant="primary"
            >
              {isSubmitting
                ? isEditMode
                  ? 'Updating...'
                  : 'Publishing...'
                : isEditMode
                  ? 'Update'
                  : 'Publish'}
            </Button>
          </SurfaceCard>

          <SurfaceCard className="product-panel">
            <h3>Media</h3>
            <div className="product-form__field">
              <span className="product-media-label">Thumbnail</span>
              <label className="product-media-upload" htmlFor="product-image">
                {formData.image ? (
                  <img
                    className="product-media-upload__preview"
                    src={formData.image}
                    alt="Product preview"
                  />
                ) : (
                  <span className="product-media-upload__placeholder">
                    <strong>Button</strong>
                    <span>Button</span>
                    <small>PNG, JPG or Video (Max 5MB)</small>
                  </span>
                )}
              </label>
              <input
                id="product-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                hidden
              />
              {errors.image ? <p className="error-text">{errors.image}</p> : null}
              {formData.image ? (
                <Button className="product-media-upload__remove" variant="outline" onClick={handleRemoveImage}>
                  Remove Image
                </Button>
              ) : null}
            </div>

            <div className="product-form__field">
              <span className="product-media-label">Gallery</span>
              <label className="product-media-upload product-media-upload--gallery" htmlFor="product-gallery-image">
                {galleryImage ? (
                  <img
                    className="product-media-upload__preview"
                    src={galleryImage}
                    alt="Product gallery preview"
                  />
                ) : (
                  <span className="product-media-upload__placeholder">
                    <strong>Button</strong>
                    <span>Button</span>
                    <small>PNG, JPG or Video (Max 5MB)</small>
                  </span>
                )}
              </label>
              <input
                id="product-gallery-image"
                type="file"
                accept="image/*"
                onChange={handleGalleryImageChange}
                hidden
              />
              {errors.gallery ? <p className="error-text">{errors.gallery}</p> : null}
            </div>
          </SurfaceCard>
        </aside>
      </form>
    </div>
  )
}

export default AddProduct
