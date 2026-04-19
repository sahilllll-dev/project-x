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
      showToast('Invalid credentials', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-form-shell">
      <div className="auth-form-shell__header">
        <h2>Login</h2>
        <p>
          Welcome Back! Please enter your credentials to login you account.
        </p>
      </div>

      <form className="auth-form" onSubmit={handleLogin}>
        <div className="auth-form__field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
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
            <button className="auth-form__text-button" type="button">
              Forgot?
            </button>
          </div>
          <div className="auth-form__password">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
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

        <Button className="auth-form__submit" fullWidth type="submit">
          {isSubmitting ? 'Signing in...' : 'Login'}
        </Button>
        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      </form>

      <p className="auth-form__switch">
        New to ProjectX?{' '}
        <Link className="auth-form__switch-link" to="/signup">
          Get Started
        </Link>
      </p>

      <p className="auth-form__terms">
        By continuing, you agree to our <a href="/">Terms of Use</a> and{' '}
        <a href="/">Privacy Policy.</a>
      </p>
    </div>
  )
}

export default Login
