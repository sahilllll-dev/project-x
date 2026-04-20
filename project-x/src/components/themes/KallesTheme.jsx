import { Link } from 'react-router-dom'
import { getThemeConfig } from '../../utils/themeConfig.js'
import { getProductUrl } from '../../utils/productUrls.js'

const HERO_BANNERS = [
  {
    title: 'Women',
    image:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
    size: 'large',
  },
  {
    title: 'Men',
    image:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
    size: 'large',
  },
  {
    title: 'Accessories',
    image:
      'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80',
    size: 'medium',
  },
  {
    title: 'Shoes',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
    size: 'medium',
  },
  {
    title: 'New Arrivals',
    image:
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
    size: 'medium',
  },
]

const BRANDS = ['Aster', 'Mode', 'North', 'Urban', 'Studio', 'Nova']

const NAV_ITEMS = ['Home', 'Shop', 'Products', 'Pages', 'Blog']

const CATEGORY_LINKS = ['Women', 'Men', 'Accessories', 'Shoes']
const FOOTER_LINKS = ['About Us', 'Contact', 'Shipping', 'Returns']
const SOCIAL_LINKS = ['Instagram', 'Facebook', 'Pinterest', 'TikTok']

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function getProductImage(product) {
  return (
    product?.image ||
    product?.imageUrl ||
    product?.thumbnail ||
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80'
  )
}

function KallesHeader({ store, primaryColor }) {
  return (
    <header className="kalles-theme__header">
      <div className="kalles-theme__brand">
        <span className="kalles-theme__brand-mark">K</span>
        <div>
          <strong>{store?.name ?? 'Your Store'}</strong>
          <p>{store?.url ?? 'fashion.projectx.com'}</p>
        </div>
      </div>

      <nav className="kalles-theme__nav" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <a href="#!" key={item}>
            {item}
          </a>
        ))}
      </nav>

      <div className="kalles-theme__actions" aria-label="Store actions">
        <button type="button" aria-label="Search" style={{ borderColor: primaryColor }}>
          Search
        </button>
        <button type="button" aria-label="Cart" style={{ borderColor: primaryColor }}>
          Cart
        </button>
      </div>
    </header>
  )
}

function HeroGrid({ heroTitle }) {
  return (
    <section className="kalles-hero-grid" aria-label="Featured categories">
      {HERO_BANNERS.map((banner, index) => (
        <article
          className={`kalles-hero-grid__item kalles-hero-grid__item--${banner.size}`}
          key={banner.title}
        >
          <img src={banner.image} alt={banner.title} />
          <div className="kalles-hero-grid__overlay">
            <span>Trending Edit</span>
            <h2>{index === 0 ? heroTitle : banner.title}</h2>
            <a href="#!">Shop Now</a>
          </div>
        </article>
      ))}
    </section>
  )
}

function BrandStrip() {
  return (
    <section className="kalles-brand-strip" aria-label="Featured brands">
      {BRANDS.map((brand) => (
        <div className="kalles-brand-strip__item" key={brand}>
          {brand}
        </div>
      ))}
    </section>
  )
}

function ProductGrid({ products, onBuyNow, primaryColor, useSeoProductUrls }) {
  return (
    <section className="kalles-products">
      <div className="kalles-products__heading">
        <div>
          <span>Curated Selection</span>
          <h2>Shop the latest drops</h2>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="public-store__empty">No products found</p>
      ) : (
        <div className="kalles-products__grid">
          {products.map((product) => {
            const isOutOfStock = Number(product.quantity) === 0
            const hasDiscount =
              Number(product.discountedPrice) > 0 &&
              Number(product.discountedPrice) < Number(product.price)

            return (
              <article className="kalles-product-card" key={product.id}>
                <Link
                  className="kalles-product-card__media"
                  to={getProductUrl(product, { useSeoSlug: useSeoProductUrls })}
                >
                  <img src={getProductImage(product)} alt={product.title} />
                  {hasDiscount ? <span className="kalles-product-card__badge">Sale</span> : null}
                  {isOutOfStock ? (
                    <span className="kalles-product-card__stock">Out of stock</span>
                  ) : null}
                </Link>

                <div className="kalles-product-card__content">
                  <h3>
                    <Link to={getProductUrl(product, { useSeoSlug: useSeoProductUrls })}>
                      {product.title}
                    </Link>
                  </h3>
                  <div className="kalles-product-card__price">
                    {hasDiscount ? (
                      <>
                        <strong>{formatCurrency(product.discountedPrice)}</strong>
                        <span>{formatCurrency(product.price)}</span>
                      </>
                    ) : (
                      <strong>{formatCurrency(product.price)}</strong>
                    )}
                  </div>

                  <button
                    className="kalles-product-card__button"
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => onBuyNow(product)}
                    style={{
                      backgroundColor: isOutOfStock ? undefined : primaryColor,
                      borderColor: primaryColor,
                    }}
                  >
                    {isOutOfStock ? 'Unavailable' : 'Buy Now'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <div className="kalles-products__footer">
        <button
          className="kalles-load-more"
          type="button"
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          Load More
        </button>
      </div>
    </section>
  )
}

function KallesFooter({ store }) {
  return (
    <footer className="kalles-footer">
      <div>
        <h3>{store?.name ?? 'Your Store'}</h3>
        <p>Modern essentials with a clean fashion storefront built for everyday browsing.</p>
      </div>
      <div>
        <h4>Categories</h4>
        <ul>
          {CATEGORY_LINKS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h4>Links</h4>
        <ul>
          {FOOTER_LINKS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h4>Socials</h4>
        <ul>
          {SOCIAL_LINKS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </footer>
  )
}

function KallesTheme({ products, store, onBuyNow, useSeoProductUrls = true }) {
  const themeConfig = getThemeConfig(store?.themeConfig)

  return (
    <main
      className="store-theme store-theme--kalles"
      style={{
        '--kalles-primary-color': themeConfig.primaryColor,
        color: themeConfig.primaryColor,
        fontFamily: themeConfig.font,
      }}
    >
      <KallesHeader store={store} primaryColor={themeConfig.primaryColor} />
      <HeroGrid heroTitle={themeConfig.heroTitle} />
      {themeConfig.showBrands ? <BrandStrip /> : null}
      <ProductGrid
        products={products}
        onBuyNow={onBuyNow}
        primaryColor={themeConfig.primaryColor}
        useSeoProductUrls={useSeoProductUrls}
      />
      <KallesFooter store={store} />
    </main>
  )
}

export default KallesTheme
