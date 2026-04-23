import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  Boxes,
  CreditCard,
  Package,
  ShoppingCart,
} from 'lucide-react'
import DashboardCard from '../components/dashboard/DashboardCard.jsx'
import SalesTrendChart from '../components/dashboard/SalesTrendChart.jsx'
import AddProductOnboarding from '../components/onboarding/AddProductOnboarding.jsx'
import Button from '../components/ui/Button.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { getDashboard, getStoreHasProducts } from '../utils/api.js'

const EMPTY_DASHBOARD = Object.freeze({
  metrics: {
    revenueToday: 0,
    revenue7Days: 0,
    totalOrders: 0,
    avgOrderValue: 0,
  },
  productsSold: 0,
  salesTrend: [],
  recentOrders: [],
  topProducts: [],
  lowStock: [],
})

const metricCards = [
  {
    key: 'revenueToday',
    label: 'Revenue Today',
    icon: ArrowUpRight,
    accentClassName: 'bg-emerald-500/15 text-emerald-300',
    type: 'currency',
  },
  {
    key: 'revenue7Days',
    label: 'Last 7 Days Revenue',
    icon: Activity,
    accentClassName: 'bg-sky-500/15 text-sky-300',
    type: 'currency',
  },
  {
    key: 'totalOrders',
    label: 'Total Orders',
    icon: ShoppingCart,
    accentClassName: 'bg-violet-500/15 text-violet-300',
    type: 'number',
  },
  {
    key: 'avgOrderValue',
    label: 'Avg Order Value',
    icon: CreditCard,
    accentClassName: 'bg-amber-500/15 text-amber-300',
    type: 'currency',
  },
  {
    key: 'productsSold',
    label: 'Products Sold',
    icon: Boxes,
    accentClassName: 'bg-rose-500/15 text-rose-300',
    type: 'number',
  },
]

function formatCurrency(value, currency = 'INR', compact = false) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 2,
  }).format(Number(value) || 0)
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function formatMetricValue(value, type, currency) {
  if (type === 'currency') {
    return formatCurrency(value, currency, true)
  }

  return formatNumber(value)
}

function formatPaymentMethod(value) {
  if (!value) {
    return 'Unknown'
  }

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function normalizeDashboardData(payload) {
  const metrics = payload?.metrics ?? {}

  return {
    metrics: {
      revenueToday: Number(metrics.revenue_today) || 0,
      revenue7Days: Number(metrics.revenue_7_days) || 0,
      totalOrders: Number(metrics.total_orders) || 0,
      avgOrderValue: Number(metrics.avg_order_value) || 0,
    },
    productsSold: Number(payload?.products_sold) || 0,
    salesTrend: Array.isArray(payload?.sales_trend)
      ? payload.sales_trend.map((entry) => ({
          date: entry?.date ?? '',
          revenue: Number(entry?.revenue) || 0,
        }))
      : [],
    recentOrders: Array.isArray(payload?.recent_orders)
      ? payload.recent_orders.map((order) => ({
          id: order?.id ?? '',
          totalAmount: Number(order?.total_amount) || 0,
          paymentMethod: order?.payment_method ?? '',
        }))
      : [],
    topProducts: Array.isArray(payload?.top_products)
      ? payload.top_products.map((product) => ({
          title: product?.title ?? 'Untitled product',
          totalSold: Number(product?.total_sold) || 0,
        }))
      : [],
    lowStock: Array.isArray(payload?.low_stock)
      ? payload.low_stock.map((product) => ({
          id: product?.id ?? '',
          title: product?.title ?? 'Untitled product',
          quantity: Number(product?.quantity) || 0,
        }))
      : [],
  }
}

function LoadingCard() {
  return (
    <DashboardCard className="animate-pulse space-y-4">
      <div className="h-5 w-24 rounded-full bg-white/8" />
      <div className="h-9 w-28 rounded-full bg-white/10" />
      <div className="h-4 w-32 rounded-full bg-white/8" />
    </DashboardCard>
  )
}

function EmptyState({ title = 'No data', description = 'Nothing to show yet.' }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0F172A]/55 px-6 text-center">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-200">{title}</p>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
    </div>
  )
}

