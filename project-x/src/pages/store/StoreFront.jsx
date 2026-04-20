import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { createOrder, getProducts, getStoreApps, getStoreByUrl, validateCoupon } from '../../utils/api.js'
import MinimalTheme from '../../components/themes/MinimalTheme.jsx'
import ModernTheme from '../../components/themes/ModernTheme.jsx'
import KallesTheme from '../../components/themes/KallesTheme.jsx'
import Button from '../../components/ui/Button.jsx'
import { useAppContext } from '../../context/AppContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .replace(/\.projectx\.com$/i, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function getStoreSlugFromHostname() {
  if (typeof window === 'undefined') {
    return ''
  }

  const hostname = window.location.hostname.toLowerCase()
  if (!hostname.endsWith('.projectx.com')) {
    return ''
  }

  const slug = hostname.split('.')[0]
  return ['www', 'app'].includes(slug) ? '' : slug
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
  const { storeName = '' } = useParams()
  const location = useLocation()
  const { currentUser, isAppReady } = useAppContext()
  const { showToast } = useToast()
  const [store, setStore] = useState(null)
  const [products, setProducts] = useState([])
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
    return normalizeSlug(storeName) || getStoreSlugFromHostname()
  }, [storeName])

  const derivedStoreUrl = useMemo(() => {
    if (!storeSubdomain) {
      return ''
    }

    return `${storeSubdomain}.projectx.com`
  }, [storeSubdomain])

  useEffect(() => {
    async function loadStoreFront() {
      setIsLoading(true)

      try {
        if (!storeSubdomain) {
          throw new Error('Store subdomain is required')
        }

        const matchedStore = await getStoreByUrl(storeSubdomain)
        setStore(matchedStore)
        console.log('Store ID:', matchedStore.id)

        const [response, installedApps] = await Promise.all([
          getProducts(matchedStore.id),
          getStoreApps(matchedStore.id),
        ])
        console.log('Products:', response)
        setUseSeoProductUrls(
          installedApps.some((storeApp) => storeApp.appId === 'seo-helper' && storeApp.enabled),
        )
        setProducts(response.filter((product) => product.status === 'active'))
      } catch (error) {
        console.error(error)
        setStore({
          id: null,
          name: formatStoreNameFromSlug(storeName),
          url: derivedStoreUrl,
        })
        setUseSeoProductUrls(false)
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }

    loadStoreFront()
  }, [derivedStoreUrl, storeName, storeSubdomain])

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
      showToast('Invalid coupon code', 'error')
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
      showToast('Something went wrong, please try again', 'error')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  function renderTheme() {
    const themeProps = {
      products,
      store,
      onBuyNow: (product) => {
        setSelectedProduct(product)
        setAppliedCoupon(null)
      },
      useSeoProductUrls,
    }

    if (store?.themeId === 'modern') {
      return <ModernTheme {...themeProps} />
    }

    if (store?.themeId === 'kalles') {
      return <KallesTheme {...themeProps} />
    }

    return <MinimalTheme {...themeProps} />
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
        {isLoading ? <p className="public-store__empty">Loading products...</p> : renderTheme()}
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
