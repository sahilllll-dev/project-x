import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { subscribeToApiActivity } from '../utils/api.js'

function ApiProgressBar() {
  const location = useLocation()
  const [isVisible, setIsVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const hideTimerRef = useRef(null)
  const isPublicStorefrontRoute =
    location.pathname.startsWith('/store/') || location.pathname.startsWith('/product/')

  useEffect(() => {
    return subscribeToApiActivity(({ isLoading }) => {
      if (isPublicStorefrontRoute) {
        window.clearTimeout(hideTimerRef.current)
        setIsVisible(false)
        setProgress(0)
        return
      }

      window.clearTimeout(hideTimerRef.current)

      if (isLoading) {
        setIsVisible(true)
        setProgress((currentProgress) => (currentProgress > 0 ? currentProgress : 18))
        return
      }

      setProgress(100)
      hideTimerRef.current = window.setTimeout(() => {
        setIsVisible(false)
        setProgress(0)
      }, 260)
    })
  }, [isPublicStorefrontRoute])

  useEffect(() => {
    if (!isVisible || progress >= 90) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setProgress((currentProgress) => {
        if (currentProgress >= 90) {
          return currentProgress
        }

        return currentProgress + Math.max(1, (92 - currentProgress) * 0.08)
      })
    }, 220)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isVisible, progress])

  if (isPublicStorefrontRoute) {
    return null
  }

  return (
    <div
      className={`api-progress${isVisible ? ' api-progress--visible' : ''}`}
      aria-hidden="true"
    >
      <div className="api-progress__bar" style={{ transform: `scaleX(${progress / 100})` }} />
    </div>
  )
}

export default ApiProgressBar
