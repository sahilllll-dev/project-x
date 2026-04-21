const express = require('express')
const cors = require('cors')
const nodemailer = require('nodemailer')
const { createClient } = require('@supabase/supabase-js')

const app = express()
const PORT = process.env.PORT || 5001

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    : null

const defaultThemeConfig = {
  heroTitle: 'Welcome to your store',
  showBrands: true,
  primaryColor: '#000000',
  font: 'Inter',
  layout: 'grid',
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

const allowedOrigins = ['http://localhost:5173', process.env.FRONTEND_URL].filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true)
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      console.log('❌ Blocked by CORS:', origin)
      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  }),
)
app.use((req, res, next) => {
  console.log(`Incoming request from origin: ${req.headers.origin}`)
  next()
})
app.use(express.json({ limit: '5mb' }))

function requireSupabase(res) {
  if (!supabase) {
    res.status(500).json({ message: 'Supabase is not configured' })
    return false
  }

  return true
}

function getRequestStoreId(req) {
  return req.query.storeId ?? req.query.store_id ?? req.body?.storeId ?? req.body?.store_id
}

function requireStoreId(req, res) {
  const storeId = getRequestStoreId(req)

  if (!storeId) {
    res.status(400).json({ message: 'storeId is required' })
    return null
  }

  return storeId
}

function sendInvalidData(res, error) {
  if (error) {
    console.error('Invalid data:', error)
  }

  return res.status(400).json({ message: 'Invalid data' })
}

function sendServerError(res, error) {
  if (error) {
    console.error('Server error:', error)
  }

  return res.status(500).json({ message: 'Something went wrong' })
}

function normalizeStoreSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\.projectx\.com$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeStoreSubdomain(value) {
  return normalizeStoreSlug(value).replace(/-/g, '')
}

function normalizeStoreUrl(value) {
  const slug = normalizeStoreSubdomain(value)
  return slug ? `${slug}.projectx.com` : ''
}

function getThemeConfig(themeConfig) {
  return {
    ...defaultThemeConfig,
    ...(themeConfig ?? {}),
  }
}

function toStore(row) {
  if (!row) {
    return null
  }

  const isDraft = String(row.slug ?? '').startsWith('draft-') && !String(row.name ?? '').trim()
  const subdomain = normalizeStoreSubdomain(row.subdomain ?? row.slug)

  return {
    id: row.id,
    userId: row.owner_id,
    ownerId: row.owner_id,
    ownerEmail: row.owner_email ?? '',
    name: row.name ?? '',
    slug: isDraft ? '' : row.slug ?? '',
    url: isDraft ? '' : normalizeStoreUrl(subdomain),
    themeId: row.theme_id ?? 'minimal',
    themeConfig: getThemeConfig(row.theme_config),
    onboardingStep: Number(row.onboarding_step) || 1,
    isOnboardingCompleted: Boolean(row.is_onboarding_completed),
    isDefault: Boolean(row.is_default),
    logoUrl: row.logo_url ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toTheme(row) {
  if (!row) {
    return null
  }

  return {
    id: row.code,
    uuid: row.id,
    code: row.code,
    name: row.name,
    previewImage: row.preview_image ?? '',
    createdAt: row.created_at,
  }
}

function toStorePage(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name ?? 'homepage',
    slug: row.slug ?? '/',
    layout: row.layout ?? {},
    createdAt: row.created_at,
  }
}

function getDefaultPageLayout() {
  return {
    sections: [
      {
        id: 'section-default',
        columns: [
          {
            id: 'column-default',
            widgets: [
              {
                id: 'widget-heading-default',
                type: 'heading',
                content: 'Welcome to Store',
                fontSize: 44,
              },
              {
                id: 'widget-products-default',
                type: 'products',
                limit: 6,
              },
            ],
          },
        ],
      },
    ],
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value ?? ''))
}

async function getThemeByIdentifier(identifier) {
  const value = String(identifier ?? '').trim()

  if (!value) {
    return null
  }

  const { data: themeByCode, error: codeError } = await supabase
    .from('themes')
    .select('*')
    .eq('code', value)
    .maybeSingle()

  if (codeError) {
    throw codeError
  }

  if (themeByCode || !isUuid(value)) {
    return themeByCode
  }

  const { data: themeById, error: idError } = await supabase
    .from('themes')
    .select('*')
    .eq('id', value)
    .maybeSingle()

  if (idError) {
    throw idError
  }

  return themeById
}

