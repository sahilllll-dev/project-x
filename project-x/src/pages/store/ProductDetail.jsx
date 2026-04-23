import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { createOrder, getProductBySlug, getStoreById, validateCoupon } from '../../utils/api.js'
import Button from '../../components/ui/Button.jsx'
import { useAppContext } from '../../context/AppContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { setDocumentFavicon } from '../../utils/favicon.js'

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

function ProductDetail() {
  const { slug = '' } = useParams()
  const [searchParams] = useSearchParams()
  const storeId = searchParams.get('storeId')
  const { currentUser, isAppReady } = useAppContext()
  const { showToast } = useToast()
  const [product, setProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
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

  useEffect(() => {
    let isCancelled = false

    async function loadProduct() {
      setIsLoading(true)

      try {
        const nextProduct = await getProductBySlug(slug, storeId)

        if (isCancelled) {
          return
        }

        setProduct(nextProduct)

        if (nextProduct?.storeId) {
          try {
            const store = await getStoreById(nextProduct.storeId)

            if (!isCancelled) {
              setDocumentFavicon(store?.faviconUrl)
            }
          } catch (storeError) {
            console.error(storeError)

            if (!isCancelled) {
              setDocumentFavicon()
            }
          }
        } else {
          setDocumentFavicon()
        }
      } catch (error) {
        console.error(error)

        if (!isCancelled) {
          setProduct(null)
          setDocumentFavicon()
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadProduct()

    return () => {
      isCancelled = true
    }
  }, [slug, storeId])

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

  function getProductSubtotal() {
    if (!product) {
      return 0
    }

    return Number(product.discountedPrice) > 0 ? Number(product.discountedPrice) : Number(product.price)
  }

  async function handleApplyCoupon() {
    if (!product || !product.storeId || !checkoutForm.couponCode.trim()) {
      showToast('Enter a coupon code', 'error')
      return
    }

    setIsApplyingCoupon(true)

    try {
      const couponResponse = await validateCoupon(
        checkoutForm.couponCode.trim(),
        product.storeId,
        getProductSubtotal(),
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

    if (!product) {
      return
    }

    setIsPlacingOrder(true)

    try {
      const itemPrice = getProductSubtotal()
      await createOrder({
        storeId: product.storeId,
        products: [
          {
            productId: product.id,
            title: product.title,
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
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  if (isLoading) {
    return <p className="public-store__empty">Loading product...</p>
  }

  if (!product) {
    return (
      <main className="public-product-detail">
        <p className="public-store__empty">Product not found.</p>
      </main>
    )
  }

  const hasDiscount =
    Number(product.discountedPrice) > 0 && Number(product.discountedPrice) < Number(product.price)
  const isOutOfStock = Number(product.quantity) === 0

  return (
    <main className="public-product-detail">
      {isAppReady && currentUser ? (
        <Link className="public-product-detail__back" to="/dashboard">
          Go to Admin Panel
        </Link>
      ) : null}

      <section className="public-product-detail__grid">
        <div className="public-product-detail__media">
          {getProductImage(product) ? (
            <img src={getProductImage(product)} alt={product.title} />
          ) : (
            <span>Product Image</span>
          )}
        </div>

        <div className="public-product-detail__content">
          <p className="public-product-detail__eyebrow">{product.category || 'Product'}</p>
          <h1>{product.seo?.title || product.title}</h1>
          <div className="public-product-detail__price">
            {hasDiscount ? (
              <>
                <strong>{formatCurrency(product.discountedPrice)}</strong>
                <s>{formatCurrency(product.price)}</s>
              </>
            ) : (
              <strong>{formatCurrency(product.price)}</strong>
            )}
          </div>
          <p>{product.seo?.description || product.description || 'No description available.'}</p>

          {isOutOfStock ? (
            <span className="theme-product-card__badge">Out of Stock</span>
          ) : (
            <form className="checkout-form public-product-detail__checkout" onSubmit={handlePlaceOrder}>
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
              <div className="checkout-summary" aria-label="Order summary">
                <div className="checkout-summary__row">
                  <span>Subtotal</span>
                  <strong>{formatCurrency(getProductSubtotal())}</strong>
                </div>
                {appliedCoupon ? (
                  <div className="checkout-summary__row checkout-summary__row--discount">
                    <span>Discount</span>
                    <strong>-{formatCurrency(appliedCoupon.discountAmount)}</strong>
                  </div>
                ) : null}
                <div className="checkout-summary__row checkout-summary__row--total">
                  <span>Total</span>
                  <strong>{formatCurrency(appliedCoupon?.finalAmount ?? getProductSubtotal())}</strong>
                </div>
              </div>
              <button className="public-product-card__button" type="submit" disabled={isPlacingOrder}>
                {isPlacingOrder ? 'Placing Order...' : 'Buy Now'}
              </button>
            </form>
          )}

        </div>
      </section>
    </main>
  )
}

export default ProductDetail
