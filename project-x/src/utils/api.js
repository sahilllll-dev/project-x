import { API_BASE, apiFetch, subscribeToApiActivity } from '../lib/api.js'

export { API_BASE, apiFetch, subscribeToApiActivity }

const request = apiFetch

function isMissingRouteError(error) {
  return error?.status === 404
}

function getDateKey(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function buildSalesTrendWindow(days = 7) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (days - 1 - index))

    return {
      date: getDateKey(date),
      revenue: 0,
    }
  })
}

function getOrderRevenue(order) {
  return Number(order?.finalAmount ?? order?.totalAmount ?? 0) || 0
}

function getOrderQuantity(order) {
  if (!Array.isArray(order?.products) || order.products.length === 0) {
    return 0
  }

  return order.products.reduce((total, product) => total + (Number(product?.quantity) || 1), 0)
}

function buildLegacyDashboardPayload(products, orders) {
  const normalizedProducts = Array.isArray(products) ? products : []
  const normalizedOrders = Array.isArray(orders) ? orders : []
  const sortedOrders = [...normalizedOrders].sort(
    (leftOrder, rightOrder) =>
      new Date(rightOrder?.createdAt ?? 0).getTime() - new Date(leftOrder?.createdAt ?? 0).getTime(),
  )
  const salesTrend = buildSalesTrendWindow(7)
  const salesTrendMap = new Map(salesTrend.map((entry) => [entry.date, entry]))
  const todayKey = getDateKey(new Date())
  let revenueToday = 0
  let revenue7Days = 0
  let totalRevenue = 0
  let productsSold = 0
  const topProductsMap = new Map()

  for (const order of sortedOrders) {
    const orderRevenue = getOrderRevenue(order)
    const orderDateKey = getDateKey(order?.createdAt)

    totalRevenue += orderRevenue
    productsSold += getOrderQuantity(order)

    if (orderDateKey === todayKey) {
      revenueToday += orderRevenue
    }

    const trendBucket = salesTrendMap.get(orderDateKey)

    if (trendBucket) {
      trendBucket.revenue += orderRevenue
      revenue7Days += orderRevenue
    }

    for (const product of order?.products ?? []) {
      const productKey = String(product?.productId ?? product?.id ?? product?.title ?? '').trim()

      if (!productKey) {
        continue
      }

      const currentProduct = topProductsMap.get(productKey) ?? {
        title: product?.title || 'Untitled product',
        total_sold: 0,
      }

      currentProduct.total_sold += Number(product?.quantity) || 1
      topProductsMap.set(productKey, currentProduct)
    }
  }

  const topProducts = [...topProductsMap.values()]
    .sort((leftProduct, rightProduct) => rightProduct.total_sold - leftProduct.total_sold)
    .slice(0, 5)

  const lowStock = [...normalizedProducts]
    .filter((product) => Number(product?.quantity) <= Number(product?.lowStockThreshold ?? 0))
    .sort((leftProduct, rightProduct) => Number(leftProduct?.quantity) - Number(rightProduct?.quantity))
    .slice(0, 5)
    .map((product) => ({
      id: product?.id ?? '',
      title: product?.title ?? 'Untitled product',
      quantity: Number(product?.quantity) || 0,
    }))

  return {
    metrics: {
      revenue_today: revenueToday,
      revenue_7_days: revenue7Days,
      total_orders: sortedOrders.length,
      avg_order_value: sortedOrders.length > 0 ? totalRevenue / sortedOrders.length : 0,
    },
    products_sold: productsSold,
    sales_trend: salesTrend,
    recent_orders: sortedOrders.slice(0, 5).map((order) => ({
      id: order?.id ?? '',
      total_amount: getOrderRevenue(order),
      payment_method: order?.paymentMethod ?? 'cod',
    })),
    top_products: topProducts,
    low_stock: lowStock,
  }
}

export function getProducts(storeId) {
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''
  return request(`/products${query}`)
}

