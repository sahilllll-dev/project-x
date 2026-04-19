const path = require('node:path')
const fs = require('node:fs')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const nodemailer = require('nodemailer')
const { createClient } = require('@supabase/supabase-js')
const { readData, writeData } = require('./utils/fileDb')

function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env')

  if (!fs.existsSync(envPath)) {
    return
  }

  const entries = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)

  entries.forEach((entry) => {
    const trimmedEntry = entry.trim()

    if (!trimmedEntry || trimmedEntry.startsWith('#') || !trimmedEntry.includes('=')) {
      return
    }

    const separatorIndex = trimmedEntry.indexOf('=')
    const key = trimmedEntry.slice(0, separatorIndex).trim()
    const value = trimmedEntry.slice(separatorIndex + 1).trim()

    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  })
}

loadLocalEnv()

const app = express()
const PORT = process.env.PORT || 5001
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const productsFile = path.join(__dirname, 'data', 'products.json')
const ordersFile = path.join(__dirname, 'data', 'orders.json')
const orderTimelineFile = path.join(__dirname, 'data', 'orderTimeline.json')
const customersFile = path.join(__dirname, 'data', 'customers.json')
const couponsFile = path.join(__dirname, 'data', 'coupons.json')
const usersFile = path.join(__dirname, 'data', 'users.json')
const storesFile = path.join(__dirname, 'data', 'stores.json')
const storeAppsFile = path.join(__dirname, 'data', 'storeApps.json')
const defaultThemeConfig = {
  heroTitle: 'Welcome to your store',
  showBrands: true,
  primaryColor: '#111111',
}
const defaultLowStockThreshold = 5

const apps = [
  {
    id: 'seo-helper',
    name: 'SEO Helper',
    description: 'Optimize your product SEO and Google visibility',
    icon: 'seo-icon',
    isActive: true,
  },
]

function getCurrency(value) {
  return `INR ${Number(value || 0).toLocaleString('en-IN')}`
}

function getStoreOwnerEmail(storeId) {
  const stores = readData(storesFile)
  const users = readData(usersFile)
  const store = stores.find((entry) => String(entry.id) === String(storeId))
  const owner = users.find((user) => String(user.id) === String(store?.userId))

  return (
    store?.ownerEmail ||
    owner?.email ||
    process.env.ORDER_NOTIFICATION_EMAIL ||
    process.env.SMTP_USER ||
    ''
  )
}

function createMailTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    })
  }

  return nodemailer.createTransport({ jsonTransport: true })
}

function getOrderNotificationBody(order) {
  const productLines = order.products
    .map((product) => {
      const quantity = Number(product.quantity) || 1
      return `- ${product.title} x ${quantity} (${getCurrency(product.price)})`
    })
    .join('\n')

  return [
    `Order ID: #${order.id}`,
    `Total: ${getCurrency(order.totalAmount)}`,
    order.couponCode ? `Coupon: ${order.couponCode}` : '',
    order.discountAmount ? `Discount: ${getCurrency(order.discountAmount)}` : '',
    '',
    'Products:',
    productLines || '- No products',
    '',
    'Customer:',
    `Name: ${order.customerName || 'Guest customer'}`,
    `Email: ${order.customerEmail || 'Not provided'}`,
    `Phone: ${order.phone || 'Not provided'}`,
    `Shipping address: ${order.shippingAddress || 'Not provided'}`,
  ]
    .filter((line) => line !== '')
    .join('\n')
}

const notificationChannels = {
  async email(order) {
    const recipient = getStoreOwnerEmail(order.storeId)

    if (!recipient) {
      return { skipped: true, reason: 'No recipient configured' }
    }

    const transporter = createMailTransport()

    return transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'Project X <no-reply@projectx.local>',
      to: recipient,
      subject: 'New order received',
      text: getOrderNotificationBody(order),
    })
  },
  async sms() {
    return { skipped: true, reason: 'SMS notifications are not configured yet' }
  },
  async whatsapp() {
    return { skipped: true, reason: 'WhatsApp notifications are not configured yet' }
  },
}

async function notifyNewOrder(order) {
  try {
    await notificationChannels.email(order)
  } catch (error) {
    console.error('Failed to send order email notification', error)
  }
}

const themes = [
  {
    id: 'minimal',
    name: 'Minimal Store',
    description: 'Clean and simple layout',
  },
  {
    id: 'modern',
    name: 'Modern Store',
    description: 'Bold and product-focused layout',
  },
  {
    id: 'kalles',
    name: 'Kalles Style',
    description: 'Modern fashion eCommerce layout with hero banners and product grid',
  },
]

