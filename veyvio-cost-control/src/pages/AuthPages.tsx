import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { DEMO_AUTH_EMAIL } from '../auth/demo-adapter'

function AuthFrame({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-mark" aria-hidden>
            V
          </div>
          <div>
            <div className="auth-product">Veyvio Finance</div>
            <div className="muted small">Secure cost control</div>
          </div>
        </div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
        <p className="auth-boundary">
          Finances only. Veyvio never asks for your bank password or Sage password.
        </p>
      </section>
    </main>
  )
}

export function SignInPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState(DEMO_AUTH_EMAIL)
  const [password, setPassword] = useState('demo-access')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [mfaCode, setMfaCode] = useState('')

  if (auth.status === 'signed_in') {
    const returnTo = params.get('returnTo')
    const safeReturnTo = returnTo?.startsWith('/') ? returnTo : '/'
    return (
      <Navigate
        to={`/auth/company?returnTo=${encodeURIComponent(safeReturnTo)}`}
        replace
      />
    )
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await auth.signIn({ email, password })
      const returnTo = params.get('returnTo')
      const safeReturnTo = returnTo?.startsWith('/') ? returnTo : '/'
      navigate(`/auth/company?returnTo=${encodeURIComponent(safeReturnTo)}`, {
        replace: true,
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sign in')
    } finally {
      setBusy(false)
    }
  }

  async function submitMfa(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await auth.completeMfa(mfaCode)
      const returnTo = params.get('returnTo')
      const safeReturnTo = returnTo?.startsWith('/') ? returnTo : '/'
      navigate(`/auth/company?returnTo=${encodeURIComponent(safeReturnTo)}`, {
        replace: true,
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not verify the code')
    } finally {
      setBusy(false)
    }
  }

  if (auth.status === 'mfa_required') {
    return (
      <AuthFrame
        title="Security check"
        subtitle="Enter the six-digit code from your authenticator app."
      >
        <form className="auth-form" onSubmit={submitMfa}>
          <label>
            <span>Authenticator code</span>
            <input
              className="auth-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ''))}
            />
          </label>
          {error ? <p className="callout critical">{error}</p> : null}
          <button className="btn auth-submit" type="submit" disabled={busy}>
            {busy ? 'Verifying…' : 'Verify and continue'}
          </button>
        </form>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame
      title="Sign in"
      subtitle="Use your authorised finance account. Access is limited by company and role."
    >
      <form className="auth-form" onSubmit={submit}>
        <label>
          <span>Email address</span>
          <input
            className="auth-input"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          <span>Password</span>
          <input
            className="auth-input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="callout critical">{error}</p> : null}
        <button className="btn auth-submit" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in securely'}
        </button>
      </form>
      <div className="auth-links">
        <Link to="/auth/forgot-password">Forgot password?</Link>
        <span>Demo: {DEMO_AUTH_EMAIL}</span>
      </div>
    </AuthFrame>
  )
}

export function CompanySelectionPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  if (!auth.identity) return <Navigate to="/auth/sign-in" replace />
  return (
    <AuthFrame
      title="Choose company"
      subtitle="Your permissions and financial records change with the selected company."
    >
      <div className="company-choice-list">
        {auth.identity.memberships.map((membership) => (
          <button
            type="button"
            className="company-choice"
            key={membership.organisationId}
            disabled={busyId !== null}
            onClick={() => {
              setBusyId(membership.organisationId)
              setError(null)
              void auth.selectOrganisation(membership.organisationId).then(() => {
                const returnTo = params.get('returnTo')
                navigate(returnTo?.startsWith('/') ? returnTo : '/', { replace: true })
              }).catch((reason) => {
                setError(reason instanceof Error ? reason.message : 'Could not open company')
              }).finally(() => setBusyId(null))
            }}
          >
            <span>
              <strong>{membership.organisationName}</strong>
              <small>{membership.role.replaceAll('_', ' ')}</small>
            </span>
            <span aria-hidden>{busyId === membership.organisationId ? '…' : '→'}</span>
          </button>
        ))}
      </div>
      {error ? <p className="callout critical">{error}</p> : null}
      {!auth.identity.memberships.length ? (
        <p className="callout critical">
          Your account is valid but has no active finance-company membership.
        </p>
      ) : null}
      <button className="btn-ghost auth-secondary" type="button" onClick={() => void auth.signOut()}>
        Sign out
      </button>
    </AuthFrame>
  )
}

export function ForgotPasswordPage() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await auth.requestPasswordReset(email)
      setSent(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not request reset')
    }
  }
  return (
    <AuthFrame
      title="Reset your password"
      subtitle="If the account exists, we will send a time-limited reset link."
    >
      {sent ? (
        <p className="callout healthy">
          Check your email. For security, this message is the same for every address.
        </p>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>Email address</span>
            <input
              className="auth-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {error ? <p className="callout critical">{error}</p> : null}
          <button className="btn auth-submit" type="submit">
            Send reset link
          </button>
        </form>
      )}
      <div className="auth-links">
        <Link to="/auth/sign-in">Back to sign in</Link>
      </div>
    </AuthFrame>
  )
}

export function ResetPasswordPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    try {
      await auth.updatePassword({ resetToken: params.get('token') ?? '', password })
      navigate('/auth/sign-in?reset=complete', { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not reset password')
    }
  }
  return (
    <AuthFrame title="Choose a new password" subtitle="The reset link is time-limited and single-use.">
      <form className="auth-form" onSubmit={submit}>
        <label>
          <span>New password</span>
          <input className="auth-input" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label>
          <span>Confirm password</span>
          <input className="auth-input" type="password" minLength={8} required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        </label>
        {error ? <p className="callout critical">{error}</p> : null}
        <button className="btn auth-submit" type="submit">Update password</button>
      </form>
    </AuthFrame>
  )
}

export function AcceptInvitationPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const signedIn = await auth.acceptInvitation({
        invitationToken: params.get('token') ?? '',
        displayName,
        password,
      })
      navigate(signedIn ? '/auth/company' : '/auth/sign-in?invitation=accepted', {
        replace: true,
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not accept invitation')
    }
  }
  return (
    <AuthFrame title="Accept finance invitation" subtitle="Create your account to access only the company and role shown in your invitation.">
      <form className="auth-form" onSubmit={submit}>
        <label><span>Your name</span><input className="auth-input" required value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
        <label><span>Create password</span><input className="auth-input" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error ? <p className="callout critical">{error}</p> : null}
        <button className="btn auth-submit" type="submit">Accept invitation</button>
      </form>
    </AuthFrame>
  )
}

export function AuthUnavailablePage() {
  return (
    <AuthFrame title="Sign-in is not configured" subtitle="Production access is closed until an approved identity provider is connected.">
      <p className="callout critical">No demonstration fallback is allowed in production authentication mode.</p>
    </AuthFrame>
  )
}
