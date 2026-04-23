import { useEffect } from 'react'
import { Route, Routes, useLocation, useNavigate, Navigate } from 'react-router-dom'
import ApiProgressBar from './components/ApiProgressBar.jsx'
import AuthLayout from './layout/AuthLayout.jsx'
import MainLayout from './layout/MainLayout.jsx'
import AddProduct from './pages/AddProduct.jsx'
import Categories from './pages/Categories.jsx'
import CustomerDetails from './pages/CustomerDetails.jsx'
import Customers from './pages/Customers.jsx'
import Coupons from './pages/Coupons.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import Marketing from './pages/Marketing.jsx'
import NewStoreOnboarding from './pages/NewStoreOnboarding.jsx'
import AppUsage from './pages/apps/AppUsage.jsx'
import OrderDetails from './pages/dashboard/OrderDetails.jsx'
import Orders from './pages/dashboard/Orders.jsx'
import Pages from './pages/Pages.jsx'
import PagePreview from './pages/PagePreview.jsx'
import Payments from './pages/Payments.jsx'
import Products from './pages/Products.jsx'
import ProductDetail from './pages/store/ProductDetail.jsx'
import StoreSettings from './pages/settings/StoreSettings.jsx'
import Signup from './pages/Signup.jsx'
import StoreFront from './pages/store/StoreFront.jsx'
import Stores from './pages/Stores.jsx'
import Themes from './pages/Themes.jsx'
import VisualEditor from './pages/VisualEditor.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useAppContext } from './context/AppContext.jsx'
import { useToast } from './context/ToastContext.jsx'
import { setDocumentFavicon } from './utils/favicon.js'

const NEW_ORDER_EVENT = 'projectx:new-order'

function isProjectXSubdomain() {
  if (typeof window === 'undefined') {
    return false
  }

  const hostname = window.location.hostname.toLowerCase()
  if (!hostname.endsWith('.projectx.com')) {
    return false
  }

  const slug = hostname.split('.')[0]
  return Boolean(slug && !['www', 'app'].includes(slug))
}

function HomeRoute() {
  return isProjectXSubdomain() ? <StoreFront /> : <Navigate to="/login" />
}

function playOrderNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext

    if (!AudioContext) {
      return
    }

    const audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.12)
    gain.gain.setValueAtTime(0.001, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.28)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (error) {
    console.error(error)
  }
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentStore } = useAppContext()
  const { showToast } = useToast()

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('API BASE:', import.meta.env.VITE_API_BASE_URL)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const verified = params.get('verified')

    if (verified === 'true') {
      showToast('Your account is verified', 'success')
      params.delete('verified')
      navigate(
        {
          pathname: location.pathname,
          search: params.toString(),
        },
        { replace: true },
      )
    }
  }, [location.pathname, location.search, navigate, showToast])

  useEffect(() => {
    function handleNewOrder() {
      if (
        location.pathname.startsWith('/store/') ||
        location.pathname.startsWith('/product/')
      ) {
        return
      }

      showToast('New order received 🎉', 'success')
      playOrderNotificationSound()
    }

    window.addEventListener(NEW_ORDER_EVENT, handleNewOrder)

    return () => {
      window.removeEventListener(NEW_ORDER_EVENT, handleNewOrder)
    }
  }, [location.pathname, showToast])

  useEffect(() => {
    if (
      location.pathname.startsWith('/store/') ||
      location.pathname.startsWith('/product/')
    ) {
      return
    }

    setDocumentFavicon(currentStore?.faviconUrl)
  }, [currentStore?.faviconUrl, location.pathname])

  return (
    <>
      <ApiProgressBar />

      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>

        <Route path="/store/:storeName" element={<StoreFront />} />
        <Route path="/store/:storeName/*" element={<StoreFront />} />
        <Route path="/product/:slug" element={<ProductDetail />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<NewStoreOnboarding />} />
          <Route path="/onboarding/new" element={<NewStoreOnboarding />} />
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/stores" element={<Stores />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/products/new" element={<AddProduct />} />
            <Route path="/products/edit/:id" element={<AddProduct />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetails />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetails />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/admin/settings" element={<StoreSettings />} />
            <Route path="/admin/settings/branding" element={<StoreSettings />} />
            <Route path="/admin/settings/apps" element={<StoreSettings />} />
            <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
            <Route path="/settings/branding" element={<Navigate to="/admin/settings/branding" replace />} />
            <Route path="/settings/apps" element={<Navigate to="/admin/settings/apps" replace />} />
            <Route path="/themes" element={<Themes />} />
            <Route path="/dashboard/editor" element={<VisualEditor />} />
            <Route path="/dashboard/coupons" element={<Coupons />} />
            <Route path="/admin/apps/:appSlug" element={<AppUsage />} />
            <Route path="/apps/whatsapp" element={<Navigate to="/admin/apps/whatsapp-chat" replace />} />
            <Route path="/apps" element={<Navigate to="/admin/settings/apps" replace />} />
            <Route path="/pages" element={<Pages />} />
            <Route path="/pages/create" element={<Pages mode="create" />} />
            <Route path="/pages/edit/:id" element={<Pages mode="edit" />} />
            <Route path="/preview/page/:slug" element={<PagePreview />} />
          </Route>
        </Route>
      </Routes>
    </>
  )
}

export default App