function getDefaultProductSeo(product) {
  return {
    title: product.title ?? '',
    description: product.description ?? '',
    slug: String(product.id),
    ...(product.seo ?? {}),
  }
}

function getLowStockThreshold(value) {
  const threshold = Number(value)

  if (!Number.isFinite(threshold) || threshold < 0) {
    return defaultLowStockThreshold
  }

  return threshold
}

function normalizeProduct(product) {
  return {
    ...product,
    quantity: Number(product.quantity) || 0,
    lowStockThreshold:
      product.lowStockThreshold === undefined || product.lowStockThreshold === ''
        ? defaultLowStockThreshold
        : getLowStockThreshold(product.lowStockThreshold),
    seo: getDefaultProductSeo(product),
  }
}

function normalizeOrder(order) {
  const products = Array.isArray(order.products)
    ? order.products
    : [
        {
          productId: order.productId,
          title: order.productTitle,
          quantity: 1,
          price: Number(order.price) || 0,
        },
      ].filter((product) => product.productId || product.title)

  const totalAmount =
    order.totalAmount ??
    products.reduce(
      (total, product) => total + (Number(product.price) || 0) * (Number(product.quantity) || 1),
      0,
    )

  return {
    id: order.id,
    storeId: order.storeId,
    customerId: order.customerId ?? null,
    customerName: order.customerName ?? '',
    phone: order.phone ?? '',
    products,
    totalAmount,
    subtotalAmount: order.subtotalAmount ?? totalAmount,
    discountAmount: order.discountAmount ?? 0,
    finalAmount: order.finalAmount ?? totalAmount,
    couponCode: order.couponCode ?? '',
    paymentMethod: order.paymentMethod ?? 'cod',
    paymentStatus: order.paymentStatus ?? 'pending',
    fulfillmentStatus: order.fulfillmentStatus ?? 'unfulfilled',
    orderStatus: order.orderStatus ?? (order.status === 'cancelled' ? 'cancelled' : 'open'),
    shippingAddress: order.shippingAddress ?? order.address ?? '',
    createdAt: order.createdAt ?? Date.now(),
  }
}

function getStatusTimelineMessage(nextStatus) {
  const statusMessages = {
    paid: 'Payment received',
    failed: 'Payment failed',
    pending: 'Payment pending',
    processing: 'Order processing',
    shipped: 'Order shipped',
    delivered: 'Order delivered',
    unfulfilled: 'Order unfulfilled',
    open: 'Order opened',
    completed: 'Order completed',
    cancelled: 'Order cancelled',
  }

  return statusMessages[nextStatus] ?? `Status updated to ${nextStatus}`
}

function createOrderTimelineEntry(orderId, status, message) {
  const timeline = readData(orderTimelineFile)
  const entry = {
    id: Date.now(),
    orderId,
    status,
    message,
    createdAt: Date.now(),
  }

  timeline.push(entry)
  writeData(orderTimelineFile, timeline)
  return entry
}

function normalizeCouponCode(code) {
  return String(code ?? '').trim().toUpperCase()
}

function calculateCouponDiscount(coupon, orderAmount) {
  const amount = Number(orderAmount) || 0
  let discountAmount = 0

  if (coupon.type === 'percentage') {
    discountAmount = (amount * Number(coupon.value)) / 100

    if (coupon.maxDiscount) {
      discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount))
    }
  }

  if (coupon.type === 'fixed') {
    discountAmount = Number(coupon.value)
  }

  discountAmount = Math.min(discountAmount, amount)

  return {
    discountAmount,
    finalAmount: amount - discountAmount,
  }
}

function validateCouponForOrder({ storeId, code, orderAmount }) {
  const coupons = readData(couponsFile)
  const normalizedCode = normalizeCouponCode(code)
  const coupon = coupons.find(
    (entry) =>
      String(entry.storeId) === String(storeId) &&
      normalizeCouponCode(entry.code) === normalizedCode,
  )

  if (!coupon) {
    return { isValid: false, message: 'Coupon not found' }
  }

  if (coupon.isActive !== true) {
    return { isValid: false, message: 'Coupon is inactive' }
  }

  if (Number(coupon.expiresAt) <= Date.now()) {
    return { isValid: false, message: 'Coupon has expired' }
  }

  if (coupon.usageLimit && Number(coupon.usedCount || 0) >= Number(coupon.usageLimit)) {
    return { isValid: false, message: 'Coupon usage limit reached' }
  }

  if (coupon.minOrderValue && Number(orderAmount) < Number(coupon.minOrderValue)) {
    return { isValid: false, message: 'Minimum order value not reached' }
  }

  return {
    isValid: true,
    coupon,
    ...calculateCouponDiscount(coupon, orderAmount),
  }
}

