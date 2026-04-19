import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import OrderTimeline from '../../components/OrderTimeline.jsx'
import Button from '../../components/ui/Button.jsx'
import SurfaceCard from '../../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../../context/AppContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { getOrder, updateOrderStatus } from '../../utils/api.js'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function OrderDetails() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { currentStore } = useAppContext()
  const { showToast } = useToast()
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    async function loadOrder() {
      if (!currentStore?.id) {
        setOrder(null)
        setIsLoading(false)
        return
      }

      try {
        setOrder(await getOrder(id, currentStore.id))
      } catch (error) {
        console.error(error)
        setOrder(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadOrder()
  }, [currentStore?.id, id])

  async function handleStatusChange(field, value) {
    setIsUpdating(true)

    try {
      const nextOrder = await updateOrderStatus(id, { [field]: value })
      setOrder(nextOrder)
      showToast('Order updated', 'success')
    } catch (error) {
      console.error(error)
      showToast('Something went wrong, please try again', 'error')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return <p className="product-empty-state">Loading order...</p>
  }

  if (!order) {
    return <p className="product-empty-state">Order not found.</p>
  }

  const subtotal =
    order.subtotalAmount ??
    order.products.reduce(
      (total, product) => total + (Number(product.price) || 0) * (Number(product.quantity) || 1),
      0,
    )
  const discountAmount = Number(order.discountAmount) || 0
  const finalAmount = order.finalAmount ?? order.totalAmount

  return (
    <div className="order-details-page">
      <button className="product-editor__back" type="button" onClick={() => navigate('/orders')}>
        <span aria-hidden="true">‹</span>
        Orders
      </button>

      <div className="order-details-grid">
        <div className="order-details-main">
          <SurfaceCard className="order-details-card">
            <h3>Order #{order.id}</h3>
            <p>Placed on {formatDateTime(order.createdAt)}</p>
          </SurfaceCard>

          <SurfaceCard className="order-details-card">
            <h3>Products</h3>
            <div className="order-products-list">
              {order.products.map((product) => (
                <div className="order-product-row" key={`${product.productId}-${product.title}`}>
                  <div>
                    <strong>{product.title}</strong>
                    <p>Qty {product.quantity || 1}</p>
                  </div>
                  <span>{formatCurrency(product.price)}</span>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className="order-details-card">
            <h3>Timeline</h3>
            <OrderTimeline timeline={order.timeline} />
          </SurfaceCard>
        </div>

        <aside className="order-details-sidebar">
          <SurfaceCard className="order-details-card">
            <h3>Customer</h3>
            <p>{order.customerName || 'Guest customer'}</p>
            <p>{order.phone || 'No phone added'}</p>
            <p>{order.shippingAddress || 'No shipping address added'}</p>
          </SurfaceCard>

          <SurfaceCard className="order-details-card">
            <h3>Status</h3>
            <p>Payment method: {order.paymentMethod === 'online' ? 'Fake Payment Gateway' : 'Cash on Delivery'}</p>
            <label>
              Payment status
              <select
                value={order.paymentStatus}
                disabled={isUpdating}
                onChange={(event) => handleStatusChange('paymentStatus', event.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <label>
              Fulfillment status
              <select
                value={order.fulfillmentStatus}
                disabled={isUpdating}
                onChange={(event) => handleStatusChange('fulfillmentStatus', event.target.value)}
              >
                <option value="unfulfilled">Unfulfilled</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
              </select>
            </label>
            <label>
              Order status
              <select
                value={order.orderStatus}
                disabled={isUpdating}
                onChange={(event) => handleStatusChange('orderStatus', event.target.value)}
              >
                <option value="open">Open</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </SurfaceCard>

          <SurfaceCard className="order-details-card">
            <h3>Price breakdown</h3>
            <div className="order-price-row">
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            {order.couponCode ? (
              <div className="order-price-row order-price-row--coupon">
                <span>Coupon used</span>
                <strong>{order.couponCode}</strong>
              </div>
            ) : null}
            {discountAmount > 0 ? (
              <div className="order-price-row order-price-row--discount">
                <span>Discount amount</span>
                <strong>-{formatCurrency(discountAmount)}</strong>
              </div>
            ) : null}
            <div className="order-price-row">
              <span>Total</span>
              <strong>{formatCurrency(finalAmount)}</strong>
            </div>
          </SurfaceCard>
        </aside>
      </div>
    </div>
  )
}

export default OrderDetails