function MetricCard({ accentClassName, icon, label, type, value, currency }) {
  const IconComponent = icon

  return (
    <DashboardCard className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {formatMetricValue(value, type, currency)}
          </p>
        </div>
        <span
          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${accentClassName}`}
        >
          <IconComponent className="h-5 w-5" />
        </span>
      </div>
      <p className="text-xs text-slate-500">Live snapshot from your current store.</p>
    </DashboardCard>
  )
}

function DashboardContent({ currentStore, currentStoreId, currency, storeSwitchVersion }) {
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(
    async (signal) => {
      if (!currentStoreId) {
        setDashboard(EMPTY_DASHBOARD)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const payload = await getDashboard(currentStoreId)

        if (!signal.aborted) {
          setDashboard(normalizeDashboardData(payload))
        }
      } catch (fetchError) {
        if (fetchError.name === 'AbortError' || signal.aborted) {
          return
        }

        console.error(fetchError)
        setDashboard(EMPTY_DASHBOARD)
        setError(fetchError.message || 'Failed to load dashboard')
      } finally {
        if (!signal.aborted) {
          setIsLoading(false)
        }
      }
    },
    [currentStoreId],
  )

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      loadDashboard(controller.signal)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [loadDashboard, storeSwitchVersion])

  const metricValues = useMemo(
    () => ({
      revenueToday: dashboard.metrics.revenueToday,
      revenue7Days: dashboard.metrics.revenue7Days,
      totalOrders: dashboard.metrics.totalOrders,
      avgOrderValue: dashboard.metrics.avgOrderValue,
      productsSold: dashboard.productsSold,
    }),
    [dashboard],
  )

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <section className="rounded-[28px] border border-white/5 bg-[#0B0F14] p-4 text-slate-100 shadow-[0_30px_90px_rgba(2,6,23,0.42)] sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 border-b border-white/6 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-300/80">
              Dashboard
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {currentStore?.name || 'Store overview'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Revenue, orders, inventory, and product performance for your current storefront.
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
              Current Currency
            </p>
            <p className="mt-2 text-lg font-semibold text-white">{currency}</p>
          </div>
        </div>

        {error ? (
          <DashboardCard className="mb-6 flex flex-col gap-4 border-rose-500/30 bg-rose-500/10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-rose-200">Dashboard unavailable</p>
              <p className="mt-1 text-sm text-rose-100/80">{error}</p>
            </div>
            <Button
              className="!bg-rose-500 !text-white hover:!bg-rose-400"
              onClick={() => {
                const controller = new AbortController()
                loadDashboard(controller.signal)
              }}
            >
              Retry
            </Button>
          </DashboardCard>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {isLoading
            ? Array.from({ length: 5 }).map((_, index) => <LoadingCard key={index} />)
            : metricCards.map((card) => (
                <MetricCard
                  accentClassName={card.accentClassName}
                  currency={currency}
                  icon={card.icon}
                  key={card.key}
                  label={card.label}
                  type={card.type}
                  value={metricValues[card.key]}
                />
              ))}
        </div>

        <div className="mt-6">
          <DashboardCard className="p-0">
            <div className="flex flex-col gap-2 border-b border-white/6 px-5 py-5 sm:px-6">
              <p className="text-sm font-medium text-slate-400">Sales Trend</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-2xl font-semibold text-white">
                    {formatCurrency(dashboard.metrics.revenue7Days, currency)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Last 7 days revenue, refreshed from your latest orders.
                  </p>
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  7 day window
                </span>
              </div>
            </div>
            <div className="px-2 pb-2 pt-4 sm:px-4 sm:pb-4">
              {isLoading ? (
                <div className="h-80 animate-pulse rounded-2xl bg-white/[0.04]" />
              ) : (
                <SalesTrendChart currency={currency} data={dashboard.salesTrend} />
              )}
            </div>
          </DashboardCard>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <DashboardCard className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-400">Recent Orders</p>
                <p className="mt-1 text-sm text-slate-500">
                  Most recent payment events from your store.
                </p>
              </div>
              <ShoppingCart className="h-5 w-5 text-slate-500" />
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    className="h-20 animate-pulse rounded-2xl bg-white/[0.04]"
                    key={index}
                  />
                ))}
              </div>
            ) : dashboard.recentOrders.length === 0 ? (
              <EmptyState
                description="Your first orders will appear here."
                title="No data"
              />
            ) : (
              <div className="space-y-3">
                {dashboard.recentOrders.map((order) => (
                  <div
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/6 bg-[#0F172A] px-4 py-4"
                    key={order.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        #{order.id}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {formatPaymentMethod(order.paymentMethod)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-100">
                      {formatCurrency(order.totalAmount, currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>

          <div className="space-y-4">
            <DashboardCard className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-400">Top Products</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Best-selling catalog items by quantity sold.
                  </p>
                </div>
                <Package className="h-5 w-5 text-slate-500" />
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      className="h-16 animate-pulse rounded-2xl bg-white/[0.04]"
                      key={index}
                    />
                  ))}
                </div>
              ) : dashboard.topProducts.length === 0 ? (
                <EmptyState
                  description="Top performers will show after your first sales."
                  title="No data"
                />
              ) : (
                <div className="space-y-3">
                  {dashboard.topProducts.map((product, index) => (
                    <div
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/6 bg-[#0F172A] px-4 py-4"
                      key={`${product.title}-${index}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {product.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {formatNumber(product.totalSold)} sold
                        </p>
                      </div>
                      <span className="rounded-full bg-sky-500/12 px-3 py-1 text-xs font-semibold text-sky-300">
                        {formatNumber(product.totalSold)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </DashboardCard>

            <DashboardCard className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-400">Low Stock</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Products nearing or below your stock threshold.
                  </p>
                </div>
                <Boxes className="h-5 w-5 text-slate-500" />
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      className="h-16 animate-pulse rounded-2xl bg-white/[0.04]"
                      key={index}
                    />
                  ))}
                </div>
              ) : dashboard.lowStock.length === 0 ? (
                <EmptyState
                  description="All tracked products are above their low-stock threshold."
                  title="No low stock products"
                />
              ) : (
                <div className="space-y-3">
                  {dashboard.lowStock.map((product) => (
                    <div
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/6 bg-[#0F172A] px-4 py-4"
                      key={product.id}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {product.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          Inventory alert
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-500/12 px-3 py-1 text-xs font-semibold text-amber-300">
                        {formatNumber(product.quantity)} left
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </DashboardCard>
          </div>
        </div>
      </section>
    </div>
  )
}

function DashboardLoader() {
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <section className="rounded-[28px] border border-white/5 bg-[#0B0F14] p-4 text-slate-100 shadow-[0_30px_90px_rgba(2,6,23,0.42)] sm:p-6 lg:p-8">
        <div className="mb-6 space-y-3 border-b border-white/6 pb-6">
          <div className="h-4 w-28 animate-pulse rounded-full bg-white/[0.08]" />
          <div className="h-10 w-72 animate-pulse rounded-full bg-white/[0.1]" />
          <div className="h-5 w-full max-w-xl animate-pulse rounded-full bg-white/[0.08]" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <LoadingCard key={index} />
          ))}
        </div>

        <div className="mt-6 h-96 animate-pulse rounded-3xl bg-white/[0.04]" />
      </section>
    </div>
  )
}