function upsertCustomerForOrder(order) {
  const customers = readData(customersFile)
  const normalizedEmail = String(order.customerEmail ?? order.email ?? '').trim().toLowerCase()
  const totalAmount = Number(order.totalAmount) || 0

  if (!normalizedEmail) {
    return null
  }

  const customerIndex = customers.findIndex(
    (customer) =>
      String(customer.storeId) === String(order.storeId) &&
      String(customer.email).trim().toLowerCase() === normalizedEmail,
  )

  if (customerIndex !== -1) {
    customers[customerIndex] = {
      ...customers[customerIndex],
      name: order.customerName || customers[customerIndex].name,
      phone: order.phone || customers[customerIndex].phone,
      totalOrders: Number(customers[customerIndex].totalOrders || 0) + 1,
      totalSpent: Number(customers[customerIndex].totalSpent || 0) + totalAmount,
    }

    writeData(customersFile, customers)
    return customers[customerIndex]
  }

  const newCustomer = {
    id: Date.now(),
    storeId: order.storeId,
    name: order.customerName ?? '',
    email: normalizedEmail,
    phone: order.phone ?? '',
    totalOrders: 1,
    totalSpent: totalAmount,
    createdAt: Date.now(),
  }

  customers.push(newCustomer)
  writeData(customersFile, customers)
  return newCustomer
}

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
]

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like Postman or mobile apps)
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    } else {
      console.log('❌ Blocked by CORS:', origin)
      return callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
app.use((req, res, next) => {
  console.log(`Incoming request from origin: ${req.headers.origin}`)
  next()
})
app.use(express.json({ limit: '5mb' }))
app.use(bodyParser.json({ limit: '5mb' }))

app.get('/products', (req, res) => {
  const { storeId } = req.query
  const products = readData(productsFile)
  const normalizedProducts = products.map(normalizeProduct)

  if (!storeId) {
    res.json(normalizedProducts)
    return
  }

  res.json(normalizedProducts.filter((product) => String(product.storeId) === String(storeId)))
})

app.get('/product/:slug', (req, res) => {
  const { slug } = req.params
  const products = readData(productsFile)
  const product = products.find((entry) => {
    const seo = getDefaultProductSeo(entry)
    return String(seo.slug) === String(slug) || String(entry.id) === String(slug)
  })

  if (!product) {
    res.status(404).json({ message: 'Product not found' })
    return
  }

  res.json({
    ...normalizeProduct(product),
  })
})

app.post('/products', (req, res) => {
  if (!req.body.storeId) {
    res.status(400).json({ message: 'storeId is required' })
    return
  }

  const products = readData(productsFile)
  const productId = Date.now()
  const newProduct = {
    id: productId,
    storeId: req.body.storeId,
    title: req.body.title,
    description: req.body.description ?? '',
    category: req.body.category ?? '',
    price: req.body.price,
    discountedPrice: req.body.discountedPrice ?? 0,
    status: req.body.status,
    quantity: Number(req.body.quantity) || 0,
    lowStockThreshold:
      req.body.lowStockThreshold === undefined || req.body.lowStockThreshold === ''
        ? defaultLowStockThreshold
        : getLowStockThreshold(req.body.lowStockThreshold),
    sku: req.body.sku ?? '',
    image: req.body.image ?? '',
    seo: {
      title: req.body.seo?.title ?? '',
      description: req.body.seo?.description ?? '',
      slug: req.body.seo?.slug || String(productId),
    },
    createdAt: Date.now(),
  }

  products.push(newProduct)
  writeData(productsFile, products)
  res.status(201).json(newProduct)
})

app.put('/products/:id', (req, res) => {
  const productId = Number(req.params.id)
  const products = readData(productsFile)
  const productIndex = products.findIndex((product) => product.id === productId)

  if (productIndex === -1) {
    res.status(404).json({ message: 'Product not found' })
    return
  }

  products[productIndex] = {
    ...products[productIndex],
    ...req.body,
    id: productId,
    quantity:
      req.body.quantity === undefined
        ? Number(products[productIndex].quantity) || 0
        : Number(req.body.quantity) || 0,
    lowStockThreshold:
      req.body.lowStockThreshold === undefined || req.body.lowStockThreshold === ''
        ? getLowStockThreshold(products[productIndex].lowStockThreshold ?? defaultLowStockThreshold)
        : getLowStockThreshold(req.body.lowStockThreshold),
    seo: {
      ...getDefaultProductSeo(products[productIndex]),
      ...(req.body.seo ?? {}),
      slug: req.body.seo?.slug || products[productIndex].seo?.slug || String(productId),
    },
  }

  writeData(productsFile, products)
  res.json(products[productIndex])
})

app.delete('/products/:id', (req, res) => {
  const productId = Number(req.params.id)
  const products = readData(productsFile)
  const filteredProducts = products.filter((product) => product.id !== productId)

  if (filteredProducts.length === products.length) {
    res.status(404).json({ message: 'Product not found' })
    return
  }

  writeData(productsFile, filteredProducts)
  res.json({ message: 'Product deleted successfully' })
})

app.post('/coupons', (req, res) => {
  const {
    storeId,
    type,
    value,
    minOrderValue,
    maxDiscount,
    usageLimit,
    expiresAt,
    isActive = true,
  } = req.body
  const code = normalizeCouponCode(req.body.code)

  if (!storeId || !code || !type || !expiresAt) {
    res.status(400).json({ message: 'storeId, code, type, and expiresAt are required' })
    return
  }

  if (!['percentage', 'fixed'].includes(type)) {
    res.status(400).json({ message: 'Invalid coupon type' })
    return
  }

  if (Number(value) <= 0 || (type === 'percentage' && Number(value) > 100)) {
    res.status(400).json({ message: 'Invalid coupon value' })
    return
  }

  if (Number(expiresAt) <= Date.now()) {
    res.status(400).json({ message: 'Coupon expiry must be in the future' })
    return
  }

  const coupons = readData(couponsFile)
  const codeExists = coupons.some(
    (coupon) =>
      String(coupon.storeId) === String(storeId) && normalizeCouponCode(coupon.code) === code,
  )

  if (codeExists) {
    res.status(409).json({ message: 'Coupon code already exists' })
    return
  }

  const newCoupon = {
    id: Date.now(),
    storeId,
    code,
    type,
    value: Number(value),
    minOrderValue: minOrderValue ? Number(minOrderValue) : 0,
    maxDiscount: maxDiscount ? Number(maxDiscount) : 0,
    usageLimit: usageLimit ? Number(usageLimit) : 0,
    usedCount: 0,
    expiresAt: Number(expiresAt),
    isActive: Boolean(isActive),
    createdAt: Date.now(),
  }

  coupons.push(newCoupon)
  writeData(couponsFile, coupons)
  res.status(201).json(newCoupon)
})

app.get('/coupons', (req, res) => {
  const { storeId } = req.query
  const coupons = readData(couponsFile)

  if (!storeId) {
    res.json(coupons)
    return
  }

  res.json(coupons.filter((coupon) => String(coupon.storeId) === String(storeId)))
})

app.get('/coupons/:code', (req, res) => {
  const { storeId, orderAmount = 0 } = req.query

  if (!storeId) {
    res.status(400).json({ message: 'storeId is required' })
    return
  }

  const validation = validateCouponForOrder({
    storeId,
    code: req.params.code,
    orderAmount: Number(orderAmount),
  })

  if (!validation.isValid) {
    res.status(400).json({ message: validation.message })
    return
  }

  res.json({
    coupon: validation.coupon,
    discountAmount: validation.discountAmount,
    finalAmount: validation.finalAmount,
  })
})

app.put('/coupons/:id', (req, res) => {
  const couponId = Number(req.params.id)
  const coupons = readData(couponsFile)
  const couponIndex = coupons.findIndex((coupon) => coupon.id === couponId)

  if (couponIndex === -1) {
    res.status(404).json({ message: 'Coupon not found' })
    return
  }

  const nextCoupon = {
    ...coupons[couponIndex],
    ...req.body,
    id: couponId,
    code: req.body.code ? normalizeCouponCode(req.body.code) : coupons[couponIndex].code,
  }

  if (Number(nextCoupon.value) <= 0 || (nextCoupon.type === 'percentage' && Number(nextCoupon.value) > 100)) {
    res.status(400).json({ message: 'Invalid coupon value' })
    return
  }

  if (Number(nextCoupon.expiresAt) <= Date.now()) {
    res.status(400).json({ message: 'Coupon expiry must be in the future' })
    return
  }

  const codeExists = coupons.some(
    (coupon) =>
      coupon.id !== couponId &&
      String(coupon.storeId) === String(nextCoupon.storeId) &&
      normalizeCouponCode(coupon.code) === normalizeCouponCode(nextCoupon.code),
  )

  if (codeExists) {
    res.status(409).json({ message: 'Coupon code already exists' })
    return
  }

  coupons[couponIndex] = {
    ...nextCoupon,
    value: Number(nextCoupon.value),
    minOrderValue: nextCoupon.minOrderValue ? Number(nextCoupon.minOrderValue) : 0,
    maxDiscount: nextCoupon.maxDiscount ? Number(nextCoupon.maxDiscount) : 0,
    usageLimit: nextCoupon.usageLimit ? Number(nextCoupon.usageLimit) : 0,
    usedCount: Number(nextCoupon.usedCount || 0),
    expiresAt: Number(nextCoupon.expiresAt),
    isActive: Boolean(nextCoupon.isActive),
  }

  writeData(couponsFile, coupons)
  res.json(coupons[couponIndex])
})

app.delete('/coupons/:id', (req, res) => {
  const couponId = Number(req.params.id)
  const coupons = readData(couponsFile)
  const filteredCoupons = coupons.filter((coupon) => coupon.id !== couponId)

  if (filteredCoupons.length === coupons.length) {
    res.status(404).json({ message: 'Coupon not found' })
    return
  }

  writeData(couponsFile, filteredCoupons)
  res.json({ message: 'Coupon deleted successfully' })
})

app.get('/orders', (req, res) => {
  const { storeId } = req.query
  const orders = readData(ordersFile).map(normalizeOrder)

  if (!storeId) {
    res.json(orders)
    return
  }

  res.json(orders.filter((order) => String(order.storeId) === String(storeId)))
})

app.get('/orders/:id', (req, res) => {
  const orderId = Number(req.params.id)
  const { storeId } = req.query
  const orders = readData(ordersFile).map(normalizeOrder)
  const order = orders.find(
    (entry) =>
      entry.id === orderId && (!storeId || String(entry.storeId) === String(storeId)),
  )

  if (!order) {
    res.status(404).json({ message: 'Order not found' })
    return
  }

  const timeline = readData(orderTimelineFile).filter((entry) => entry.orderId === orderId)

  res.json({
    ...order,
    timeline,
  })
})

app.post('/orders', (req, res) => {
  if (!req.body.storeId) {
    res.status(400).json({ message: 'storeId is required' })
    return
  }

  const orders = readData(ordersFile)
  const orderId = Date.now()
  const products = Array.isArray(req.body.products)
    ? req.body.products
    : [
        {
          productId: req.body.productId,
          title: req.body.productTitle,
          quantity: 1,
          price: Number(req.body.price) || 0,
        },
      ].filter((product) => product.productId || product.title)
  const totalAmount =
    req.body.totalAmount ??
    products.reduce(
      (total, product) => total + (Number(product.price) || 0) * (Number(product.quantity) || 1),
      0,
    )
  const couponCode = normalizeCouponCode(req.body.couponCode)
  let discountAmount = 0
  let finalAmount = Number(totalAmount) || 0

  if (couponCode) {
    const couponValidation = validateCouponForOrder({
      storeId: req.body.storeId,
      code: couponCode,
      orderAmount: totalAmount,
    })

    if (!couponValidation.isValid) {
      res.status(400).json({ message: couponValidation.message })
      return
    }

    discountAmount = couponValidation.discountAmount
    finalAmount = couponValidation.finalAmount
  }

  const inventoryProducts = readData(productsFile)
  const lowStockAlerts = []
  let inventoryChanged = false

  products.forEach((orderProduct) => {
    const productIndex = inventoryProducts.findIndex(
      (product) =>
        String(product.id) === String(orderProduct.productId) &&
        String(product.storeId) === String(req.body.storeId),
    )

    if (productIndex === -1) {
      return
    }

    const currentProduct = normalizeProduct(inventoryProducts[productIndex])
    const purchasedQuantity = Number(orderProduct.quantity) || 1
    const nextQuantity = Math.max(0, currentProduct.quantity - purchasedQuantity)

    inventoryProducts[productIndex] = {
      ...inventoryProducts[productIndex],
      quantity: nextQuantity,
      lowStockThreshold: currentProduct.lowStockThreshold,
    }
    inventoryChanged = true

    if (nextQuantity <= currentProduct.lowStockThreshold) {
      lowStockAlerts.push({
        productId: currentProduct.id,
        productName: currentProduct.title,
        quantity: nextQuantity,
        lowStockThreshold: currentProduct.lowStockThreshold,
      })
    }
  })

  if (inventoryChanged) {
    writeData(productsFile, inventoryProducts)
  }

  const newOrder = {
    id: orderId,
    storeId: req.body.storeId,
    customerId: req.body.customerId ?? null,
    customerName: req.body.customerName ?? '',
    customerEmail: req.body.customerEmail ?? req.body.email ?? '',
    phone: req.body.phone ?? '',
    products,
    subtotalAmount: totalAmount,
    discountAmount,
    finalAmount,
    couponCode,
    totalAmount: finalAmount,
    paymentMethod: req.body.paymentMethod === 'online' ? 'online' : 'cod',
    paymentStatus: req.body.paymentMethod === 'online' ? 'paid' : 'pending',
    fulfillmentStatus: 'unfulfilled',
    orderStatus: 'open',
    shippingAddress: req.body.shippingAddress ?? req.body.address ?? '',
    createdAt: Date.now(),
    lowStockAlerts,
  }
  const customer = upsertCustomerForOrder(newOrder)

  if (customer) {
    newOrder.customerId = customer.id
  }

  orders.push(newOrder)
  writeData(ordersFile, orders)

  if (couponCode) {
    const coupons = readData(couponsFile)
    const couponIndex = coupons.findIndex(
      (coupon) =>
        String(coupon.storeId) === String(req.body.storeId) &&
        normalizeCouponCode(coupon.code) === couponCode,
    )

    if (couponIndex !== -1) {
      coupons[couponIndex] = {
        ...coupons[couponIndex],
        usedCount: Number(coupons[couponIndex].usedCount || 0) + 1,
      }
      writeData(couponsFile, coupons)
    }
  }

  createOrderTimelineEntry(orderId, 'open', 'Order placed')
  if (newOrder.paymentStatus === 'paid') {
    createOrderTimelineEntry(orderId, 'paid', 'Payment received')
  }
  notifyNewOrder(newOrder)
  res.status(201).json(newOrder)
})

app.post('/orders/:id/pay', (req, res) => {
  const orderId = Number(req.params.id)
  const { method } = req.body

  if (!['cod', 'online'].includes(method)) {
    res.status(400).json({ message: 'Invalid payment method' })
    return
  }

  const orders = readData(ordersFile).map(normalizeOrder)
  const orderIndex = orders.findIndex((order) => order.id === orderId)

  if (orderIndex === -1) {
    res.status(404).json({ message: 'Order not found' })
    return
  }

  const nextPaymentStatus = method === 'online' ? 'paid' : 'pending'
  orders[orderIndex] = {
    ...orders[orderIndex],
    paymentMethod: method,
    paymentStatus: nextPaymentStatus,
  }

  writeData(ordersFile, orders)

  if (nextPaymentStatus === 'paid') {
    createOrderTimelineEntry(orderId, 'paid', 'Payment received')
  }

  res.json({
    ...orders[orderIndex],
    timeline: readData(orderTimelineFile).filter((entry) => entry.orderId === orderId),
  })
})

app.patch('/orders/:id/status', (req, res) => {
  const orderId = Number(req.params.id)
  const orders = readData(ordersFile).map(normalizeOrder)
  const orderIndex = orders.findIndex((order) => order.id === orderId)

  if (orderIndex === -1) {
    res.status(404).json({ message: 'Order not found' })
    return
  }

  const allowedStatusFields = ['paymentStatus', 'fulfillmentStatus', 'orderStatus']
  const updates = {}
  const timelineEntries = []

  allowedStatusFields.forEach((field) => {
    if (req.body[field] && req.body[field] !== orders[orderIndex][field]) {
      updates[field] = req.body[field]
      timelineEntries.push(
        createOrderTimelineEntry(orderId, req.body[field], getStatusTimelineMessage(req.body[field])),
      )
    }
  })

  orders[orderIndex] = {
    ...orders[orderIndex],
    ...updates,
  }

  writeData(ordersFile, orders)
  res.json({
    ...orders[orderIndex],
    timeline: readData(orderTimelineFile).filter((entry) => entry.orderId === orderId),
    addedTimelineEntries: timelineEntries,
  })
})

app.get('/customers', (req, res) => {
  const { storeId } = req.query
  const customers = readData(customersFile)

  if (!storeId) {
    res.json(customers)
    return
  }

  res.json(customers.filter((customer) => String(customer.storeId) === String(storeId)))
})

app.post('/customers', (req, res) => {
  if (!req.body.storeId) {
    res.status(400).json({ message: 'storeId is required' })
    return
  }

  const customers = readData(customersFile)
  const newCustomer = {
    id: Date.now(),
    storeId: req.body.storeId,
    name: req.body.name ?? '',
    email: String(req.body.email ?? '').trim().toLowerCase(),
    phone: req.body.phone ?? '',
    totalOrders: Number(req.body.totalOrders) || 0,
    totalSpent: Number(req.body.totalSpent) || 0,
    createdAt: Date.now(),
  }

  customers.push(newCustomer)
  writeData(customersFile, customers)
  res.status(201).json(newCustomer)
})

app.get('/customers/:id', (req, res) => {
  const customerId = Number(req.params.id)
  const { storeId } = req.query
  const customers = readData(customersFile)
  const customer = customers.find(
    (entry) =>
      entry.id === customerId && (!storeId || String(entry.storeId) === String(storeId)),
  )

  if (!customer) {
    res.status(404).json({ message: 'Customer not found' })
    return
  }

  const orders = readData(ordersFile)
    .map(normalizeOrder)
    .filter(
      (order) =>
        String(order.storeId) === String(customer.storeId) &&
        (String(order.customerId) === String(customer.id) ||
          String(order.customerEmail ?? '').trim().toLowerCase() ===
            String(customer.email).trim().toLowerCase()),
    )

  res.json({
    ...customer,
    orders,
  })
})

app.delete('/customers/:id', (req, res) => {
  const customerId = Number(req.params.id)
  const customers = readData(customersFile)
  const filteredCustomers = customers.filter((customer) => customer.id !== customerId)

  if (filteredCustomers.length === customers.length) {
    res.status(404).json({ message: 'Customer not found' })
    return
  }

  writeData(customersFile, filteredCustomers)
  res.json({ message: 'Customer deleted successfully' })
})

app.post('/stores', (req, res) => {
  const { userId, name, url } = req.body

  if (!userId) {
    res.status(400).json({ message: 'userId is required' })
    return
  }

  const stores = readData(storesFile)
  const normalizedUrl = String(url ?? '').trim().toLowerCase()

  if (
    normalizedUrl &&
    stores.some((store) => String(store.url || '').trim().toLowerCase() === normalizedUrl)
  ) {
    res.status(409).json({ message: 'Store URL is already taken' })
    return
  }

  const newStore = {
    id: Date.now(),
    userId,
    name: name ?? '',
    url: normalizedUrl,
    ownerEmail: req.body.ownerEmail ?? '',
    themeId: 'minimal',
    themeConfig: defaultThemeConfig,
    onboardingStep: Number(req.body.onboardingStep) || 1,
    isOnboardingCompleted: Boolean(req.body.isOnboardingCompleted),
  }

  stores.push(newStore)
  writeData(storesFile, stores)
  res.status(201).json(newStore)
})

app.put('/stores/:id', (req, res) => {
  const storeId = Number(req.params.id)
  const stores = readData(storesFile)
  const storeIndex = stores.findIndex((store) => store.id === storeId)

  if (storeIndex === -1) {
    res.status(404).json({ message: 'Store not found' })
    return
  }

  const nextUrl = req.body.url ? String(req.body.url).trim().toLowerCase() : null

  if (
    nextUrl &&
    stores.some(
      (store) =>
        store.id !== storeId &&
        String(store.url || '').trim().toLowerCase() === nextUrl,
    )
  ) {
    res.status(409).json({ message: 'Store URL is already taken' })
    return
  }

  stores[storeIndex] = {
    ...stores[storeIndex],
    ...req.body,
    id: storeId,
    ...(nextUrl ? { url: nextUrl } : {}),
  }

  writeData(storesFile, stores)
  res.json(stores[storeIndex])
})

app.put('/stores/:id/theme', (req, res) => {
  const storeId = Number(req.params.id)
  const { themeId } = req.body
  const stores = readData(storesFile)
  const storeIndex = stores.findIndex((store) => store.id === storeId)

  if (storeIndex === -1) {
    res.status(404).json({ message: 'Store not found' })
    return
  }

  if (!themeId) {
    res.status(400).json({ message: 'themeId is required' })
    return
  }

  const themeExists = themes.some((theme) => theme.id === themeId)

  if (!themeExists) {
    res.status(400).json({ message: 'Invalid themeId' })
    return
  }

  stores[storeIndex] = {
    ...stores[storeIndex],
    themeId,
  }

  writeData(storesFile, stores)
  res.json(stores[storeIndex])
})

app.put('/stores/:id/theme-config', (req, res) => {
  const storeId = Number(req.params.id)
  const { themeConfig } = req.body
  const stores = readData(storesFile)
  const storeIndex = stores.findIndex((store) => store.id === storeId)

  if (storeIndex === -1) {
    res.status(404).json({ message: 'Store not found' })
    return
  }

  if (!themeConfig || typeof themeConfig !== 'object') {
    res.status(400).json({ message: 'themeConfig is required' })
    return
  }

  stores[storeIndex] = {
    ...stores[storeIndex],
    themeConfig: {
      ...defaultThemeConfig,
      ...(stores[storeIndex].themeConfig ?? {}),
      ...themeConfig,
    },
  }

  writeData(storesFile, stores)
  res.json(stores[storeIndex])
})

app.get('/stores/:userId', (req, res) => {
  const { userId } = req.params
  const stores = readData(storesFile)
  const userStores = stores.filter((store) => String(store.userId) === String(userId))

  res.json(userStores)
})

app.get('/themes', (req, res) => {
  res.json(themes)
})

app.get('/apps', (req, res) => {
  res.json(apps)
})

app.get('/store-apps/:storeId', (req, res) => {
  const { storeId } = req.params
  const storeApps = readData(storeAppsFile)

  const installedApps = storeApps
    .filter((storeApp) => String(storeApp.storeId) === String(storeId))
    .map((storeApp) => ({
      ...storeApp,
      app: apps.find((availableApp) => availableApp.id === storeApp.appId) ?? null,
    }))

  res.json(installedApps)
})

app.post('/store-apps/install', (req, res) => {
  const { storeId, appId } = req.body

  if (!storeId || !appId) {
    res.status(400).json({ message: 'storeId and appId are required' })
    return
  }

  const appExists = apps.some((availableApp) => availableApp.id === appId && availableApp.isActive)

  if (!appExists) {
    res.status(400).json({ message: 'Invalid appId' })
    return
  }

  const storeApps = readData(storeAppsFile)
  const existingAppIndex = storeApps.findIndex(
    (storeApp) => String(storeApp.storeId) === String(storeId) && storeApp.appId === appId,
  )

  if (existingAppIndex !== -1) {
    storeApps[existingAppIndex] = {
      ...storeApps[existingAppIndex],
      enabled: true,
    }

    writeData(storeAppsFile, storeApps)
    res.json({
      ...storeApps[existingAppIndex],
      app: apps.find((availableApp) => availableApp.id === appId) ?? null,
    })
    return
  }

  const newStoreApp = {
    id: Date.now(),
    storeId,
    appId,
    enabled: true,
  }

  storeApps.push(newStoreApp)
  writeData(storeAppsFile, storeApps)
  res.status(201).json({
    ...newStoreApp,
    app: apps.find((availableApp) => availableApp.id === appId) ?? null,
  })
})

app.post('/store-apps/toggle', (req, res) => {
  const { storeId, appId, enabled } = req.body

  if (!storeId || !appId || typeof enabled !== 'boolean') {
    res.status(400).json({ message: 'storeId, appId, and enabled are required' })
    return
  }

  const storeApps = readData(storeAppsFile)
  const storeAppIndex = storeApps.findIndex(
    (storeApp) => String(storeApp.storeId) === String(storeId) && storeApp.appId === appId,
  )

  if (storeAppIndex === -1) {
    res.status(404).json({ message: 'Store app not found' })
    return
  }

  storeApps[storeAppIndex] = {
    ...storeApps[storeAppIndex],
    enabled,
  }

  writeData(storeAppsFile, storeApps)
  res.json({
    ...storeApps[storeAppIndex],
    app: apps.find((availableApp) => availableApp.id === appId) ?? null,
  })
})

app.get('/store-by-url/:url', (req, res) => {
  const requestedUrl = String(req.params.url || '').trim().toLowerCase()
  const stores = readData(storesFile)
  const store = stores.find(
    (entry) => String(entry.url || '').trim().toLowerCase() === requestedUrl,
  )

  if (!store) {
    res.status(404).json({ message: 'Store not found' })
    return
  }

  res.json(store)
})

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return res.status(401).json({ message: error.message })
    }

    return res.json({
      message: 'Login successful',
      user: data.user,
      session: data.session,
    })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

app.get('/users', (req, res) => {
  const users = readData(usersFile)

  res.json(
    users.map((user) => ({
      id: user.id,
      email: user.email,
      isVerified: user.isVerified,
    })),
  )
})

app.get('/verify', (req, res) => {
  const token = req.query.token

  if (!token) {
    res.status(400).json({ message: 'Verification token is required' })
    return
  }

  const users = readData(usersFile)
  const userIndex = users.findIndex((entry) => entry.verificationToken === token)

  if (userIndex === -1) {
    res.status(404).json({ message: 'Invalid verification token' })
    return
  }

  if (Date.now() > users[userIndex].tokenExpiry) {
    res.status(400).json({ message: 'Verification token has expired' })
    return
  }

  users[userIndex] = {
    ...users[userIndex],
    isVerified: true,
    verificationToken: null,
  }

  writeData(usersFile, users)
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?verified=true`)
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
