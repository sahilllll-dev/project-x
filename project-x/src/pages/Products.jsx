import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ListViewContainer from '../components/ListViewContainer.jsx'
import Button from '../components/ui/Button.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { deleteProduct, getProducts, updateProduct } from '../utils/api.js'

const statusFilters = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Out of Stock', value: 'out-of-stock' },
  { label: 'Disabled', value: 'inactive' },
]

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

function Products() {
  const navigate = useNavigate()
  const { currentStore } = useAppContext()
  const { showToast } = useToast()
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [productToDeactivate, setProductToDeactivate] = useState(null)
  const [productToDelete, setProductToDelete] = useState(null)

  useEffect(() => {
    async function loadProducts() {
      if (!currentStore?.id) {
        setProducts([])
        setIsLoading(false)
        return
      }

      try {
        const response = await getProducts(currentStore.id)
        setProducts(response)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProducts()
  }, [currentStore?.id])

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) {
      return false
    }

    if (activeFilter === 'all') {
      return true
    }

    if (activeFilter === 'out-of-stock') {
      return Number(product.quantity) === 0
    }

    return product.status === activeFilter
  })

  async function handleDelete(productId) {
    try {
      await deleteProduct(productId)
      setProducts((currentProducts) =>
        currentProducts.filter((product) => product.id !== productId),
      )
      showToast('Product deleted', 'success')
    } catch (error) {
      console.error(error)
      showToast('Something went wrong', 'error')
    }
  }

  async function applyStatusUpdate(productId, nextStatus) {
    try {
      await updateProduct(productId, { status: nextStatus })
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === productId ? { ...product, status: nextStatus } : product,
        ),
      )
      showToast(nextStatus === 'active' ? 'Product activated' : 'Product deactivated', 'success')
    } catch (error) {
      console.error(error)
      showToast('Something went wrong', 'error')
    }
  }

  function handleStatusToggle(product) {
    if (product.status === 'active') {
      setProductToDeactivate(product)
      return
    }

    applyStatusUpdate(product.id, 'active')
  }

  return (
    <>
      <div className="products-page">
        <section className="products-toolbar">
          <div className="products-toolbar__controls">
            <button className="products-toolbar__control" type="button">
              <span aria-hidden="true">▦</span>
              Last 7 days
              <span aria-hidden="true">⌄</span>
            </button>
            <button className="products-toolbar__control" type="button">
              <span aria-hidden="true">▽</span>
              Filter
              <span aria-hidden="true">⌄</span>
            </button>
          </div>

          <div className="products-toolbar__filters">
            {statusFilters.map((filter) => (
              <Button
                key={filter.value}
                active={activeFilter === filter.value}
                className="products-filter"
                variant="outline"
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </section>

        <ListViewContainer
          topContent={
            <div className="products-card__topbar">
              <label className="products-card__search">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search Products"
                />
              </label>
              <Button as={Link} to="/products/new" className="products-card__add" variant="primary">
                + Add Product
              </Button>
              <button className="products-card__menu" type="button" aria-label="More product actions">
                <span />
                <span />
                <span />
              </button>
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
                const isActive = product.status === 'active'
                const isOutOfStock = Number(product.quantity) === 0

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

                    <span className={isOutOfStock ? 'inventory inventory--empty' : 'inventory inventory--available'}>
                      {isOutOfStock ? 'Out of stock' : String(product.quantity).padStart(2, '0')}
                    </span>

                    <span>{product.category || 'Uncategorized'}</span>

                    <button
                      className={`status-toggle${isActive ? ' status-toggle--active' : ''}`}
                      type="button"
                      onClick={() => handleStatusToggle(product)}
                      aria-label={`Set ${product.title} as ${isActive ? 'inactive' : 'active'}`}
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
                          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                          <circle cx="12" cy="12" r="2.8" />
                        </svg>
                      </button>
                      <button className="products-action-button" type="button" aria-label={`Share ${product.title}`}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <circle cx="18" cy="5" r="3" />
                          <circle cx="6" cy="12" r="3" />
                          <circle cx="18" cy="19" r="3" />
                          <path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4" />
                        </svg>
                      </button>
                      <button
                        className="products-action-button products-action-button--kebab"
                        type="button"
                        onClick={() => setProductToDelete(product)}
                        aria-label={`Delete ${product.title}`}
                      >
                        <span />
                        <span />
                        <span />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
        </ListViewContainer>
      </div>

      {productToDeactivate ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deactivate-product-title"
          >
            <h3 id="deactivate-product-title">Deactivate Product?</h3>
            <p>
              {productToDeactivate.title} will be hidden from active listings until
              you enable it again.
            </p>
            <div className="confirm-modal__actions">
              <Button variant="outline" onClick={() => setProductToDeactivate(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await applyStatusUpdate(productToDeactivate.id, 'inactive')
                  setProductToDeactivate(null)
                }}
              >
                Deactivate
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {productToDelete ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
          >
            <h3 id="delete-product-title">Delete Product?</h3>
            <p>
              {productToDelete.title} will be permanently removed from this store.
            </p>
            <div className="confirm-modal__actions">
              <Button variant="outline" onClick={() => setProductToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await handleDelete(productToDelete.id)
                  setProductToDelete(null)
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default Products
