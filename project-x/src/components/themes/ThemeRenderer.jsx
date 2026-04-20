import MinimalTheme from './MinimalTheme.jsx'
import ModernTheme from './ModernTheme.jsx'
import KallesTheme from './KallesTheme.jsx'
import { getThemeConfig } from '../../utils/themeConfig.js'

function ThemeRenderer({
  themeCode = 'minimal',
  config = {},
  store,
  products = [],
  onBuyNow = () => {},
  useSeoProductUrls = true,
}) {
  const themeConfig = getThemeConfig(config)
  const previewStore = {
    ...(store ?? {}),
    themeConfig,
  }
  const themeProps = {
    products,
    store: previewStore,
    onBuyNow,
    useSeoProductUrls,
  }

  if (themeCode === 'modern') {
    return <ModernTheme {...themeProps} />
  }

  if (themeCode === 'kalles') {
    return <KallesTheme {...themeProps} />
  }

  return <MinimalTheme {...themeProps} />
}

export default ThemeRenderer