async function ensureActiveStoreTheme(store, config = getThemeConfig(store?.theme_config)) {
  const theme = await getThemeByIdentifier(store?.theme_id ?? 'minimal')

  if (!theme) {
    return null
  }

  const { data: activeStoreTheme, error: activeError } = await supabase
    .from('store_themes')
    .select('*')
    .eq('store_id', store.id)
    .eq('is_active', true)
    .maybeSingle()

  if (activeError) {
    throw activeError
  }

  if (activeStoreTheme) {
    const { data, error } = await supabase
      .from('store_themes')
      .update({ theme_id: theme.id, config })
      .eq('id', activeStoreTheme.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  }

  const { data, error } = await supabase
    .from('store_themes')
    .insert([{ store_id: store.id, theme_id: theme.id, config, is_active: true }])
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

async function getActiveThemeForStore(storeId) {
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .maybeSingle()

  if (storeError) {
    throw storeError
  }

  if (!store) {
    return null
  }

  let { data: storeTheme, error: storeThemeError } = await supabase
    .from('store_themes')
    .select('*')
    .eq('store_id', store.id)
    .eq('is_active', true)
    .maybeSingle()

  if (storeThemeError) {
    throw storeThemeError
  }

  if (!storeTheme) {
    storeTheme = await ensureActiveStoreTheme(store)
  }

  const { data: theme, error: themeError } = await supabase
    .from('themes')
    .select('*')
    .eq('id', storeTheme.theme_id)
    .maybeSingle()

  if (themeError) {
    throw themeError
  }

  return {
    store,
    theme,
    config: getThemeConfig(storeTheme.config),
  }
}

function getDefaultProductSeo(product) {
  return {
    title: product?.title ?? '',
    description: product?.description ?? '',
    slug: String(product?.id ?? ''),
    ...(product?.seo ?? {}),
  }
}

function toProduct(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    storeId: row.store_id,
    ownerId: row.owner_id,
    title: row.title ?? '',
    description: row.description ?? '',
    category: row.category ?? '',
    price: Number(row.price) || 0,
    discountedPrice: Number(row.discounted_price) || 0,
    quantity: Number(row.quantity) || 0,
    lowStockThreshold: Number(row.low_stock_threshold ?? defaultLowStockThreshold),
    sku: row.sku ?? '',
    status: row.status ?? 'inactive',
    image: row.image_url ?? '',
    imageUrl: row.image_url ?? '',
    galleryImage: row.gallery_image ?? '',
    limitSinglePurchase: Boolean(row.limit_single_purchase),
    shipping: row.shipping ?? {},
    seo: getDefaultProductSeo(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toCategory(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name ?? '',
    slug: row.slug ?? '',
    parentId: row.parent_id ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toCoupon(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    storeId: row.store_id,
    code: row.code,
    type: row.type,
    value: Number(row.value) || 0,
    minOrderValue: Number(row.min_order_value) || 0,
    maxDiscount: row.max_discount === null ? '' : Number(row.max_discount) || 0,
    usageLimit: row.usage_limit === null ? '' : Number(row.usage_limit) || 0,
    usedCount: Number(row.used_count) || 0,
    expiresAt: row.expires_at ?? '',
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  }
}

function toCustomer(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    totalOrders: Number(row.total_orders) || 0,
    totalSpent: Number(row.total_spent) || 0,
    createdAt: row.created_at,
  }
}

function toTimeline(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    status: row.status,
    message: row.message,
    createdAt: row.created_at,
  }
}

function toOrder(row) {
  if (!row) {
    return null
  }

  const products =
    Array.isArray(row.products) && row.products.length > 0
      ? row.products
      : [
        {
          productId: row.product_id,
          title: row.product_title,
          quantity: 1,
          price: Number(row.price) || 0,
        },
      ].filter((product) => product.productId || product.title)

  return {
    id: row.id,
    storeId: row.store_id,
    ownerId: row.owner_id,
    customerId: row.customer_id,
    customerName: row.customer_name ?? '',
    customerEmail: row.customer_email ?? '',
    phone: row.phone ?? '',
    products,
    subtotalAmount: Number(row.subtotal_amount ?? row.total_amount ?? row.price) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    finalAmount: Number(row.final_amount ?? row.total_amount ?? row.price) || 0,
    couponCode: row.coupon_code ?? '',
    totalAmount: Number(row.total_amount ?? row.final_amount ?? row.price) || 0,
    paymentMethod: row.payment_method ?? 'cod',
    paymentStatus: row.payment_status ?? 'pending',
    fulfillmentStatus: row.fulfillment_status ?? 'unfulfilled',
    orderStatus: row.order_status ?? 'open',
    shippingAddress: row.shipping_address ?? row.address ?? '',
    createdAt: row.created_at,
  }
}

function normalizeCouponCode(code) {
  return String(code ?? '').trim().toUpperCase()
}

function normalizeCouponExpiresAt(body, { required = false } = {}) {
  const hasSnakeCase = Object.prototype.hasOwnProperty.call(body, 'expires_at')
  const hasCamelCase = Object.prototype.hasOwnProperty.call(body, 'expiresAt')

  if (!hasSnakeCase && !hasCamelCase) {
    if (required) throw new Error('Invalid date format. Use YYYY-MM-DD')
    return undefined
  }

  const expiresAt = hasSnakeCase ? body.expires_at : body.expiresAt

  if (expiresAt === null || expiresAt === '') {
    if (required) throw new Error('Invalid date format. Use YYYY-MM-DD')
    return null
  }

  if (typeof expiresAt !== 'string') {
    throw new Error('Invalid date format. Use YYYY-MM-DD')
  }

  const parsedDate = new Date(expiresAt)
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error('Invalid date format. Use YYYY-MM-DD')
  }

  return parsedDate.toISOString()
}

function calculateCouponDiscount(coupon, orderAmount) {
  const amount = Number(orderAmount) || 0
  let discountAmount = 0

  if (coupon.type === 'percentage') {
    discountAmount = (amount * Number(coupon.value)) / 100

    if (coupon.max_discount) {
      discountAmount = Math.min(discountAmount, Number(coupon.max_discount))
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

async function getStoreById(storeId) {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function createOrderTimelineEntry(orderId, status, message) {
  const { data, error } = await supabase
    .from('order_timeline')
    .insert([{ order_id: orderId, status, message }])
    .select()
    .single()

  if (error) {
    throw error
  }

  return toTimeline(data)
}

async function validateCouponForOrder({ storeId, code, orderAmount }) {
  const normalizedCode = normalizeCouponCode(code)
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('store_id', storeId)
    .eq('code', normalizedCode)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!coupon) {
    return { isValid: false, message: 'Coupon not found' }
  }

  if (!coupon.is_active) {
    return { isValid: false, message: 'Coupon is inactive' }
  }

  if (coupon.expires_at && new Date(coupon.expires_at).getTime() <= Date.now()) {
    return { isValid: false, message: 'Coupon has expired' }
  }

  if (coupon.usage_limit && Number(coupon.used_count || 0) >= Number(coupon.usage_limit)) {
    return { isValid: false, message: 'Coupon usage limit exceeded' }
  }

  if (coupon.min_order_value && Number(orderAmount) < Number(coupon.min_order_value)) {
    return { isValid: false, message: 'Minimum order value not met' }
  }

  return {
    isValid: true,
    coupon,
    ...calculateCouponDiscount(coupon, orderAmount),
  }
}

async function upsertCustomerForOrder(order) {
  const email = String(order.customerEmail ?? '').trim().toLowerCase()

  if (!email) {
    return null
  }

  const { data: existingCustomer, error: findError } = await supabase
    .from('customers')
    .select('*')
    .eq('store_id', order.storeId)
    .eq('email', email)
    .maybeSingle()

  if (findError) {
    throw findError
  }

  if (existingCustomer) {
    const { data, error } = await supabase
      .from('customers')
      .update({
        name: order.customerName || existingCustomer.name,
        phone: order.phone || existingCustomer.phone,
        total_orders: Number(existingCustomer.total_orders || 0) + 1,
        total_spent: Number(existingCustomer.total_spent || 0) + Number(order.totalAmount || 0),
      })
      .eq('id', existingCustomer.id)
      .eq('store_id', order.storeId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return toCustomer(data)
  }

  const { data, error } = await supabase
    .from('customers')
    .insert([
      {
        store_id: order.storeId,
        name: order.customerName ?? '',
        email,
        phone: order.phone ?? '',
        total_orders: 1,
        total_spent: Number(order.totalAmount || 0),
      },
    ])
    .select()
    .single()

  if (error) {
    throw error
  }

  return toCustomer(data)
}

function getCurrency(value) {
  return `INR ${Number(value || 0).toLocaleString('en-IN')}`
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

async function notifyNewOrder(order) {
  try {
    const store = await getStoreById(order.storeId)
    const recipient = store?.owner_email || process.env.ORDER_NOTIFICATION_EMAIL || process.env.SMTP_USER

    if (!recipient) {
      return
    }

    const productLines = order.products
      .map((product) => `- ${product.title} x ${product.quantity || 1} (${getCurrency(product.price)})`)
      .join('\n')

    await createMailTransport().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'Project X <no-reply@projectx.local>',
      to: recipient,
      subject: 'New order received',
      text: [
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
        .join('\n'),
    })
  } catch (error) {
    console.error('Failed to send order email notification', error)
  }
}

app.get('/products', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const storeId = requireStoreId(req, res)
    if (!storeId) return

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    if (error) return sendInvalidData(res, error)

    res.json(data.map(toProduct))
  } catch (error) {
    sendServerError(res, error)
  }
})

app.get('/product/:slug', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const slug = req.params.slug
    const storeId = requireStoreId(req, res)
    if (!storeId) return

    const { data, error } = await supabase.from('products').select('*').eq('store_id', storeId)

    if (error) return sendInvalidData(res, error)

    const product = data.map(toProduct).find((entry) => {
      const seo = getDefaultProductSeo(entry)
      return String(seo.slug) === String(slug) || String(entry.id) === String(slug)
    })

    if (!product) return res.status(404).json({ message: 'Product not found' })

    res.json(product)
  } catch (error) {
    sendServerError(res, error)
  }
})

app.post('/products', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const storeId = requireStoreId(req, res)
    if (!storeId) return

    const store = await getStoreById(storeId)

    if (!store) return res.status(400).json({ message: 'storeId is required' })

    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          owner_id: store.owner_id,
          store_id: store.id,
          title: req.body.title,
          description: req.body.description ?? '',
          category: req.body.category ?? '',
          price: Number(req.body.price) || 0,
          discounted_price: Number(req.body.discountedPrice) || 0,
          quantity: Number(req.body.quantity) || 0,
          low_stock_threshold:
            req.body.lowStockThreshold === undefined || req.body.lowStockThreshold === ''
              ? defaultLowStockThreshold
              : Number(req.body.lowStockThreshold),
          sku: req.body.sku ?? '',
          status: req.body.status ?? 'inactive',
          image_url: req.body.image ?? req.body.imageUrl ?? '',
          gallery_image: req.body.galleryImage ?? '',
          shipping: req.body.shipping ?? {},
          seo: req.body.seo ?? {},
          limit_single_purchase: Boolean(req.body.limitSinglePurchase),
        },
      ])
      .select()
      .single()

    if (error) return sendInvalidData(res, error)

    res.status(201).json(toProduct(data))
  } catch (error) {
    sendServerError(res, error)
  }
})

