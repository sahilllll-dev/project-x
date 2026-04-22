import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  createOrder,
  getPageBySlug,
  getProducts,
  getStoreApps,
  getStoreByUrl,
  getStorePage,
  validateCoupon,
} from '../../utils/api.js'
import ThemeRenderer from '../../components/themes/ThemeRenderer.jsx'
import PageRenderer from '../../components/page-builder/PageRenderer.jsx'
import Button from '../../components/ui/Button.jsx'
import { useAppContext } from '../../context/AppContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

function normalizeSubdomain(value) {
  return String(value || '')
    .trim()
    .replace(/\.projectx\.com$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function normalizePageSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getStoreSlugFromHostname() {
  if (typeof window === 'undefined') {
    return ''
  }

  const hostname = window.location.hostname.toLowerCase()
  if (!hostname.endsWith('.projectx.com')) {
    return ''
  }

  const subdomain = normalizeSubdomain(hostname.split('.')[0])
  return ['www', 'app'].includes(subdomain) ? '' : subdomain
}

function formatStoreNameFromSlug(value) {
  if (!value) {
    return 'Your Store'
  }

  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function StoreFront() {
  const params = useParams()
  const storeName = params.storeName ?? ''
  const routePagePath = params['*'] ?? ''
  const location = useLocation()
  const { currentUser, isAppReady } = useAppContext()
  const { showToast } = useToast()
  const [store, setStore] = useState(null)
  const [products, setProducts] = useState([])
  const [pageLayout, setPageLayout] = useState(null)
  const [customPage, setCustomPage] = useState(null)
  const [isCustomPageNotFound, setIsCustomPageNotFound] = useState(false)
  const [useSeoProductUrls, setUseSeoProductUrls] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [checkoutForm, setCheckoutForm] = useState({
    customerName: '',
    email: '',
    phone: '',
    address: '',
    paymentMethod: 'cod',
    couponCode: '',
  })
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)

  const storeSubdomain = useMemo(() => {
    return normalizeSubdomain(storeName) || getStoreSlugFromHostname()
  }, [storeName])

  const derivedStoreUrl = useMemo(() => {
    if (!storeSubdomain) {
      return ''
    }

    return `${storeSubdomain}.projectx.com`
  }, [storeSubdomain])

  const customPageSlug = useMemo(() => normalizePageSlug(routePagePath), [routePagePath])

  useEffect(() => {
    let isCancelled = false

    async function loadStoreFront() {
      setIsLoading(true)
      setCustomPage(null)
      setIsCustomPageNotFound(false)

      try {
        if (!storeSubdomain) {
          throw new Error('Store subdomain is required')
        }

        const matchedStore = await getStoreByUrl(storeSubdomain)
        if (isCancelled) {
          return
        }

        setStore(matchedStore)
        console.log('Store ID:', matchedStore.id)

        const [response, installedApps] = await Promise.all([
          getProducts(matchedStore.id),
          getStoreApps(matchedStore.id),
        ])
        if (isCancelled) {
          return
        }

        console.log('Products:', response)
        setUseSeoProductUrls(
          installedApps.some((storeApp) => storeApp.appId === 'seo-helper' && storeApp.enabled),
        )
        const activeProducts = response.filter((product) => product.status === 'active')
        setProducts(activeProducts.length > 0 ? activeProducts : response)

        if (customPageSlug) {
          try {
            const page = await getPageBySlug(customPageSlug, matchedStore.id)

            if (!isCancelled) {
              setCustomPage(page)
              setPageLayout(null)
            }
          } catch (pageError) {
            console.error(pageError)

            if (!isCancelled) {
              setCustomPage(null)
              setIsCustomPageNotFound(true)
              setPageLayout(null)
            }

            if (pageError.status !== 404) {
              showToast(pageError.message || 'Unable to load page', 'error')
            }
          }
        } else {
          try {
            const page = await getStorePage(matchedStore.id)

            if (!isCancelled) {
              setPageLayout(page.layout)
            }
          } catch (pageError) {
            console.error(pageError)

            if (!isCancelled) {
              setPageLayout(null)
            }
          }
        }
      } catch (error) {
        console.error(error)
        if (isCancelled) {
          return
        }

        setStore({
          id: null,
          name: formatStoreNameFromSlug(storeName),
          url: derivedStoreUrl,
        })
        setUseSeoProductUrls(false)
        setProducts([])
        setPageLayout(null)
        setCustomPage(null)
        setIsCustomPageNotFound(Boolean(customPageSlug))
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadStoreFront()

    return () => {
      isCancelled = true
    }
  }, [customPageSlug, derivedStoreUrl, showToast, storeName, storeSubdomain])

  function handleCheckoutFieldChange(event) {
    const { name, value } = event.target
    setCheckoutForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))

    if (name === 'couponCode') {
      setAppliedCoupon(null)
    }
  }

  function getSelectedProductSubtotal() {
    if (!selectedProduct) {
      return 0
    }

    return Number(selectedProduct.discountedPrice) > 0
      ? Number(selectedProduct.discountedPrice)
      : Number(selectedProduct.price)
  }

  async function handleApplyCoupon() {
    if (!selectedProduct || !selectedProduct.storeId || !checkoutForm.couponCode.trim()) {
      showToast('Enter a coupon code', 'error')
      return
    }

    setIsApplyingCoupon(true)

    try {
      const couponResponse = await validateCoupon(
        checkoutForm.couponCode.trim(),
        selectedProduct.storeId,
        getSelectedProductSubtotal(),
      )
      setAppliedCoupon(couponResponse)
      showToast('Coupon applied', 'success')
    } catch (error) {
      console.error(error)
      setAppliedCoupon(null)
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null)
    setCheckoutForm((currentForm) => ({
      ...currentForm,
      couponCode: '',
    }))
  }

  async function handlePlaceOrder(event) {
    event.preventDefault()

    if (!selectedProduct) {
      return
    }

    setIsPlacingOrder(true)

    try {
      const itemPrice = getSelectedProductSubtotal()
      await createOrder({
        storeId: selectedProduct.storeId,
        products: [
          {
            productId: selectedProduct.id,
            title: selectedProduct.title,
            quantity: 1,
            price: itemPrice,
          },
        ],
        totalAmount: itemPrice,
        discountAmount: appliedCoupon?.discountAmount ?? 0,
        finalAmount: appliedCoupon?.finalAmount ?? itemPrice,
        customerName: checkoutForm.customerName.trim(),
        customerEmail: checkoutForm.email.trim(),
        phone: checkoutForm.phone.trim(),
        shippingAddress: checkoutForm.address.trim(),
        paymentMethod: checkoutForm.paymentMethod,
        couponCode: appliedCoupon?.coupon?.code ?? '',
      })

      showToast('Order placed successfully', 'success')
      setCheckoutForm({
        customerName: '',
        email: '',
        phone: '',
        address: '',
        paymentMethod: 'cod',
        couponCode: '',
      })
      setAppliedCoupon(null)

      window.setTimeout(() => {
        setSelectedProduct(null)
      }, 1200)
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  function renderTheme() {
    if (customPageSlug) {
      if (customPage) {
        return (
          <article className="public-store-page">
            <p className="public-store-page__eyebrow">{store?.name || 'Store page'}</p>
            <h1>{customPage.title}</h1>
            <div
              className="public-store-page__content"
              dangerouslySetInnerHTML={{ __html: customPage.content || '<p>No content yet.</p>' }}
            />
          </article>
        )
      }

      if (isCustomPageNotFound) {
        return (
          <section className="public-store-page public-store-page--empty">
            <p className="public-store-page__eyebrow">{store?.name || 'Store page'}</p>
            <h1>Page not found</h1>
            <p>The page you are looking for is not available.</p>
            <Link className="public-store-page__link" to={`/store/${storeSubdomain}`}>
              Back to store
            </Link>
          </section>
        )
      }

      return null
    }

    const themeProps = {
      products,
      store,
      onBuyNow: (product) => {
        setSelectedProduct(product)
        setAppliedCoupon(null)
      },
      useSeoProductUrls,
    }

    if (pageLayout?.sections?.length) {
      return <PageRenderer layout={pageLayout} {...themeProps} />
    }

    return <ThemeRenderer themeCode={store?.themeId} config={store?.themeConfig} {...themeProps} />
  }

  return (
    <>
      <div className="public-store-shell">
        {isAppReady && currentUser ? (
          <div className="public-store-shell__topbar">
            <Link
              className="public-store__admin-link"
              to="/dashboard"
              state={{ from: location.pathname }}
            >
              Go to Admin Panel
            </Link>
          </div>
        ) : null}
        {isLoading ? (
          <p className="public-store__empty">
            {customPageSlug ? 'Loading page...' : 'Loading products...'}
          </p>
        ) : (
          renderTheme()
        )}
      </div>

      {selectedProduct ? (
        <div className="modal-backdrop" role="presentation">
          <div className="checkout-modal" role="dialog" aria-modal="true">
            <div className="checkout-modal__header">
              <h3>Checkout</h3>
              <button type="button" onClick={() => setSelectedProduct(null)}>
                Close
              </button>
            </div>

            <p className="checkout-modal__product">{selectedProduct.title}</p>
            <div className="checkout-summary" aria-label="Order summary">
              <div className="checkout-summary__row">
                <span>Subtotal</span>
                <strong>{formatCurrency(getSelectedProductSubtotal())}</strong>
              </div>
              {appliedCoupon ? (
                <div className="checkout-summary__row checkout-summary__row--discount">
                  <span>Discount</span>
                  <strong>-{formatCurrency(appliedCoupon.discountAmount)}</strong>
                </div>
              ) : null}
              <div className="checkout-summary__row checkout-summary__row--total">
                <span>Total</span>
                <strong>{formatCurrency(appliedCoupon?.finalAmount ?? getSelectedProductSubtotal())}</strong>
              </div>
            </div>

            <form className="checkout-form" onSubmit={handlePlaceOrder}>
              <div className="product-form__field">
                <label htmlFor="customerName">Name</label>
                <input
                  id="customerName"
                  name="customerName"
                  type="text"
                  value={checkoutForm.customerName}
                  onChange={handleCheckoutFieldChange}
                  required
                />
              </div>

              <div className="product-form__field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={checkoutForm.email}
                  onChange={handleCheckoutFieldChange}
                  required
                />
              </div>

              <div className="product-form__field">
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  value={checkoutForm.phone}
                  onChange={handleCheckoutFieldChange}
                  required
                />
              </div>

              <div className="product-form__field">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  name="address"
                  value={checkoutForm.address}
                  onChange={handleCheckoutFieldChange}
                  rows="4"
                  required
                />
              </div>

              <div className="product-form__field">
                <label htmlFor="paymentMethod">Payment Method</label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={checkoutForm.paymentMethod}
                  onChange={handleCheckoutFieldChange}
                >
                  <option value="cod">Cash on Delivery</option>
                  <option value="online">Fake Payment Gateway</option>
                </select>
              </div>

              <div className="product-form__field">
                <label htmlFor="couponCode">Coupon Code</label>
                <div className="checkout-coupon-row">
                  <input
                    id="couponCode"
                    name="couponCode"
                    type="text"
                    value={checkoutForm.couponCode}
                    onChange={handleCheckoutFieldChange}
                    placeholder="Enter coupon code"
                    disabled={Boolean(appliedCoupon)}
                  />
                  {appliedCoupon ? (
                    <Button type="button" variant="outline" onClick={handleRemoveCoupon}>
                      Remove
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleApplyCoupon}
                      disabled={isApplyingCoupon}
                    >
                      {isApplyingCoupon ? 'Applying...' : 'Apply'}
                    </Button>
                  )}
                </div>
              </div>

              <button
                className="public-product-card__button"
                type="submit"
                disabled={isPlacingOrder}
              >
                {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
              </button>
            </form>

          </div>
        </div>
      ) : null}
    </>
  )
}

export default StoreFront
