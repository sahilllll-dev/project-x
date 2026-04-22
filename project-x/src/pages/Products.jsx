import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ListViewContainer from '../components/ListViewContainer.jsx'
import Button from '../components/ui/Button.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { deleteProduct, getCategories, getProducts, updateProduct } from '../utils/api.js'

const statusFilters = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Disabled', value: 'disabled' },
]

const initialFilters = {
  status: 'all',
  category: 'all',
  lowStock: false,
  outOfStock: false,
  search: '',
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function getProductImage(product) {
  return product?.image || product?.imageUrl || product?.thumbnail || ''
}

function getProductInventory(product) {
  const inventory = Number(product?.inventory ?? product?.quantity ?? 0)
  return Number.isFinite(inventory) ? inventory : 0
}

function getProductStatus(product) {
  if (product?.status === 'inactive') {
    return 'disabled'
  }

  return product?.status || 'disabled'
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

function normalizeCategory(category) {
  return {
    ...category,
    id: category.id,
    name: category.name ?? '',
    storeId: category.storeId ?? category.store_id ?? null,
    isDefault: Boolean(category.isDefault ?? category.is_default),
  }
}

function getProductSlug(product) {
  return product?.slug || product?.seo?.slug || String(product?.id ?? '')
}

function getProductShareUrl(product) {
  const productPath = `/product/${encodeURIComponent(getProductSlug(product))}`

  if (typeof window === 'undefined') {
    return productPath
  }

  return `${window.location.origin}${productPath}`
}

function ShareModal({ product, onClose, onCopy }) {
  const productUrl = getProductShareUrl(product)
  const encodedProductUrl = encodeURIComponent(productUrl)

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-product-title"
      >
        <div className="share-modal__header">
          <h3 id="share-product-title">Share Product</h3>
          <button type="button" onClick={onClose} aria-label="Close share modal">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="share-modal__field">
          <label htmlFor="share-product-url">Product link</label>
          <div className="share-modal__copy-row">
            <input id="share-product-url" type="text" value={productUrl} readOnly />
            <Button variant="outline" onClick={() => onCopy(productUrl)}>
              Copy
            </Button>
          </div>
        </div>

        <div className="share-modal__socials" aria-label="Social share links">
          <a
            href={`https://wa.me/?text=${encodedProductUrl}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
          <a
            href={`https://twitter.com/intent/tweet?url=${encodedProductUrl}`}
            target="_blank"
            rel="noreferrer"
          >
            Twitter (X)
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedProductUrl}`}
            target="_blank"
            rel="noreferrer"
          >
            Facebook
          </a>
        </div>
      </div>
    </div>
  )
}

function Products() {
  const navigate = useNavigate()
  const { currentStore, storeSwitchVersion } = useAppContext()
  const { showToast } = useToast()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [isLoading, setIsLoading] = useState(true)
  const [productToShare, setProductToShare] = useState(null)

  useEffect(() => {
    let isCancelled = false

    async function loadProducts() {
      setProducts([])
      setCategories([])
      setFilters(initialFilters)
      setProductToShare(null)

      if (!currentStore?.id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const [productResponse, categoryResponse] = await Promise.all([
          getProducts(currentStore.id),
          getCategories(currentStore.id).catch((error) => {
            console.error(error)
            return []
          }),
        ])

        if (isCancelled) {
          return
        }

        setProducts(productResponse)
        setCategories((categoryResponse ?? []).map(normalizeCategory))
      } catch (error) {
        console.error(error)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      isCancelled = true
    }
  }, [currentStore?.id, storeSwitchVersion])

  const categoryOptions = useMemo(() => {
    const options = []
    const categoryIds = new Set()

    categories.forEach((category) => {
      const categoryName = category.name ?? ''

      if (!category.id || !categoryName || categoryIds.has(String(category.id))) {
        return
      }

      options.push({ label: categoryName, value: String(category.id) })
      categoryIds.add(String(category.id))
    })

    return options
  }, [categories])

  const selectedCategory = categories.find(
    (category) => String(category.id) === String(filters.category),
  )
  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [String(category.id), category.name])),
    [categories],
  )

  function getProductCategoryLabel(product) {
    const categoryId = String(product.categoryId ?? product.category_id ?? '')

    if (categoryId && categoryNameById.has(categoryId)) {
      return categoryNameById.get(categoryId)
    }

    return product.category || product.categoryName || 'Uncategorized'
  }

  const filteredProducts = products.filter((product) => {
    const productInventory = getProductInventory(product)
    const productCategory = normalizeText(product.category ?? product.categoryName)
    const productCategoryId = String(product.categoryId ?? product.category_id ?? '')
    const selectedCategoryName = normalizeText(selectedCategory?.name ?? filters.category)

    const matchStatus =
      filters.status === 'all' ||
      getProductStatus(product) === filters.status

    const matchCategory =
      filters.category === 'all' ||
      productCategoryId === String(filters.category) ||
      productCategory === normalizeText(filters.category) ||
      productCategory === selectedCategoryName

    const matchLowStock =
      !filters.lowStock ||
      productInventory <= 5

    const matchOutOfStock =
      !filters.outOfStock ||
      productInventory === 0

    const matchSearch = normalizeText(product.title).includes(normalizeText(filters.search))

    return matchStatus && matchCategory && matchLowStock && matchOutOfStock && matchSearch
  })

  function updateFilters(nextFilters) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      ...nextFilters,
    }))
  }

  async function handleDelete(product) {
    if (!currentStore?.id) {
      showToast('Select a store first', 'error')
      return
    }

    if (!window.confirm('Are you sure you want to delete this product?')) {
      return
    }

    try {
      await deleteProduct(product.id, currentStore.id)
      setProducts((currentProducts) =>
        currentProducts.filter((currentProduct) => currentProduct.id !== product.id),
      )
      showToast('Product deleted', 'success')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    }
  }

  async function applyStatusUpdate(productId, nextStatus) {
    if (!currentStore?.id) {
      showToast('Select a store first', 'error')
      return
    }

    const previousProduct = products.find((product) => product.id === productId)

    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === productId ? { ...product, status: nextStatus } : product,
      ),
    )

    try {
      await updateProduct(productId, { status: nextStatus, storeId: currentStore.id })
      showToast(nextStatus === 'active' ? 'Product activated' : 'Product disabled', 'success')
    } catch (error) {
      console.error(error)
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === productId && previousProduct ? previousProduct : product,
        ),
      )
      showToast(error.message || 'Something went wrong', 'error')
    }
  }

  function handleStatusToggle(product) {
    const nextStatus = getProductStatus(product) === 'active' ? 'disabled' : 'active'
    applyStatusUpdate(product.id, nextStatus)
  }

  async function handleCopyProductLink(productUrl) {
    try {
      await navigator.clipboard.writeText(productUrl)
      showToast('Link copied', 'success')
    } catch (error) {
      console.error(error)
      showToast('Unable to copy link', 'error')
    }
  }

  return (
    <>
      <div className="products-page">
        <section className="products-toolbar">
          <div className="products-toolbar__filters">
            {statusFilters.map((filter) => (
              <Button
                key={filter.value}
                active={filters.status === filter.value}
                className="products-filter"
                variant="outline"
                onClick={() => updateFilters({ status: filter.value })}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          <div className="products-toolbar__controls">
            <label className="products-toolbar__select">
              <span>Category</span>
              <select
                value={filters.category}
                onChange={(event) => updateFilters({ category: event.target.value })}
              >
                <option value="all">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={`${category.value}-${category.label}`} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="products-stock-filter">
              <input
                type="checkbox"
                checked={filters.lowStock}
                onChange={(event) => updateFilters({ lowStock: event.target.checked })}
              />
              <span>Low stock</span>
            </label>

            <label className="products-stock-filter">
              <input
                type="checkbox"
                checked={filters.outOfStock}
                onChange={(event) => updateFilters({ outOfStock: event.target.checked })}
              />
              <span>Out of stock</span>
            </label>
          </div>
        </section>

        <ListViewContainer
          topContent={
            <div className="products-card__topbar">
              <label className="products-card__search">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={filters.search}
                  onChange={(event) => updateFilters({ search: event.target.value })}
                  placeholder="Search Products"
                />
              </label>
              <Button as={Link} to="/products/new" className="products-card__add" variant="primary">
                + Add Product
              </Button>
            </div>
          }
          isLoading={isLoading}
          isEmpty={filteredProducts.length === 0}
          loadingMessage="Loading products..."
          emptyMessage="No products found."
        >
            <div className="products-table">
              <div className="products-table__head">
                <span className="products-table__checkbox" aria-hidden="true" />
                <span>Product</span>
                <span>Price</span>
                <span>Inventory</span>
                <span>Category</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              {filteredProducts.map((product) => {
                const productInventory = getProductInventory(product)
                const isActive = getProductStatus(product) === 'active'
                const isLowStock = productInventory <= 5
                const isOutOfStock = productInventory === 0

                return (
                  <div className="products-table__row" key={product.id}>
                    <span className="products-table__checkbox" aria-hidden="true" />
                    <div className="products-table__product">
                      <div className="products-table__thumb">
                        {getProductImage(product) ? (
                          <img src={getProductImage(product)} alt={product.title} />
                        ) : null}
                      </div>
                      <div>
                        <strong>{product.title}</strong>
                        <p>{product.description || 'No description added yet'}</p>
                      </div>
                    </div>

                    <span>{formatCurrency(product.price)}</span>

                    <span className={isLowStock ? 'inventory inventory--low' : 'inventory inventory--available'}>
                      {isOutOfStock ? 'Out of stock' : String(productInventory).padStart(2, '0')}
                    </span>

                    <span>{getProductCategoryLabel(product)}</span>

                    <button
                      className={`status-toggle${isActive ? ' status-toggle--active' : ''}`}
                      type="button"
                      onClick={() => handleStatusToggle(product)}
                      aria-label={`Set ${product.title} as ${isActive ? 'disabled' : 'active'}`}
                    >
                      <span className="status-toggle__dot" />
                      {isActive ? 'Active' : 'Disabled'}
                    </button>

                    <div className="products-table__actions">
                      <button
                        className="products-action-button"
                        type="button"
                        onClick={() => navigate(`/products/edit/${product.id}`)}
                        aria-label={`Edit ${product.title}`}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        className="products-action-button"
                        type="button"
                        onClick={() => setProductToShare(product)}
                        aria-label={`Share ${product.title}`}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <circle cx="18" cy="5" r="3" />
                          <circle cx="6" cy="12" r="3" />
                          <circle cx="18" cy="19" r="3" />
                          <path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4" />
                        </svg>
                      </button>
                      <button
                        className="products-action-button products-action-button--danger"
                        type="button"
                        onClick={() => handleDelete(product)}
                        aria-label={`Delete ${product.title}`}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v5" />
                          <path d="M14 11v5" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
        </ListViewContainer>
      </div>

      {productToShare ? (
        <ShareModal
          product={productToShare}
          onClose={() => setProductToShare(null)}
          onCopy={handleCopyProductLink}
        />
      ) : null}
    </>
  )
}

export default Products