app.put('/products/:id', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const storeId = requireStoreId(req, res)
    if (!storeId) return

    const update = {}
    if (req.body.title !== undefined) update.title = req.body.title
    if (req.body.description !== undefined) update.description = req.body.description
    if (req.body.category !== undefined) update.category = req.body.category
    if (req.body.price !== undefined) update.price = Number(req.body.price) || 0
    if (req.body.discountedPrice !== undefined) update.discounted_price = Number(req.body.discountedPrice) || 0
    if (req.body.quantity !== undefined) update.quantity = Number(req.body.quantity) || 0
    if (req.body.lowStockThreshold !== undefined) update.low_stock_threshold = Number(req.body.lowStockThreshold) || 0
    if (req.body.sku !== undefined) update.sku = req.body.sku
    if (req.body.status !== undefined) update.status = req.body.status
    if (req.body.image !== undefined || req.body.imageUrl !== undefined) update.image_url = req.body.image ?? req.body.imageUrl
    if (req.body.galleryImage !== undefined) update.gallery_image = req.body.galleryImage
    if (req.body.shipping !== undefined) update.shipping = req.body.shipping
    if (req.body.seo !== undefined) update.seo = req.body.seo
    if (req.body.limitSinglePurchase !== undefined) update.limit_single_purchase = Boolean(req.body.limitSinglePurchase)

    const { data, error } = await supabase
      .from('products')
      .update(update)
      .eq('id', req.params.id)
      .eq('store_id', storeId)
      .select()
      .maybeSingle()

    if (error) return sendInvalidData(res, error)
    if (!data) return res.status(404).json({ message: 'Product not found' })

    res.json(toProduct(data))
  } catch (error) {
    sendServerError(res, error)
  }
})

app.delete('/products/:id', async (req, res) => {
  if (!requireSupabase(res)) return

  const storeId = requireStoreId(req, res)
  if (!storeId) return

  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', req.params.id)
    .eq('store_id', storeId)
    .select('id')
    .maybeSingle()
  if (error) return sendInvalidData(res, error)
  if (!data) return res.status(404).json({ message: 'Product not found' })
  res.json({ message: 'Product deleted successfully' })
})

app.get('/categories', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const storeId = requireStoreId(req, res)
    if (!storeId) return

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: true })

    if (error?.code === '42P01') {
      return res.status(500).json({ message: 'Categories table is missing' })
    }

    if (error) return sendInvalidData(res, error)

    res.json(data.map(toCategory))
  } catch (error) {
    sendServerError(res, error)
  }
})

