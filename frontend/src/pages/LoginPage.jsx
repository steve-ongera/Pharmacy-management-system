// src/pages/LoginPage.jsx
import { useState } from 'react'
import { useAuth } from '@context/AuthContext'
import { getErrorMessage } from '@/utils/api'

export default function LoginPage() {
  const { login } = useAuth()
  const [creds, setCreds]     = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [showPw, setShowPw]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(creds)
    } catch (err) {
      setError(getErrorMessage(err) || 'Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-glow" aria-hidden="true" />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <i className="bi bi-capsule-pill" />
          </div>
          <h1>Pharma<span>OS</span></h1>
          <p>Pharmacy Management System</p>
        </div>

        {/* Form */}
        <div className="login-form-card">
          <h2>Welcome back</h2>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Username</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <i className="bi bi-person" />
                </span>
                <input
                  className={`form-control ${error ? 'is-invalid' : ''}`}
                  type="text"
                  placeholder="Enter your username"
                  autoComplete="username"
                  value={creds.username}
                  onChange={(e) => setCreds((p) => ({ ...p, username: e.target.value }))}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 22 }}>
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <i className="bi bi-lock" />
                </span>
                <input
                  className={`form-control ${error ? 'is-invalid' : ''}`}
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={creds.password}
                  onChange={(e) => setCreds((p) => ({ ...p, password: e.target.value }))}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="input-icon-right btn-ghost"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => setShowPw((p) => !p)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`} style={{ fontSize: 15 }} />
                </button>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                <i className="bi bi-exclamation-circle-fill" />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full login-submit"
              disabled={loading || !creds.username || !creds.password}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ borderTopColor: '#000' }} />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <i className="bi bi-arrow-right" />
                </>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
          PharmacOS v1.0 · Secure pharmacy management
        </p>
      </div>
    </div>
  )
}