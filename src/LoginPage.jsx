import { useState } from 'react'
import axios from 'axios'
import { useAuth } from './AuthContext'
import { useNavigate } from 'react-router-dom'
import { theme } from './theme'

const PIPELINE_PREVIEW = [
  { label: 'Profiling', done: true },
  { label: 'Cleaning', done: true },
  { label: 'Hypothesis', done: true },
  { label: 'Testing', active: true },
  { label: 'Visuals', done: false },
  { label: 'Report', done: false },
]

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (isLoading) return

    setError('')
    setIsLoading(true)

    const endpoint = isSignup ? 'signup' : 'login'

    try {
      const response = await axios.post(
        `http://127.0.0.1:8000/${endpoint}`,
        {
          email: email.trim(),
          password,
        }
      )

      login(response.data.access_token)
      navigate('/upload')
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        'Unable to connect to the server. Please try again.'

      setError(
        Array.isArray(message)
          ? message[0]?.msg || 'Please check your input.'
          : message
      )
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setIsSignup(!isSignup)
    setError('')
    setPassword('')
  }

  return (
    <div className="auth-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .auth-page {
          min-height: 100vh;
          display: flex;
          background: ${theme.colors.paper};
          font-family: ${theme.fonts.body};
        }

        /* --------------------------------
           LEFT BRAND PANEL
        -------------------------------- */

        .auth-brand {
          flex: 1;
          min-height: 100vh;
          background: ${theme.colors.ink};
          color: ${theme.colors.paper};
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          position: relative;
          overflow: hidden;
        }

        .auth-brand::before {
          content: "";
          position: absolute;
          width: 500px;
          height: 500px;
          border: 1px solid rgba(31, 111, 120, 0.12);
          border-radius: 50%;
          top: -250px;
          right: -250px;
        }

        .auth-brand::after {
          content: "";
          position: absolute;
          width: 420px;
          height: 420px;
          border: 1px solid rgba(31, 111, 120, 0.08);
          border-radius: 50%;
          bottom: -260px;
          left: -200px;
        }

        .brand-content {
          width: 100%;
          max-width: 480px;
          position: relative;
          z-index: 1;
        }

        .brand-mark {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2.5rem;
        }

        .brand-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: ${theme.fonts.mono};
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${theme.colors.teal};
          margin-bottom: 1.25rem;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${theme.colors.teal};
          box-shadow: 0 0 0 4px rgba(31, 111, 120, 0.12);
        }

        .brand-title {
          font-family: ${theme.fonts.display};
          font-size: clamp(38px, 4vw, 52px);
          font-weight: 500;
          line-height: 1.08;
          letter-spacing: -0.025em;
          margin: 0 0 1.25rem;
        }

        .brand-description {
          max-width: 440px;
          color: ${theme.colors.slate};
          font-size: 15px;
          line-height: 1.75;
          margin: 0 0 2.75rem;
        }

        /* --------------------------------
           PIPELINE
        -------------------------------- */

        .pipeline-label {
          font-family: ${theme.fonts.mono};
          font-size: 10px;
          color: ${theme.colors.slate};
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 10px;
        }

        .pipeline {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .pipeline-pill {
          font-family: ${theme.fonts.mono};
          font-size: 10px;
          padding: 6px 11px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: transform 0.2s ease;
        }

        .pipeline-pill:hover {
          transform: translateY(-1px);
        }

        .pipeline-pill.done {
          background: rgba(31, 111, 120, 0.22);
          color: rgba(255, 255, 255, 0.9);
        }

        .pipeline-pill.active {
          background: ${theme.colors.teal};
          color: white;
          border-color: ${theme.colors.teal};
          box-shadow: 0 5px 20px rgba(31, 111, 120, 0.22);
        }

        .pipeline-pill.pending {
          background: rgba(255, 255, 255, 0.045);
          color: ${theme.colors.slate};
        }

        @keyframes pipelinePulse {
          0%, 100% {
            box-shadow: 0 5px 20px rgba(31, 111, 120, 0.18);
          }

          50% {
            box-shadow: 0 5px 28px rgba(31, 111, 120, 0.42);
          }
        }

        .pipeline-pill.active {
          animation: pipelinePulse 2.2s ease-in-out infinite;
        }

        /* --------------------------------
           RIGHT FORM PANEL
        -------------------------------- */

        .auth-form-panel {
          flex: 1;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          background: ${theme.colors.paper};
        }

        .auth-form-container {
          width: 100%;
          max-width: 390px;
        }

        .form-header {
          margin-bottom: 2rem;
        }

        .form-kicker {
          font-family: ${theme.fonts.mono};
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: ${theme.colors.teal};
          margin-bottom: 10px;
        }

        .form-title {
          font-family: ${theme.fonts.display};
          font-size: 30px;
          font-weight: 500;
          color: ${theme.colors.ink};
          letter-spacing: -0.02em;
          margin: 0 0 8px;
        }

        .form-subtitle {
          color: ${theme.colors.slate};
          font-size: 13px;
          line-height: 1.6;
          margin: 0;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: ${theme.colors.ink};
          margin-bottom: 7px;
        }

        .input-wrapper {
          position: relative;
        }

        .auth-input {
          width: 100%;
          height: 46px;
          padding: 0 13px;
          border-radius: ${theme.radius};
          border: 1px solid ${theme.colors.border};
          background: ${theme.colors.surface};
          color: ${theme.colors.ink};
          font-family: ${theme.fonts.body};
          font-size: 14px;
          outline: none;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease,
            background 0.15s ease;
        }

        .auth-input.password-input {
          padding-right: 46px;
        }

        .auth-input::placeholder {
          color: ${theme.colors.slate};
          opacity: 0.65;
        }

        .auth-input:hover {
          border-color: rgba(31, 111, 120, 0.35);
        }

        .auth-input:focus {
          border-color: ${theme.colors.teal};
          background: white;
          box-shadow: 0 0 0 3px ${theme.colors.tealLight};
        }

        .password-toggle {
          position: absolute;
          right: 11px;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: none;
          color: ${theme.colors.slate};
          font-size: 11px;
          font-family: ${theme.fonts.mono};
          cursor: pointer;
          padding: 5px;
        }

        .password-toggle:hover {
          color: ${theme.colors.teal};
        }

        .error-message {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 12px;
          margin-bottom: 1rem;
          border-radius: ${theme.radius};
          background: rgba(179, 38, 30, 0.06);
          border: 1px solid rgba(179, 38, 30, 0.12);
          color: #B3261E;
          font-size: 12px;
          line-height: 1.5;
        }

        .error-icon {
          flex-shrink: 0;
          font-weight: 600;
        }

        .auth-button {
          width: 100%;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: none;
          border-radius: ${theme.radius};
          background: ${theme.colors.teal};
          color: white;
          font-family: ${theme.fonts.body};
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            opacity 0.15s ease,
            box-shadow 0.15s ease;
        }

        .auth-button:hover:not(:disabled) {
          opacity: 0.94;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(31, 111, 120, 0.18);
        }

        .auth-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .auth-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .auth-switch {
          text-align: center;
          margin: 1.5rem 0 0;
          color: ${theme.colors.slate};
          font-size: 12px;
        }

        .auth-switch-button {
          border: none;
          background: none;
          padding: 0;
          margin-left: 4px;
          color: ${theme.colors.teal};
          font-family: ${theme.fonts.body};
          font-size: 12px;
          cursor: pointer;
        }

        .auth-switch-button:hover {
          text-decoration: underline;
        }

        .security-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 2rem;
          color: ${theme.colors.slate};
          opacity: 0.7;
          font-family: ${theme.fonts.mono};
          font-size: 9px;
          letter-spacing: 0.04em;
        }

        .security-icon {
          font-size: 10px;
        }

        /* --------------------------------
           RESPONSIVE
        -------------------------------- */

        @media (max-width: 850px) {
          .auth-page {
            flex-direction: column;
          }

          .auth-brand {
            min-height: auto;
            padding: 2.5rem 2rem;
          }

          .brand-mark {
            margin-bottom: 1.5rem;
          }

          .brand-title {
            font-size: 38px;
          }

          .brand-description {
            margin-bottom: 1.75rem;
          }

          .auth-form-panel {
            min-height: auto;
            padding: 3rem 2rem;
          }
        }

        @media (max-width: 520px) {
          .auth-brand {
            padding: 2rem 1.5rem;
          }

          .auth-form-panel {
            padding: 2.5rem 1.5rem;
          }

          .brand-title {
            font-size: 34px;
          }

          .brand-description {
            font-size: 14px;
          }

          .pipeline-pill {
            font-size: 9px;
            padding: 5px 9px;
          }

          .form-title {
            font-size: 27px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pipeline-pill.active {
            animation: none;
          }

          .auth-button,
          .pipeline-pill {
            transition: none;
          }
        }
      `}</style>

      {/* ================================
          LEFT: PRODUCT / AGENT EXPERIENCE
      ================================= */}

      <section className="auth-brand">
        <div className="brand-content">

          {/* Agent network logo */}
          <div className="brand-mark" aria-hidden="true">
            <svg
              width="52"
              height="52"
              viewBox="0 0 52 52"
              fill="none"
            >
              <circle
                cx="13"
                cy="16"
                r="4.5"
                fill={theme.colors.teal}
              />

              <circle
                cx="39"
                cy="16"
                r="4.5"
                fill={theme.colors.teal}
                opacity="0.5"
              />

              <circle
                cx="26"
                cy="38"
                r="4.5"
                fill={theme.colors.teal}
                opacity="0.85"
              />

              <line
                x1="13"
                y1="16"
                x2="39"
                y2="16"
                stroke={theme.colors.teal}
                strokeWidth="1.5"
                opacity="0.35"
              />

              <line
                x1="13"
                y1="16"
                x2="26"
                y2="38"
                stroke={theme.colors.teal}
                strokeWidth="1.5"
                opacity="0.4"
              />

              <line
                x1="39"
                y1="16"
                x2="26"
                y2="38"
                stroke={theme.colors.teal}
                strokeWidth="1.5"
                opacity="0.4"
              />
            </svg>
          </div>

          <div className="brand-eyebrow">
            <span className="status-dot" />
            Autonomous data intelligence
          </div>

          <h1 className="brand-title">
            Your data,
            <br />
            understood.
          </h1>

          <p className="brand-description">
            Seven specialized AI agents profile, clean, test, and report
            on your dataset in sequence — with every important decision
            visible and reviewable.
          </p>

          <div className="pipeline-label">
            Agent pipeline
          </div>

          <div className="pipeline">
            {PIPELINE_PREVIEW.map((step) => (
              <span
                key={step.label}
                className={`pipeline-pill ${
                  step.active
                    ? 'active'
                    : step.done
                    ? 'done'
                    : 'pending'
                }`}
              >
                {step.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================================
          RIGHT: AUTHENTICATION FORM
      ================================= */}

      <section className="auth-form-panel">
        <div className="auth-form-container">

          <div className="form-header">
            <div className="form-kicker">
              Secure workspace
            </div>

            <h2 className="form-title">
              {isSignup ? 'Create your account' : 'Welcome back'}
            </h2>

            <p className="form-subtitle">
              {isSignup
                ? 'Create an account to start analyzing your datasets.'
                : 'Sign in to continue to your data workspace.'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>

            {/* Email */}
            <div className="form-group">
              <label
                className="form-label"
                htmlFor="email"
              >
                Email
              </label>

              <input
                id="email"
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label
                className="form-label"
                htmlFor="password"
              >
                Password
              </label>

              <div className="input-wrapper">
                <input
                  id="password"
                  className="auth-input password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete={
                    isSignup
                      ? 'new-password'
                      : 'current-password'
                  }
                  required
                  disabled={isLoading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="error-message"
                role="alert"
              >
                <span className="error-icon">!</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              className="auth-button"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner" />
                  {isSignup
                    ? 'Creating account...'
                    : 'Signing in...'}
                </>
              ) : (
                <>
                  {isSignup ? 'Create account' : 'Log in'}
                </>
              )}
            </button>
          </form>

          {/* Switch login/signup */}
          <p className="auth-switch">
            {isSignup
              ? 'Already have an account?'
              : "Don't have an account?"}

            <button
              type="button"
              className="auth-switch-button"
              onClick={toggleMode}
              disabled={isLoading}
            >
              {isSignup ? 'Log in' : 'Sign up'}
            </button>
          </p>

          <div className="security-note">
            <span className="security-icon">◇</span>
            Your workspace is private
          </div>

        </div>
      </section>
    </div>
  )
}

export default LoginPage