import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { getCustomer } from '../utils/api.js'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function CustomerDetails() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { currentStore } = useAppContext()
  const [customer, setCustomer] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadCustomer() {
      if (!currentStore?.id) {
        setCustomer(null)
        setIsLoading(false)
        return
      }

      try {
        setCustomer(await getCustomer(id, currentStore.id))
      } catch (error) {
        console.error(error)
        setCustomer(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadCustomer()
  }, [currentStore?.id, id])

  if (isLoading) {
    return <p className="product-empty-state">Loading customer...</p>
  }

  if (!customer) {
    return <p className="product-empty-state">Customer not found.</p>
  }

  return (
    <div className="customer-details-page">
      <button className="product-editor__back" type="button" onClick={() => navigate('/customers')}>
        <span aria-hidden="true">‹</span>
        Customers
      </button>

      <div className="order-details-grid">
        <div className="order-details-main">
          <SurfaceCard className="order-details-card">
            <h3>{customer.name || 'Guest customer'}</h3>
            <p>{customer.email || 'No email added'}</p>
            <p>{customer.phone || 'No phone added'}</p>
          </SurfaceCard>

          <SurfaceCard className="order-details-card">
            <h3>Orders</h3>
            <div className="customers-orders-list">
              {(customer.orders ?? []).map((order) => (
                <button
                  className="customer-order-row"
                  key={order.id}
                  type="button"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <span>#{order.id}</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                  <span>{formatDate(order.createdAt)}</span>
                </button>
              ))}
            </div>
          </SurfaceCard>
        </div>

        <aside className="order-details-sidebar">
          <SurfaceCard className="order-details-card">
            <h3>Summary</h3>
            <div className="order-price-row">
              <span>Total orders</span>
              <strong>{customer.totalOrders}</strong>
            </div>
            <div className="order-price-row">
              <span>Total spent</span>
              <strong>{formatCurrency(customer.totalSpent)}</strong>
            </div>
            <div className="order-price-row">
              <span>Customer since</span>
              <strong>{formatDate(customer.createdAt)}</strong>
            </div>
          </SurfaceCard>
        </aside>
      </div>
    </div>
  )
}

export default CustomerDetails