app.post('/categories', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const storeId = requireStoreId(req, res)
    if (!storeId) return

    const name = String(req.body.name ?? '').trim()
    const slug = normalizeStoreSlug(req.body.slug ?? name)

    if (!name) return res.status(400).json({ message: 'Category name is required' })
    if (!slug) return res.status(400).json({ message: 'Category slug is required' })

    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          store_id: storeId,
          name,
          slug,
          parent_id: req.body.parentId || req.body.parent_id || null,
        },
      ])
      .select()
      .single()

    if (error?.code === '23505') {
      return res.status(400).json({ message: 'Category slug already exists' })
    }

    if (error?.code === '42P01') {
      return res.status(500).json({ message: 'Categories table is missing' })
    }

    if (error) return sendInvalidData(res, error)

    res.status(201).json(toCategory(data))
  } catch (error) {
    sendServerError(res, error)
  }
})

app.put('/categories/:id', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const update = {}

    if (req.body.name !== undefined) {
      const name = String(req.body.name ?? '').trim()
      if (!name) return res.status(400).json({ message: 'Category name is required' })
      update.name = name
    }

    if (req.body.slug !== undefined) {
      const slug = normalizeStoreSlug(req.body.slug)
      if (!slug) return res.status(400).json({ message: 'Category slug is required' })
      update.slug = slug
    }

    if (req.body.parentId !== undefined || req.body.parent_id !== undefined) {
      update.parent_id = req.body.parentId || req.body.parent_id || null
    }

    let query = supabase
      .from('categories')
      .update(update)
      .eq('id', req.params.id)

    const storeId = getRequestStoreId(req)
    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    const { data, error } = await query.select().maybeSingle()

    if (error?.code === '23505') {
      return res.status(400).json({ message: 'Category slug already exists' })
    }

    if (error?.code === '42P01') {
      return res.status(500).json({ message: 'Categories table is missing' })
    }

    if (error) return sendInvalidData(res, error)
    if (!data) return res.status(404).json({ message: 'Category not found' })

    res.json(toCategory(data))
  } catch (error) {
    sendServerError(res, error)
  }
})

app.delete('/categories/:id', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    let query = supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id)

    const storeId = getRequestStoreId(req)
    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    const { data, error } = await query.select('id').maybeSingle()

    if (error?.code === '42P01') {
      return res.status(500).json({ message: 'Categories table is missing' })
    }

    if (error) return sendInvalidData(res, error)
    if (!data) return res.status(404).json({ message: 'Category not found' })

    res.json({ message: 'Category deleted successfully' })
  } catch (error) {
    sendServerError(res, error)
  }
})

app.post('/coupons', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const storeId = requireStoreId(req, res)
    if (!storeId) return

    const code = normalizeCouponCode(req.body.code)
    const expiresAt = normalizeCouponExpiresAt(req.body, { required: true })
    if (!code) return res.status(400).json({ message: 'Coupon code is required' })
    if (Number(req.body.value) <= 0) return res.status(400).json({ message: 'Coupon value must be greater than 0' })
    if (req.body.type === 'percentage' && Number(req.body.value) > 100) {
      return res.status(400).json({ message: 'Percentage coupon cannot exceed 100' })
    }

    const { data, error } = await supabase
      .from('coupons')
      .insert([
        {
          store_id: storeId,
          code,
          type: req.body.type,
          value: Number(req.body.value),
          min_order_value: Number(req.body.minOrderValue) || 0,
          max_discount: req.body.maxDiscount ? Number(req.body.maxDiscount) : null,
          usage_limit: req.body.usageLimit ? Number(req.body.usageLimit) : null,
          expires_at: expiresAt,
          is_active: req.body.isActive !== false,
        },
      ])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return res.status(400).json({ message: 'Coupon code already exists' })
      return sendInvalidData(res, error)
    }

    res.status(201).json(toCoupon(data))
  } catch (error) {
    if (error.message === 'Invalid date format. Use YYYY-MM-DD') {
      return res.status(400).json({ message: error.message })
    }

    return sendServerError(res, error)
  }
})

app.get('/coupons', async (req, res) => {
  if (!requireSupabase(res)) return

  const storeId = requireStoreId(req, res)
  if (!storeId) return

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
  if (error) return sendInvalidData(res, error)
  res.json(data.map(toCoupon))
})

app.get('/coupons/:code', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const storeId = requireStoreId(req, res)
    if (!storeId) return

    const validation = await validateCouponForOrder({
      storeId,
      code: req.params.code,
      orderAmount: Number(req.query.orderAmount) || 0,
    })

    if (!validation.isValid) return res.status(400).json({ message: validation.message })

    res.json({
      coupon: toCoupon(validation.coupon),
      discountAmount: validation.discountAmount,
      finalAmount: validation.finalAmount,
    })
  } catch (error) {
    sendServerError(res, error)
  }
})

app.put('/coupons/:id', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const storeId = requireStoreId(req, res)
    if (!storeId) return

    const update = {}
    const expiresAt = normalizeCouponExpiresAt(req.body)
    if (req.body.code !== undefined) update.code = normalizeCouponCode(req.body.code)
    if (req.body.type !== undefined) update.type = req.body.type
    if (req.body.value !== undefined) update.value = Number(req.body.value)
    if (req.body.minOrderValue !== undefined) update.min_order_value = Number(req.body.minOrderValue) || 0
    if (req.body.maxDiscount !== undefined) update.max_discount = req.body.maxDiscount ? Number(req.body.maxDiscount) : null
    if (req.body.usageLimit !== undefined) update.usage_limit = req.body.usageLimit ? Number(req.body.usageLimit) : null
    if (expiresAt !== undefined) update.expires_at = expiresAt
    if (req.body.isActive !== undefined) update.is_active = Boolean(req.body.isActive)

    const { data, error } = await supabase
      .from('coupons')
      .update(update)
      .eq('id', req.params.id)
      .eq('store_id', storeId)
      .select()
      .maybeSingle()
    if (error) return sendInvalidData(res, error)
    if (!data) return res.status(404).json({ message: 'Coupon not found' })
    res.json(toCoupon(data))
  } catch (error) {
    if (error.message === 'Invalid date format. Use YYYY-MM-DD') {
      return res.status(400).json({ message: error.message })
    }

    return sendServerError(res, error)
  }
})

