import { Outlet } from 'react-router-dom'

function AuthLayout() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-card">
          <Outlet />
        </div>
      </section>

      <section className="auth-showcase" aria-label="Project X workspace preview">
        <div className="auth-showcase__image-placeholder">
          <span>Image Placeholder</span>
        </div>
      </section>
    </main>
  )
}

export default AuthLayout
