export function getProductSlug(product, options = {}) {
  const useSeoSlug = options.useSeoSlug ?? true
  return useSeoSlug ? product?.seo?.slug || String(product?.id ?? '') : String(product?.id ?? '')
}

export function getProductUrl(product, options = {}) {
  return `/product/${encodeURIComponent(getProductSlug(product, options))}`
}
