import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { signUpWithSupabase } from '../utils/supabase.js'

function Signup() {
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSignup(event) {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Email and password are required')
      showToast('Email and password are required', 'error')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const normalizedEmail = email.trim()

      const signupResult = await signUpWithSupabase({
        email: normalizedEmail,
        password,
      })

      console.log('Signup result:', signupResult, null)
      showToast('Account created successfully', 'success')
      setEmail('')
      setPassword('')
    } catch (error) {
      setErrorMessage(error.message || 'Signup failed')
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-form-shell">
      <div className="auth-form-shell__header">
        <h2>Get Started</h2>
        <p>Create your account to continue.</p>
      </div>

      <form className="auth-form" onSubmit={handleSignup}>
        <div className="auth-form__field">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setErrorMessage('')
            }}
          />
        </div>

        <div className="auth-form__field">
          <label htmlFor="signup-password">Password</label>
          <div className="auth-form__password">
            <input
              id="signup-password"
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
          {isSubmitting ? 'Sending...' : 'Create Account'}
        </Button>
        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      </form>

      <p className="auth-form__switch">
        Already have access?{' '}
        <Link className="auth-form__switch-link" to="/login">
          Login
        </Link>
      </p>
    </div>
  )
}

export default Signup