app.delete('/coupons/:id', async (req, res) => {
  if (!requireSupabase(res)) return

  const storeId = requireStoreId(req, res)
  if (!storeId) return

  const { data, error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', req.params.id)
    .eq('store_id', storeId)
    .select('id')
    .maybeSingle()
  if (error) return sendInvalidData(res, error)
  if (!data) return res.status(404).json({ message: 'Coupon not found' })
  res.json({ message: 'Coupon deleted successfully' })
})

app.get('/orders', async (req, res) => {
  if (!requireSupabase(res)) return

  const storeId = requireStoreId(req, res)
  if (!storeId) return

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
  if (error) return sendInvalidData(res, error)
  res.json(data.map(toOrder))
})

app.get('/orders/:id', async (req, res) => {
  if (!requireSupabase(res)) return

  const storeId = requireStoreId(req, res)
  if (!storeId) return

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', req.params.id)
    .eq('store_id', storeId)
    .maybeSingle()
  if (error) return sendInvalidData(res, error)
  if (!order) return res.status(404).json({ message: 'Order not found' })

  const { data: timeline, error: timelineError } = await supabase
    .from('order_timeline')
    .select('*')
    .eq('order_id', req.params.id)
    .order('created_at')
  if (timelineError) return sendInvalidData(res, timelineError)

  res.json({ ...toOrder(order), timeline: timeline.map(toTimeline) })
})

app.post('/orders', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const storeId = requireStoreId(req, res)
    if (!storeId) return

    const store = await getStoreById(storeId)
    if (!store) return res.status(400).json({ message: 'storeId is required' })

    const products = Array.isArray(req.body.products) ? req.body.products : []
    const subtotalAmount =
      req.body.totalAmount ??
      products.reduce((total, product) => total + (Number(product.price) || 0) * (Number(product.quantity) || 1), 0)
    const couponCode = normalizeCouponCode(req.body.couponCode)
    let discountAmount = 0
    let finalAmount = Number(subtotalAmount) || 0

    if (couponCode) {
      const couponValidation = await validateCouponForOrder({
        storeId: store.id,
        code: couponCode,
        orderAmount: subtotalAmount,
      })

      if (!couponValidation.isValid) return res.status(400).json({ message: couponValidation.message })
      discountAmount = couponValidation.discountAmount
      finalAmount = couponValidation.finalAmount
    }

    for (const orderProduct of products) {
      if (!orderProduct.productId) continue

      const { data: product } = await supabase
        .from('products')
        .select('quantity, low_stock_threshold')
        .eq('id', orderProduct.productId)
        .eq('store_id', store.id)
        .maybeSingle()

      if (product) {
        await supabase
          .from('products')
          .update({ quantity: Math.max(0, Number(product.quantity || 0) - (Number(orderProduct.quantity) || 1)) })
          .eq('id', orderProduct.productId)
          .eq('store_id', store.id)
      }
    }

    const firstProduct = products[0] ?? {}
    const paymentMethod = req.body.paymentMethod === 'online' ? 'online' : 'cod'
    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          owner_id: store.owner_id,
          store_id: store.id,
          customer_id: req.body.customerId || null,
          customer_name: req.body.customerName ?? '',
          customer_email: req.body.customerEmail ?? req.body.email ?? '',
          phone: req.body.phone ?? '',
          products,
          product_id: firstProduct.productId || null,
          product_title: firstProduct.title || 'Order',
          price: Number(firstProduct.price) || Number(finalAmount) || 0,
          subtotal_amount: Number(subtotalAmount) || 0,
          discount_amount: discountAmount,
          final_amount: finalAmount,
          coupon_code: couponCode,
          total_amount: finalAmount,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'online' ? 'paid' : 'pending',
          fulfillment_status: 'unfulfilled',
          order_status: 'open',
          address: req.body.shippingAddress ?? req.body.address ?? '',
          shipping_address: req.body.shippingAddress ?? req.body.address ?? '',
          status: 'pending',
        },
      ])
      .select()
      .single()

    if (error) return sendInvalidData(res, error)

    const order = toOrder(data)
    const customer = await upsertCustomerForOrder(order)
    if (customer) {
      await supabase.from('orders').update({ customer_id: customer.id }).eq('id', order.id).eq('store_id', store.id)
      order.customerId = customer.id
    }

    if (couponCode) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('used_count')
        .eq('store_id', store.id)
        .eq('code', couponCode)
        .maybeSingle()

      if (coupon) {
        await supabase
          .from('coupons')
          .update({ used_count: Number(coupon.used_count || 0) + 1 })
          .eq('store_id', store.id)
          .eq('code', couponCode)
      }
    }

    await createOrderTimelineEntry(order.id, 'open', 'Order placed')
    if (order.paymentStatus === 'paid') await createOrderTimelineEntry(order.id, 'paid', 'Payment received')
    notifyNewOrder(order)
    res.status(201).json(order)
  } catch (error) {
    sendServerError(res, error)
  }
})

app.post('/orders/:id/pay', async (req, res) => {
  if (!requireSupabase(res)) return

  const storeId = requireStoreId(req, res)
  if (!storeId) return

  if (!['cod', 'online'].includes(req.body.method)) return res.status(400).json({ message: 'Invalid payment method' })
  const paymentStatus = req.body.method === 'online' ? 'paid' : 'pending'
  const { data, error } = await supabase
    .from('orders')
    .update({ payment_method: req.body.method, payment_status: paymentStatus })
    .eq('id', req.params.id)
    .eq('store_id', storeId)
    .select()
    .maybeSingle()
  if (error) return sendInvalidData(res, error)
  if (!data) return res.status(404).json({ message: 'Order not found' })
  if (paymentStatus === 'paid') await createOrderTimelineEntry(req.params.id, 'paid', 'Payment received')
  const { data: timeline } = await supabase.from('order_timeline').select('*').eq('order_id', req.params.id).order('created_at')
  res.json({ ...toOrder(data), timeline: (timeline ?? []).map(toTimeline) })
})

