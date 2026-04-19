import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Toast from '../components/ui/Toast.jsx'

const ToastContext = createContext({
  showToast: () => {},
})

export function ToastProvider({ children }) {
  const location = useLocation()
  const hideTimerRef = useRef(null)
  const startedAtRef = useRef(0)
  const remainingTimeRef = useRef(3000)
  const isPublicStorefrontRoute =
    location.pathname.startsWith('/store/') || location.pathname.startsWith('/product/')
  const [toast, setToast] = useState({
    message: '',
    type: 'info',
    visible: false,
    token: 0,
  })

  const hideToast = useCallback(() => {
    setToast((currentToast) => ({
      ...currentToast,
      visible: false,
    }))
  }, [])

  const startHideTimer = useCallback((delay) => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
    }

    startedAtRef.current = Date.now()
    remainingTimeRef.current = delay
    hideTimerRef.current = window.setTimeout(hideToast, delay)
  }, [hideToast])

  const showToast = useCallback((message, type = 'info') => {
    if (isPublicStorefrontRoute) {
      return
    }

    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
    }

    const duration = 3000

    setToast((currentToast) => ({
      message,
      type,
      visible: true,
      token: currentToast.token + 1,
    }))

    startHideTimer(duration)
  }, [isPublicStorefrontRoute, startHideTimer])

  const pauseToast = useCallback(() => {
    if (!toast.visible || !hideTimerRef.current) {
      return
    }

    window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = null
    remainingTimeRef.current = Math.max(
      0,
      remainingTimeRef.current - (Date.now() - startedAtRef.current),
    )
  }, [toast.visible])

  const resumeToast = useCallback(() => {
    if (!toast.visible || hideTimerRef.current || remainingTimeRef.current <= 0) {
      return
    }

    startHideTimer(remainingTimeRef.current)
  }, [startHideTimer, toast.visible])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {!isPublicStorefrontRoute ? (
        <Toast
          message={toast.message}
          type={toast.type}
          visible={toast.visible}
          token={toast.token}
          onMouseEnter={pauseToast}
          onMouseLeave={resumeToast}
        />
      ) : null}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
