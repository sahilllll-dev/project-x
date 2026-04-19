import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ListViewContainer from '../components/ListViewContainer.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { getCustomers } from '../utils/api.js'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function Customers() {
  const navigate = useNavigate()
  const { currentStore } = useAppContext()
  const [customers, setCustomers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadCustomers() {
      if (!currentStore?.id) {
        setCustomers([])
        setIsLoading(false)
        return
      }

      try {
        setCustomers(await getCustomers(currentStore.id))
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCustomers()
  }, [currentStore?.id])

  return (
    <div className="customers-page">
      <ListViewContainer
        isLoading={isLoading}
        isEmpty={customers.length === 0}
        loadingMessage="Loading customers..."
        emptyMessage="No customers yet"
      >
        <div className="customers-table">
          <div className="customers-table__head">
            <span>Name</span>
            <span>Email</span>
            <span>Orders</span>
            <span>Total spent</span>
          </div>

          {customers.map((customer) => (
            <button
              className="customers-table__row"
              key={customer.id}
              type="button"
              onClick={() => navigate(`/customers/${customer.id}`)}
            >
              <span>{customer.name || 'Guest customer'}</span>
              <span>{customer.email || '-'}</span>
              <span>{customer.totalOrders}</span>
              <span>{formatCurrency(customer.totalSpent)}</span>
            </button>
          ))}
        </div>
      </ListViewContainer>
    </div>
  )
}

export default Customers
