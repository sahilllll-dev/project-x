const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'
const API_ACTIVITY_EVENT = 'projectx:api-activity'
let activeRequestCount = 0

function emitApiActivity() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent(API_ACTIVITY_EVENT, {
      detail: {
        activeRequestCount,
        isLoading: activeRequestCount > 0,
      },
    }),
  )
}

function startApiRequest() {
  activeRequestCount += 1
  emitApiActivity()
}

function finishApiRequest() {
  activeRequestCount = Math.max(0, activeRequestCount - 1)
  emitApiActivity()
}

export function subscribeToApiActivity(listener) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  function handleApiActivity(event) {
    listener(event.detail)
  }

  window.addEventListener(API_ACTIVITY_EVENT, handleApiActivity)

  return () => {
    window.removeEventListener(API_ACTIVITY_EVENT, handleApiActivity)
  }
}

async function request(path, options = {}) {
  const headers = {
    ...(options.headers ?? {}),
  }

  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }

  startApiRequest()

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers,
      ...options,
    })

    if (!response.ok) {
      const errorText = await response.text()
      let message = 'Something went wrong'

      if (errorText) {
        try {
          const parsedError = JSON.parse(errorText)
          message = parsedError?.message || message
        } catch {
          message = errorText
        }
      }

      throw new Error(message)
    }

    if (response.status === 204) {
      return null
    }

    return response.json()
  } finally {
    finishApiRequest()
  }
}

export function getProducts(storeId) {
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''
  return request(`/products${query}`)
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

export function checkStoreSlug(slug, excludeStoreId) {
  const normalizedSlug = (slug || '').toLowerCase().trim()

  if (!normalizedSlug) {
    return Promise.reject(new Error('Invalid slug'))
  }

  const params = new URLSearchParams({ slug: normalizedSlug })

  if (excludeStoreId) {
    params.set('excludeStoreId', String(excludeStoreId))
  }

  return request(`/store/check-slug?${params.toString()}`)
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

export function getApps() {
  return request('/apps')
}

export function getStoreApps(storeId) {
  return request(`/store-apps/${storeId}`)
}

export function installStoreApp(storeId, appId) {
  return request('/store-apps/install', {
    method: 'POST',
    body: JSON.stringify({ storeId, appId }),
  })
}

export function toggleStoreApp(storeId, appId, enabled) {
  return request('/store-apps/toggle', {
    method: 'POST',
    body: JSON.stringify({ storeId, appId, enabled }),
  })
}

export function loginUser(data) {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
