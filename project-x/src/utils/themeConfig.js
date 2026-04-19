export const DEFAULT_THEME_CONFIG = {
  heroTitle: 'Welcome to your store',
  showBrands: true,
  primaryColor: '#111111',
}

export function getThemeConfig(themeConfig) {
  return {
    ...DEFAULT_THEME_CONFIG,
    ...(themeConfig ?? {}),
  }
}