app.patch('/orders/:id/status', async (req, res) => {
  if (!requireSupabase(res)) return

  const storeId = requireStoreId(req, res)
  if (!storeId) return

  const update = {}
  if (req.body.paymentStatus) update.payment_status = req.body.paymentStatus
  if (req.body.fulfillmentStatus) update.fulfillment_status = req.body.fulfillmentStatus
  if (req.body.orderStatus) update.order_status = req.body.orderStatus

  const { data, error } = await supabase
    .from('orders')
    .update(update)
    .eq('id', req.params.id)
    .eq('store_id', storeId)
    .select()
    .maybeSingle()
  if (error) return sendInvalidData(res, error)
  if (!data) return res.status(404).json({ message: 'Order not found' })

  for (const status of [req.body.paymentStatus, req.body.fulfillmentStatus, req.body.orderStatus].filter(Boolean)) {
    await createOrderTimelineEntry(req.params.id, status, `Status updated to ${status}`)
  }

  const { data: timeline } = await supabase.from('order_timeline').select('*').eq('order_id', req.params.id).order('created_at')
  res.json({ ...toOrder(data), timeline: (timeline ?? []).map(toTimeline) })
})

app.get('/customers', async (req, res) => {
  if (!requireSupabase(res)) return

  const storeId = requireStoreId(req, res)
  if (!storeId) return

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
  if (error) return sendInvalidData(res, error)
  res.json(data.map(toCustomer))
})

app.post('/customers', async (req, res) => {
  if (!requireSupabase(res)) return

  const storeId = requireStoreId(req, res)
  if (!storeId) return

  const { data, error } = await supabase
    .from('customers')
    .insert([
      {
        store_id: storeId,
        name: req.body.name ?? '',
        email: req.body.email ?? '',
        phone: req.body.phone ?? '',
        total_orders: Number(req.body.totalOrders) || 0,
        total_spent: Number(req.body.totalSpent) || 0,
      },
    ])
    .select()
    .single()
  if (error) return sendInvalidData(res, error)
  res.status(201).json(toCustomer(data))
})

app.get('/customers/:id', async (req, res) => {
  if (!requireSupabase(res)) return

  const storeId = requireStoreId(req, res)
  if (!storeId) return

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', req.params.id)
    .eq('store_id', storeId)
    .maybeSingle()
  if (error) return sendInvalidData(res, error)
  if (!customer) return res.status(404).json({ message: 'Customer not found' })
  const { data: orders, error: ordersError } = await supabase.from('orders').select('*').eq('store_id', customer.store_id).eq('customer_id', customer.id)
  if (ordersError) return sendInvalidData(res, ordersError)
  res.json({ ...toCustomer(customer), orders: orders.map(toOrder) })
})

app.delete('/customers/:id', async (req, res) => {
  if (!requireSupabase(res)) return

  const storeId = requireStoreId(req, res)
  if (!storeId) return

  const { data, error } = await supabase
    .from('customers')
    .delete()
    .eq('id', req.params.id)
    .eq('store_id', storeId)
    .select('id')
    .maybeSingle()
  if (error) return sendInvalidData(res, error)
  if (!data) return res.status(404).json({ message: 'Customer not found' })
  res.json({ message: 'Customer deleted successfully' })
})

app.get('/stores', async (req, res) => {
  if (!requireSupabase(res)) return

  const { data, error } = await supabase.from('stores').select('*').order('created_at', { ascending: false })
  if (error) return sendInvalidData(res, error)
  res.json(data.map(toStore))
})

app.post('/stores', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const ownerId = req.body.owner_id ?? req.body.userId
    if (!ownerId) return res.status(400).json({ message: 'userId is required' })

    const name = String(req.body.name ?? '').trim()
    if (!name) return res.status(400).json({ message: 'Store name is required' })

    const slug = normalizeStoreSlug(req.body.slug ?? req.body.url ?? name)
    if (!slug) return res.status(400).json({ message: 'Store Temporary URL is required' })

    const subdomain = normalizeStoreSubdomain(req.body.subdomain ?? slug)
    const payload = {
      owner_id: ownerId,
      name,
      slug,
      subdomain,
      address1: req.body.address1 ?? '',
      address2: req.body.address2 ?? '',
      logo_url: req.body.logoUrl ?? '',
      owner_email: req.body.ownerEmail ?? '',
      theme_id: req.body.themeId ?? 'minimal',
      theme_config: getThemeConfig(req.body.themeConfig),
      onboarding_step: Number(req.body.onboardingStep) || 1,
      is_onboarding_completed: Boolean(req.body.isOnboardingCompleted),
    }
    console.log('Creating store with:', payload)

    const { data, error } = await supabase
      .from('stores')
      .insert([payload])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return res.status(400).json({ message: 'Store Temporary URL already used' })
      return sendInvalidData(res, error)
    }

    res.status(201).json(toStore(data))
  } catch (error) {
    sendServerError(res, error)
  }
})

app.put('/stores/:id', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const update = {}
    if (req.body.name !== undefined) {
      const name = String(req.body.name ?? '').trim()
      if (!name) return res.status(400).json({ message: 'Store name is required' })
      update.name = name
    }
    if (req.body.url !== undefined || req.body.slug !== undefined) {
      const slug = normalizeStoreSlug(req.body.slug ?? req.body.url)
      if (slug) {
        update.slug = slug
        update.subdomain = normalizeStoreSubdomain(req.body.subdomain ?? slug)
      }
    }
    if (req.body.ownerEmail !== undefined) update.owner_email = req.body.ownerEmail
    if (req.body.themeId !== undefined) update.theme_id = req.body.themeId
    if (req.body.themeConfig !== undefined) update.theme_config = getThemeConfig(req.body.themeConfig)
    if (req.body.onboardingStep !== undefined) update.onboarding_step = Number(req.body.onboardingStep) || 1
    if (req.body.isOnboardingCompleted !== undefined) update.is_onboarding_completed = Boolean(req.body.isOnboardingCompleted)
    if (req.body.logoUrl !== undefined) update.logo_url = req.body.logoUrl

    if (req.body.isDefault !== undefined) {
      let isDefaultColumnMissing = false
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', req.params.id)
        .maybeSingle()

      if (storeError) return sendInvalidData(res, storeError)
      if (!store) return res.status(404).json({ message: 'Store not found' })

      if (Boolean(req.body.isDefault)) {
        const { error: clearError } = await supabase
          .from('stores')
          .update({ is_default: false })
          .eq('owner_id', store.owner_id)

        if (clearError?.code === '42703') {
          console.error('Default store column is missing. Apply 20260420_default_store.sql to persist defaults.')
          isDefaultColumnMissing = true
        } else if (clearError) {
          return sendInvalidData(res, clearError)
        }
      }

      if (isDefaultColumnMissing) {
        return res.json(toStore({ ...store, is_default: true }))
      }

      update.is_default = Boolean(req.body.isDefault)
    }

    const { data, error } = await supabase.from('stores').update(update).eq('id', req.params.id).select().single()
    if (error) {
      if (error.code === '23505') return res.status(400).json({ message: 'Store Temporary URL already used' })
      if (error.code === '42703' && req.body.isDefault !== undefined) {
        console.error('Default store column is missing. Apply 20260420_default_store.sql to persist defaults.')
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('id', req.params.id)
          .maybeSingle()

        if (storeError) return sendInvalidData(res, storeError)
        if (!store) return res.status(404).json({ message: 'Store not found' })
        return res.json(toStore({ ...store, is_default: Boolean(req.body.isDefault) }))
      }
      return sendInvalidData(res, error)
    }
    res.json(toStore(data))
  } catch (error) {
    sendServerError(res, error)
  }
})

