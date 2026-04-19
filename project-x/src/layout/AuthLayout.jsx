import { Outlet } from 'react-router-dom'

function AuthLayout() {
  return (
    <main className="auth-shell">
      <section className="auth-showcase">
        <div className="auth-showcase__pattern" aria-hidden="true" />
        <div className="auth-showcase__content">
          <p className="auth-showcase__brand">PROJECT X</p>
          <h1>
            Your journey to success starts here. Build, manage, and grow your
            online store effortlessly.
          </h1>

          <div className="auth-stat auth-stat--primary">
            <p>250+ Stores Created in the Last 24 Hours</p>
            <span>5%</span>
          </div>

          <div className="auth-stat auth-stat--secondary">
            <p>5,000+ Products Added in the Last 24 Hours</p>
            <span>9%</span>
          </div>

          <div className="auth-plane auth-plane--left" aria-hidden="true" />
          <div className="auth-plane auth-plane--right" aria-hidden="true" />
        </div>
        <p className="auth-showcase__footer">2024. All rights reserved</p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <Outlet />
        </div>
      </section>
    </main>
  )
}

export default AuthLayout