export async function getStoreHasProducts(storeId) {
  if (!storeId) {
    return { hasProducts: false }
  }

  const products = await getProducts(storeId)
  return { hasProducts: products.length > 0 }
}

export function getProductBySlug(slug, storeId) {
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''
  return request(`/product/${encodeURIComponent(slug)}${query}`)
}

export function createProduct(data) {
  return request('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateProduct(id, data) {
  return request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteProduct(id, storeId) {
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''
  return request(`/products/${id}${query}`, {
    method: 'DELETE',
  })
}

export function getCategories(storeId) {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : ''
  return request(`/categories${query}`)
}

export function createCategory(data) {
  return request('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateCategory(id, data) {
  return request(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteCategory(id, storeId) {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : ''
  return request(`/categories/${id}${query}`, {
    method: 'DELETE',
  })
}

export function getOrders(storeId) {
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''
  return request(`/orders${query}`)
}

export function getOrder(id, storeId) {
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''
  return request(`/orders/${id}${query}`)
}

export function createOrder(data) {
  return request('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateOrderStatus(id, data) {
  return request(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function payOrder(id, method, storeId) {
  return request(`/orders/${id}/pay`, {
    method: 'POST',
    body: JSON.stringify({ method, storeId }),
  })
}

export function getCoupons(storeId) {
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''
  return request(`/coupons${query}`)
}

export function validateCoupon(code, storeId, orderAmount) {
  const params = new URLSearchParams({
    storeId: String(storeId),
    orderAmount: String(orderAmount),
  })

  return request(`/coupons/${encodeURIComponent(code)}?${params.toString()}`)
}

export function createCoupon(data) {
  return request('/coupons', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateCoupon(id, data) {
  return request(`/coupons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteCoupon(id, storeId) {
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''
  return request(`/coupons/${id}${query}`, {
    method: 'DELETE',
  })
}

export function getCustomers(storeId) {
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''
  return request(`/customers${query}`)
}

export function getCustomer(id, storeId) {
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''
  return request(`/customers/${id}${query}`)
}

export function createCustomer(data) {
  return request('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function deleteCustomer(id, storeId) {
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''
  return request(`/customers/${id}${query}`, {
    method: 'DELETE',
  })
}

export function createStore(data) {
  return request('/stores', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateStore(storeId, data) {
  return request(`/stores/${storeId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function updateStoreSettings(storeId, data) {
  return request(`/stores/${storeId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function getStoreById(storeId) {
  return request(`/stores/detail/${storeId}`)
}

export function getStoresByUserId(userId) {
  return request(`/stores/${userId}`)
}

export function getStores() {
  return request('/stores')
}

export function deleteStore(storeId) {
  return request(`/stores/${storeId}`, {
    method: 'DELETE',
  })
}

export function setDefaultStore(storeId) {
  return request(`/stores/${storeId}/default`, {
    method: 'PUT',
  }).then((response) => response?.store ?? response)
}

export function checkStoreSlug(slug, excludeStoreId) {
  const normalizedSlug = (slug || '').toLowerCase().trim()

  if (!normalizedSlug) {
    return Promise.reject(new Error('Invalid slug'))
  }

  const params = new URLSearchParams({ slug: normalizedSlug })

  if (excludeStoreId) {
    params.set('excludeStoreId', String(excludeStoreId))
  }

  return request(`/stores/check-slug?${params.toString()}`)
}

export function getStoreByUrl(subdomain) {
  return request(`/store-by-url/${encodeURIComponent(subdomain)}`)
}

export function getThemes() {
  return request('/themes')
}

export function updateStoreTheme(storeId, themeId) {
  return request(`/stores/${storeId}/theme`, {
    method: 'PUT',
    body: JSON.stringify({ themeId }),
  })
}

export function updateStoreThemeConfig(storeId, themeConfig) {
  return request(`/stores/${storeId}/theme-config`, {
    method: 'PUT',
    body: JSON.stringify({ themeConfig }),
  })
}

export function getActiveTheme(storeId) {
  return request(`/api/theme/${storeId}`)
}

export function saveThemeConfig(storeId, config) {
  return request('/api/theme/config', {
    method: 'POST',
    body: JSON.stringify({ storeId, config }),
  })
}

export function getStorePage(storeId, slug = '/') {
  const params = new URLSearchParams({ slug })
  return request(`/store-page/${storeId}?${params.toString()}`)
}

export function saveStorePage({ storeId, name = 'homepage', slug = '/', layout }) {
  return request('/api/page/save', {
    method: 'POST',
    body: JSON.stringify({ storeId, name, slug, layout }),
  })
}

export function getPages(storeId) {
  const params = new URLSearchParams({ store_id: String(storeId) })
  return request(`/pages?${params.toString()}`)
}

export function getPage(pageId, storeId) {
  const params = new URLSearchParams({ store_id: String(storeId) })
  return request(`/pages/${pageId}?${params.toString()}`)
}

export function getPageBySlug(slug, storeId) {
  const params = new URLSearchParams({ store_id: String(storeId) })
  return request(`/pages/slug/${encodeURIComponent(slug)}?${params.toString()}`)
}

export function createPage(data) {
  return request('/pages', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updatePage(pageId, data) {
  return request(`/pages/${pageId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deletePage(pageId, storeId) {
  const params = new URLSearchParams({ store_id: String(storeId) })
  return request(`/pages/${pageId}?${params.toString()}`, {
    method: 'DELETE',
  })
}

export async function getDashboard(storeId) {
  if (!storeId) {
    return buildLegacyDashboardPayload([], [])
  }

  const [products, orders] = await Promise.all([getProducts(storeId), getOrders(storeId)])
  return buildLegacyDashboardPayload(products, orders)
}

export function getApps() {
  return request('/apps')
}

export async function getStoreApps(storeId) {
  if (!storeId) {
    return []
  }

  try {
    return await request(`/store-apps/${encodeURIComponent(storeId)}`)
  } catch (error) {
    if (!isMissingRouteError(error)) {
      throw error
    }

    const params = new URLSearchParams({ store_id: String(storeId) })
    return request(`/apps/installed?${params.toString()}`)
  }
}

export async function getActiveApps(storeId) {
  const params = new URLSearchParams({ store_id: String(storeId) })

  try {
    return await request(`/apps/active?${params.toString()}`)
  } catch (error) {
    if (!isMissingRouteError(error)) {
      throw error
    }

    const installedApps = await getStoreApps(storeId)
    return installedApps.filter((storeApp) => storeApp?.enabled)
  }
}

export function installStoreApp(storeId, appId) {
  return request('/apps/install', {
    method: 'POST',
    body: JSON.stringify({ store_id: storeId, app_id: appId }),
  })
}

export function toggleStoreApp(storeId, appId, enabled) {
  return request('/apps/installed', {
    method: 'PATCH',
    body: JSON.stringify({ store_id: storeId, app_id: appId, enabled }),
  })
}

export function uninstallStoreApp(storeId, appId) {
  return request('/apps/uninstall', {
    method: 'POST',
    body: JSON.stringify({ store_id: storeId, app_id: appId }),
  })
}

export function getStoreAppConfig(storeId, appSlug) {
  const params = new URLSearchParams({
    store_id: String(storeId),
    app_slug: String(appSlug),
  })
  return request(`/apps/config?${params.toString()}`)
}

export function updateStoreAppConfig(storeId, appSlug, config) {
  return request('/apps/config', {
    method: 'PATCH',
    body: JSON.stringify({ store_id: storeId, app_slug: appSlug, config }),
  })
}

export function saveWhatsAppApp(storeId, data) {
  return request('/apps/whatsapp/save', {
    method: 'POST',
    body: JSON.stringify({ store_id: storeId, ...data }),
  })
}

export function loginUser(data) {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