app.get('/stores/detail/:id', async (req, res) => {
  if (!requireSupabase(res)) return

  const { data, error } = await supabase.from('stores').select('*').eq('id', req.params.id).maybeSingle()
  if (error) return sendInvalidData(res, error)
  if (!data) return res.status(404).json({ message: 'Store not found' })
  res.json(toStore(data))
})

app.delete('/stores/:id', async (req, res) => {
  if (!requireSupabase(res)) return
  const { error } = await supabase.from('stores').delete().eq('id', req.params.id)
  if (error) return sendInvalidData(res, error)
  res.json({ message: 'Store deleted successfully' })
})

app.put('/stores/:id/default', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const storeId = req.params.id
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .maybeSingle()

    if (storeError) {
      console.error('Failed to read store before setting default:', storeError)
      return res.status(500).json({ message: 'Failed to set default store' })
    }

    if (!store) return res.status(404).json({ message: 'Store not found' })

    const { error: clearError } = await supabase
      .from('stores')
      .update({ is_default: false })
      .eq('owner_id', store.owner_id)

    if (clearError?.code === '42703') {
      console.error('Default store column is missing. Apply 20260420_default_store.sql to persist defaults.')
      return res.status(500).json({ message: 'Default store column is missing' })
    }

    if (clearError) {
      console.error('Failed to clear previous default stores:', clearError)
      return res.status(500).json({ message: 'Failed to set default store' })
    }

    const { data, error } = await supabase
      .from('stores')
      .update({ is_default: true })
      .eq('id', storeId)
      .eq('owner_id', store.owner_id)
      .select()
      .maybeSingle()

    if (error?.code === '42703') {
      console.error('Default store column is missing. Apply 20260420_default_store.sql to persist defaults.')
      return res.status(500).json({ message: 'Default store column is missing' })
    }

    if (error) {
      console.error('Failed to update selected default store:', error)
      return res.status(500).json({ message: 'Failed to set default store' })
    }

    if (!data) {
      return res.status(404).json({ message: 'Store not found' })
    }

    res.status(200).json({
      success: true,
      message: 'Store set as default',
      store: toStore(data),
    })
  } catch (error) {
    console.error('Failed to set default store:', error)
    res.status(500).json({ message: 'Failed to set default store' })
  }
})

app.put('/stores/:id/theme', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const theme = await getThemeByIdentifier(req.body.themeId)

    if (!theme) {
      return res.status(400).json({ message: 'Invalid themeId' })
    }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle()

    if (storeError) return sendInvalidData(res, storeError)
    if (!store) return res.status(404).json({ message: 'Store not found' })

    const config = getThemeConfig(store.theme_config)
    const { error: deactivateError } = await supabase
      .from('store_themes')
      .update({ is_active: false })
      .eq('store_id', req.params.id)
      .eq('is_active', true)

    if (deactivateError) return sendInvalidData(res, deactivateError)

    const { error: storeThemeError } = await supabase
      .from('store_themes')
      .insert([{ store_id: req.params.id, theme_id: theme.id, config, is_active: true }])

    if (storeThemeError) return sendInvalidData(res, storeThemeError)

    const { data, error } = await supabase
      .from('stores')
      .update({ theme_id: theme.code, theme_config: config })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return sendInvalidData(res, error)
    res.json(toStore(data))
  } catch (error) {
    sendServerError(res, error)
  }
})

app.put('/stores/:id/theme-config', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const config = getThemeConfig(req.body.themeConfig)
    const { data, error } = await supabase
      .from('stores')
      .update({ theme_config: config })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return sendInvalidData(res, error)

    await ensureActiveStoreTheme(data, config)
    res.json(toStore(data))
  } catch (error) {
    sendServerError(res, error)
  }
})

app.get('/stores/check-slug', checkStoreSlugAvailability)

app.get('/stores/:userId', async (req, res) => {
  if (!requireSupabase(res)) return
  const { data, error } = await supabase.from('stores').select('*').eq('owner_id', req.params.userId).order('created_at', { ascending: false })
  if (error) return sendInvalidData(res, error)
  res.json(data.map(toStore))
})

app.get('/themes', async (req, res) => {
  if (!requireSupabase(res)) return

  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return sendInvalidData(res, error)
  res.json(data.map(toTheme))
})

app.get('/api/theme/:storeId', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const activeTheme = await getActiveThemeForStore(req.params.storeId)

    if (!activeTheme) {
      return res.status(404).json({ message: 'Store not found' })
    }

    res.json({
      store: toStore(activeTheme.store),
      theme: toTheme(activeTheme.theme),
      config: activeTheme.config,
    })
  } catch (error) {
    sendServerError(res, error)
  }
})

app.post('/api/theme/config', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const storeId = req.body.storeId
    const config = getThemeConfig(req.body.config)

    if (!storeId) {
      return res.status(400).json({ message: 'storeId is required' })
    }

    const activeTheme = await getActiveThemeForStore(storeId)

    if (!activeTheme) {
      return res.status(404).json({ message: 'Store not found' })
    }

    const { error: storeThemeError } = await supabase
      .from('store_themes')
      .update({ config })
      .eq('store_id', storeId)
      .eq('is_active', true)

    if (storeThemeError) return sendInvalidData(res, storeThemeError)

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .update({ theme_config: config })
      .eq('id', storeId)
      .select()
      .single()

    if (storeError) return sendInvalidData(res, storeError)

    res.json({
      store: toStore(store),
      theme: toTheme(activeTheme.theme),
      config,
    })
  } catch (error) {
    sendServerError(res, error)
  }
})