function Dashboard() {
  const { currentStore, isStoreReady, storeSwitchVersion } = useAppContext()
  const [hasProducts, setHasProducts] = useState(null)
  const [isCheckingProducts, setIsCheckingProducts] = useState(true)
  const [gateError, setGateError] = useState('')
  const currentStoreId = currentStore?.id ?? ''
  const currency = currentStore?.currency ?? 'INR'

  const checkHasProducts = useCallback(async () => {
    if (!currentStoreId) {
      setHasProducts(false)
      setIsCheckingProducts(false)
      return
    }

    setIsCheckingProducts(true)
    setGateError('')

    try {
      const response = await getStoreHasProducts(currentStoreId)
      setHasProducts(Boolean(response?.hasProducts))
    } catch (error) {
      console.error(error)
      setHasProducts(null)
      setGateError(error.message || 'Failed to verify store products')
    } finally {
      setIsCheckingProducts(false)
    }
  }, [currentStoreId])

  useEffect(() => {
    if (!isStoreReady) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      checkHasProducts()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [checkHasProducts, isStoreReady, storeSwitchVersion])

  if (!isStoreReady || isCheckingProducts) {
    return <DashboardLoader />
  }

  if (gateError) {
    return (
      <div className="mx-auto w-full max-w-[960px]">
        <DashboardCard className="flex flex-col gap-4 border-rose-500/30 bg-rose-500/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-rose-200">Dashboard unavailable</p>
            <p className="mt-1 text-sm text-rose-100/80">{gateError}</p>
          </div>
          <Button
            className="!bg-rose-500 !text-white hover:!bg-rose-400"
            onClick={checkHasProducts}
          >
            Retry
          </Button>
        </DashboardCard>
      </div>
    )
  }

  if (!hasProducts) {
    return <AddProductOnboarding />
  }

  return (
    <DashboardContent
      currency={currency}
      currentStore={currentStore}
      currentStoreId={currentStoreId}
      storeSwitchVersion={storeSwitchVersion}
    />
  )
}

export default Dashboard
