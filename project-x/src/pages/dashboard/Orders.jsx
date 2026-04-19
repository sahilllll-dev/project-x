import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ListViewContainer from '../../components/ListViewContainer.jsx'
import Button from '../../components/ui/Button.jsx'
import { useAppContext } from '../../context/AppContext.jsx'
import { getOrders } from '../../utils/api.js'

const orderFilters = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'paid' },
  { label: 'Pending', value: 'pending' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
]

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

function Orders() {
  const navigate = useNavigate()
  const { currentStore, markNotificationsAsRead } = useAppContext()
  const [orders, setOrders] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    markNotificationsAsRead()
  }, [markNotificationsAsRead, currentStore?.id])

  useEffect(() => {
    async function loadOrders() {
      if (!currentStore?.id) {
        setOrders([])
        setIsLoading(false)
        return
      }

      try {
        const response = await getOrders(currentStore.id)
        setOrders(response)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    loadOrders()
  }, [currentStore?.id])

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === 'all') {
      return true
    }

    return order.paymentStatus === activeFilter || order.fulfillmentStatus === activeFilter
  })

  return (
    <div className="orders-page">
      <section className="products-toolbar">
        <div className="products-toolbar__filters">
          {orderFilters.map((filter) => (
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
        isLoading={isLoading}
        isEmpty={filteredOrders.length === 0}
        loadingMessage="Loading orders..."
        emptyMessage="No orders yet"
      >
        <div className="orders-table orders-table--shopify">
          <div className="orders-table__head">
            <span>Order ID</span>
            <span>Customer</span>
            <span>Amount</span>
            <span>Payment Status</span>
            <span>Fulfillment Status</span>
            <span>Date</span>
          </div>

          {filteredOrders.map((order) => (
            <button
              className="orders-table__row"
              key={order.id}
              type="button"
              onClick={() => navigate(`/orders/${order.id}`)}
            >
              <span>#{order.id}</span>
              <span>{order.customerName || 'Guest customer'}</span>
              <span>{formatCurrency(order.finalAmount ?? order.totalAmount)}</span>
              <span className={`order-badge order-badge--${order.paymentStatus}`}>
                {order.paymentStatus}
              </span>
              <span className={`order-badge order-badge--${order.fulfillmentStatus}`}>
                {order.fulfillmentStatus}
              </span>
              <span>{formatDate(order.createdAt)}</span>
            </button>
          ))}
        </div>
      </ListViewContainer>
    </div>
  )
}

export default Orders