app.get('/store-page/:storeId', async (req, res) => {
  if (!requireSupabase(res)) return

  const slug = req.query.slug ?? '/'
  const { data, error } = await supabase
    .from('store_pages')
    .select('*')
    .eq('store_id', req.params.storeId)
    .eq('slug', slug)
    .maybeSingle()

  if (error?.code === '42P01') {
    return res.json({
      storeId: req.params.storeId,
      name: 'homepage',
      slug,
      layout: null,
    })
  }

  if (error) return sendInvalidData(res, error)

  if (!data) {
    return res.json({
      storeId: req.params.storeId,
      name: 'homepage',
      slug,
      layout: null,
    })
  }

  res.json(toStorePage(data))
})

app.post('/api/page/save', async (req, res) => {
  if (!requireSupabase(res)) return

  const storeId = req.body.storeId
  const name = String(req.body.name || 'homepage').trim() || 'homepage'
  const slug = String(req.body.slug || '/').trim() || '/'
  const layout = req.body.layout && typeof req.body.layout === 'object' ? req.body.layout : getDefaultPageLayout()

  if (!storeId) {
    return res.status(400).json({ message: 'storeId is required' })
  }

  const { data, error } = await supabase
    .from('store_pages')
    .upsert([{ store_id: storeId, name, slug, layout }], { onConflict: 'store_id,slug' })
    .select()
    .single()

  if (error) return sendInvalidData(res, error)
  res.json(toStorePage(data))
})

console.log('Route /store/check-slug loaded')
async function checkStoreSlugAvailability(req, res) {
  if (!requireSupabase(res)) return

  try {
    let { slug } = req.query
    if (!slug || typeof slug !== 'string') return res.status(400).json({ available: false, error: 'Invalid slug' })
    slug = normalizeStoreSlug(slug)
    if (!slug) return res.status(400).json({ available: false, error: 'Invalid slug' })

    const subdomain = normalizeStoreSubdomain(slug)
    const fullSubdomain = normalizeStoreUrl(slug)
    let query = supabase
      .from('stores')
      .select('id')
      .or(`slug.eq.${slug},slug.eq.${subdomain},subdomain.eq.${slug},subdomain.eq.${subdomain},subdomain.eq.${fullSubdomain}`)
    if (req.query.excludeStoreId) query = query.neq('id', req.query.excludeStoreId)
    const { data, error } = await query.maybeSingle()
    if (error) return sendInvalidData(res, error)
    res.json({ available: !data })
  } catch (error) {
    sendServerError(res, error)
  }
}

app.get('/store/check-slug', checkStoreSlugAvailability)

app.get('/apps', (req, res) => {
  res.json(apps)
})

app.get('/store-apps/:storeId', async (req, res) => {
  if (!requireSupabase(res)) return
  const { data, error } = await supabase.from('store_apps').select('*').eq('store_id', req.params.storeId)
  if (error) return sendInvalidData(res, error)
  res.json(
    data.map((storeApp) => ({
      id: storeApp.id,
      storeId: storeApp.store_id,
      appId: storeApp.app_id,
      enabled: storeApp.enabled,
      app: apps.find((availableApp) => availableApp.id === storeApp.app_id) ?? null,
    })),
  )
})

app.post('/store-apps/install', async (req, res) => {
  if (!requireSupabase(res)) return
  const { storeId, appId } = req.body
  if (!storeId || !appId) return res.status(400).json({ message: 'storeId and appId are required' })
  if (!apps.some((app) => app.id === appId && app.isActive)) return res.status(400).json({ message: 'Invalid appId' })

  const { data, error } = await supabase
    .from('store_apps')
    .upsert([{ store_id: storeId, app_id: appId, enabled: true }], { onConflict: 'store_id,app_id' })
    .select()
    .single()
  if (error) return sendInvalidData(res, error)
  res.status(201).json({
    id: data.id,
    storeId: data.store_id,
    appId: data.app_id,
    enabled: data.enabled,
    app: apps.find((app) => app.id === data.app_id) ?? null,
  })
})

app.post('/store-apps/toggle', async (req, res) => {
  if (!requireSupabase(res)) return
  const { storeId, appId, enabled } = req.body
  if (!storeId || !appId || typeof enabled !== 'boolean') return res.status(400).json({ message: 'storeId, appId, and enabled are required' })
  const { data, error } = await supabase
    .from('store_apps')
    .update({ enabled })
    .eq('store_id', storeId)
    .eq('app_id', appId)
    .select()
    .single()
  if (error) return sendInvalidData(res, error)
  res.json({
    id: data.id,
    storeId: data.store_id,
    appId: data.app_id,
    enabled: data.enabled,
    app: apps.find((app) => app.id === data.app_id) ?? null,
  })
})

app.get('/store-by-url/:subdomain', async (req, res) => {
  if (!requireSupabase(res)) return

  const subdomain = normalizeStoreSubdomain(req.params.subdomain)
  console.log('Incoming:', subdomain)

  if (!subdomain) return res.status(400).json({ message: 'Invalid subdomain' })

  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('subdomain', subdomain)
    .maybeSingle()

  if (error) return sendInvalidData(res, error)
  if (!data) return res.status(404).json({ message: 'Store not found' })
  res.json(toStore(data))
})

app.post('/login', async (req, res) => {
  if (!requireSupabase(res)) return
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: req.body.email,
      password: req.body.password,
    })
    if (error) return res.status(401).json({ message: 'Invalid credentials' })
    res.json({ message: 'Login successful', user: data.user, session: data.session })
  } catch (error) {
    sendServerError(res, error)
  }
})

app.get('/users', async (req, res) => {
  if (!requireSupabase(res)) return
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) return sendInvalidData(res, error)
  res.json(data.users.map((user) => ({ id: user.id, email: user.email, isVerified: Boolean(user.email_confirmed_at) })))
})

app.get('/verify', (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?verified=true`)
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
