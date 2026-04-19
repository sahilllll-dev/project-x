import { Link } from 'react-router-dom'
import { getThemeConfig } from '../../utils/themeConfig.js'
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

function ModernTheme({ products, store, onBuyNow, useSeoProductUrls = true }) {
  const themeConfig = getThemeConfig(store?.themeConfig)

  return (
    <main className="store-theme store-theme--modern">
      <header className="store-theme__header store-theme__header--modern">
        <div>
          <p className="store-theme__eyebrow">{store?.url}</p>
          <h1>{store?.name ?? 'Your Store'}</h1>
          <p className="store-theme__subtitle">{themeConfig.heroTitle}</p>
        </div>
      </header>

      {products.length === 0 ? (
        <p className="public-store__empty">No products available</p>
      ) : (
        <section className="store-theme__grid store-theme__grid--modern">
          {products.map((product) => {
            const isOutOfStock = Number(product.quantity) === 0

            return (
              <article className="theme-product-card theme-product-card--modern" key={product.id}>
                <Link
                  className="theme-product-card__image theme-product-card__image--modern"
                  to={getProductUrl(product, { useSeoSlug: useSeoProductUrls })}
                >
                  {getProductImage(product) ? (
                    <img src={getProductImage(product)} alt={product.title} />
                  ) : (
                    'Product Image'
                  )}
                </Link>
                <div className="theme-product-card__content">
                  <h2>
                    <Link to={getProductUrl(product, { useSeoSlug: useSeoProductUrls })}>
                      {product.title}
                    </Link>
                  </h2>
                  <strong>{formatCurrency(product.price)}</strong>
                  {isOutOfStock ? (
                    <span className="theme-product-card__badge theme-product-card__badge--modern">
                      Out of Stock
                    </span>
                  ) : null}
                  <button
                    className="public-product-card__button"
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => onBuyNow(product)}
                  >
                    Buy Now
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </main>
  )
}

export default ModernTheme
