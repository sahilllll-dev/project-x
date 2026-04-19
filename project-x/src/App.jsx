import { useEffect } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import ApiProgressBar from './components/ApiProgressBar.jsx'
import AuthLayout from './layout/AuthLayout.jsx'
import MainLayout from './layout/MainLayout.jsx'
import Apps from './pages/Apps.jsx'
import AddProduct from './pages/AddProduct.jsx'
import BlogPost from './pages/BlogPost.jsx'
import CustomerDetails from './pages/CustomerDetails.jsx'
import Customers from './pages/Customers.jsx'
import Coupons from './pages/Coupons.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import Marketing from './pages/Marketing.jsx'
import OrderDetails from './pages/dashboard/OrderDetails.jsx'
import Orders from './pages/dashboard/Orders.jsx'
import Pages from './pages/Pages.jsx'
import Payments from './pages/Payments.jsx'
import Products from './pages/Products.jsx'
import ProductDetail from './pages/store/ProductDetail.jsx'
import Signup from './pages/Signup.jsx'
import StoreFront from './pages/store/StoreFront.jsx'
import Stores from './pages/Stores.jsx'
import Themes from './pages/Themes.jsx'
import ThemeSettings from './pages/ThemeSettings.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useToast } from './context/ToastContext.jsx'

const NEW_ORDER_EVENT = 'projectx:new-order'

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
  const { showToast } = useToast()

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
      if (location.pathname.startsWith('/store/') || location.pathname.startsWith('/product/')) {
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

  return (
    <>
      <ApiProgressBar />

      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>

        <Route path="/store/:storeName" element={<StoreFront />} />
        <Route path="/product/:slug" element={<ProductDetail />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/onboarding" element={<Dashboard />} />
            <Route path="/onboarding/:stepSlug" element={<Dashboard />} />
            <Route path="/stores" element={<Stores />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/new" element={<AddProduct />} />
            <Route path="/products/edit/:id" element={<AddProduct />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetails />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetails />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/themes" element={<Themes />} />
            <Route path="/dashboard/theme-settings" element={<ThemeSettings />} />
            <Route path="/dashboard/coupons" element={<Coupons />} />
            <Route path="/apps" element={<Apps />} />
            <Route path="/pages" element={<Pages />} />
            <Route path="/blog-post" element={<BlogPost />} />
          </Route>
        </Route>
      </Routes>

    </>
  )
}

export default App
