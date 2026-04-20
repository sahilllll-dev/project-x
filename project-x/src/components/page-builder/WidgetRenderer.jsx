import { Link } from 'react-router-dom'
import { getProductUrl } from '../../utils/productUrls.js'

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

function HeadingWidget({ widget }) {
  return (
    <h1 className="builder-widget-heading" style={{ fontSize: Number(widget.fontSize) || 44 }}>
      {widget.content || 'Welcome to Store'}
    </h1>
  )
}

function TextWidget({ widget }) {
  return <p className="builder-widget-text">{widget.content || 'Add your store message here.'}</p>
}

function ImageWidget({ widget }) {
  return widget.src ? (
    <img className="builder-widget-image" src={widget.src} alt={widget.alt || ''} />
  ) : (
    <div className="builder-widget-image builder-widget-image--empty">Image</div>
  )
}

function ProductsWidget({ widget, products, onBuyNow, useSeoProductUrls }) {
  const visibleProducts = products.slice(0, Number(widget.limit) || 6)

  if (visibleProducts.length === 0) {
    return <p className="public-store__empty">No products found</p>
  }

  return (
    <div className="builder-products-grid">
      {visibleProducts.map((product) => {
        const isOutOfStock = Number(product.quantity) === 0
        const productImage = getProductImage(product)

        return (
          <article className="theme-product-card theme-product-card--minimal" key={product.id}>
            <Link
              className="theme-product-card__image"
              to={getProductUrl(product, { useSeoSlug: useSeoProductUrls })}
            >
              {productImage ? <img src={productImage} alt={product.title} /> : 'Product Image'}
            </Link>
            <div className="theme-product-card__content">
              <h2>
                <Link to={getProductUrl(product, { useSeoSlug: useSeoProductUrls })}>
                  {product.title}
                </Link>
              </h2>
              <strong>{formatCurrency(product.discountedPrice || product.price)}</strong>
              <button
                className="public-product-card__button"
                disabled={isOutOfStock}
                type="button"
                onClick={() => onBuyNow(product)}
              >
                Buy Now
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}

const widgetMap = {
  heading: HeadingWidget,
  text: TextWidget,
  image: ImageWidget,
  products: ProductsWidget,
}

function WidgetRenderer({ widget, products = [], onBuyNow = () => {}, useSeoProductUrls = true }) {
  const Widget = widgetMap[widget.type]

  if (!Widget) {
    return null
  }

  return (
    <Widget
      widget={widget}
      products={products}
      onBuyNow={onBuyNow}
      useSeoProductUrls={useSeoProductUrls}
    />
  )
}

export default WidgetRenderer
