import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { createSession } from '../utils/auth.js'
import { loginUser } from '../utils/api.js'
import { isSupabaseConfigured, signInWithSupabase } from '../utils/supabase.js'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, initializeUserContext, isAppReady } = useAppContext()
  const { showToast } = useToast()
  const redirectTo = location.state?.from ?? '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isAppReady && currentUser) {
      navigate(redirectTo, { replace: true })
    }
  }, [currentUser, isAppReady, navigate, redirectTo])

  async function handleLogin(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const normalizedEmail = email.trim()
      let sessionUser = null

      if (isSupabaseConfigured) {
        const response = await signInWithSupabase({
          email: normalizedEmail,
          password,
        })

        sessionUser = response.user
      } else {
        const response = await loginUser({
          email: normalizedEmail,
          password,
        })

        sessionUser = response.user
      }

      localStorage.setItem('currentUser', JSON.stringify(sessionUser))
      createSession(sessionUser)
      await initializeUserContext(sessionUser)
      showToast('Welcome back!', 'success')
      navigate(redirectTo)
    } catch (error) {
      setErrorMessage(error.message || 'Login failed')
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-form-shell">
      <div className="auth-form-shell__header">
        <h2>Sign In</h2>
        <p>
          Need a Project X account?{' '}
          <Link className="auth-form__switch-link" to="/signup">
            Create an account
          </Link>
        </p>
      </div>

      <form className="auth-form" onSubmit={handleLogin}>
        <div className="auth-form__field">
          <label htmlFor="login-email">Email Address</label>
          <input
            id="login-email"
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setErrorMessage('')
            }}
          />
        </div>

        <div className="auth-form__field">
          <div className="auth-form__label-row">
            <label htmlFor="login-password">Password</label>
          </div>
          <div className="auth-form__password">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setErrorMessage('')
              }}
            />
            <button
              className="auth-form__icon-button"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'o' : 'x'}
            </button>
          </div>
        </div>

        <div className="auth-form__utility-row">
          <label className="auth-form__checkbox">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>Remember me</span>
          </label>

          <button className="auth-form__text-button" type="button">
            Forgot password?
          </button>
        </div>

        <Button className="auth-form__submit" fullWidth type="submit">
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      </form>

      <p className="auth-form__copyright">
        Copyright © 2026 Project X. All rights reserved.
      </p>
    </div>
  )
}

export default Login
