export function getProductSlug(product, options = {}) {
  const useSeoSlug = options.useSeoSlug ?? true
  return useSeoSlug ? product?.seo?.slug || String(product?.id ?? '') : String(product?.id ?? '')
}

export function getProductUrl(product, options = {}) {
  const url = `/product/${encodeURIComponent(getProductSlug(product, options))}`

  if (!product?.storeId) {
    return url
  }

  return `${url}?storeId=${encodeURIComponent(product.storeId)}`
}
