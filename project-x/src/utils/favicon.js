export const DEFAULT_FAVICON_HREF = '/favicon.svg'

function getFaviconType(href) {
  const dataUrlMatch = String(href).match(/^data:([^;,]+)/i)

  if (dataUrlMatch?.[1]) {
    return dataUrlMatch[1]
  }

  const normalizedHref = String(href).toLowerCase().split('?')[0]

  if (normalizedHref.endsWith('.svg')) return 'image/svg+xml'
  if (normalizedHref.endsWith('.png')) return 'image/png'
  if (normalizedHref.endsWith('.jpg') || normalizedHref.endsWith('.jpeg')) return 'image/jpeg'
  if (normalizedHref.endsWith('.ico')) return 'image/x-icon'
  return 'image/png'
}

export function setDocumentFavicon(href) {
  if (typeof document === 'undefined') {
    return
  }

  const nextHref = String(href || DEFAULT_FAVICON_HREF).trim() || DEFAULT_FAVICON_HREF
  const iconType = getFaviconType(nextHref)
  const iconLinks = Array.from(document.querySelectorAll("link[rel~='icon']"))
  const links = iconLinks.length > 0 ? iconLinks : [document.createElement('link')]

  links.forEach((link, index) => {
    if (!link.parentNode) {
      document.head.appendChild(link)
    }

    link.rel = index === 0 ? 'icon' : link.rel
    link.type = iconType
    link.href = nextHref
  })
}
