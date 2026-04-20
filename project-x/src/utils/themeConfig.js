export const DEFAULT_THEME_CONFIG = {
  heroTitle: 'Welcome to your store',
  showBrands: true,
  primaryColor: '#000000',
  font: 'Inter',
  layout: 'grid',
}

export function getThemeConfig(themeConfig) {
  return {
    ...DEFAULT_THEME_CONFIG,
    ...(themeConfig ?? {}),
  }
}
