import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AuthLayout, authInputClass, authLinkClass, authPrimaryButtonClass } from '@/components/brand/AuthLayout'
import { api, isMockApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { tenantSetupPath } from '@/features/auth/SignupPages'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, verifyMfa } = useAuth()
  const [email, setEmail] = useState(isMockApi ? 'demo@veyvio.com' : '')
  const [password, setPassword] = useState(isMockApi ? 'demo' : '')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mfa, setMfa] = useState<{
    challengeId: string
    companyId?: string | null
    devCode?: string
  } | null>(null)
  const [mfaCode, setMfaCode] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(email, password, rememberMe)
      if (result.requiresMfaChallenge && result.mfaChallengeId) {
        setMfa({
          challengeId: result.mfaChallengeId,
          companyId: result.pendingCompanyId,
          devCode: result.devMfaCode,
        })
        setMfaCode(result.devMfaCode ?? '')
        return
      }
      if (result.requiresTenantSelection) {
        navigate('/select-company')
        return
      }
      const setupPath = tenantSetupPath(result.tenantStatus)
      navigate(setupPath ?? '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!mfa) return
    setError('')
    setLoading(true)
    try {
      await verifyMfa({
        challengeId: mfa.challengeId,
        code: mfaCode,
        companyId: mfa.companyId,
      })
      navigate('/')
    } catch (err) {
      if (err && typeof err === 'object' && 'requiresTenantSelection' in err) {
        navigate('/select-company')
        return
      }
      setError(err instanceof Error ? err.message : 'MFA verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title={mfa ? 'Confirm MFA' : 'Sign in to Veyvio Command'}
      subtitle={
        mfa
          ? 'Enter the 6-digit code from your authenticator app, or a recovery code'
          : 'Use the email from your company invitation.'
      }
      footer={
        <div className="mt-6 space-y-2 text-center text-sm text-muted">
          {!mfa && (
            <p>
              <Link to="/forgot-password" className={authLinkClass}>
                Forgot password?
              </Link>
            </p>
          )}
          <p>
            First company representative?{' '}
            <Link to="/signup" className={authLinkClass}>
              Register your company
            </Link>
          </p>
        </div>
      }
    >
      {mfa ? (
        <form onSubmit={handleMfaSubmit} className="space-y-4">
          {error && <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}
          {mfa.devCode && (
            <p className="rounded-lg bg-attention/10 px-3 py-2 text-xs text-attention">
              Temporary MFA code for this environment: <strong className="text-ink">{mfa.devCode}</strong>
            </p>
          )}
          <div>
            <label htmlFor="mfa" className="mb-1 block text-sm font-medium text-ink-soft">
              Authenticator or recovery code
            </label>
            <input
              id="mfa"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              className={authInputClass}
            />
          </div>
          <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
            {loading ? 'Verifying…' : 'Verify and continue'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink-soft">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authInputClass}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink-soft">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputClass}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-border"
            />
            Remember me
          </label>

          <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}

export function SelectCompanyPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { selectTenant } = useAuth()
  const memberships = api.getPendingMemberships()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  if (memberships.length === 0) {
    return (
      <AuthLayout title="No companies available" subtitle="Sign in again to load your company memberships.">
        <Link to="/login" className={`inline-flex items-center justify-center ${authPrimaryButtonClass}`}>
          Back to sign in
        </Link>
      </AuthLayout>
    )
  }

  async function handleSelect(tenantId: string) {
    setError('')
    setLoading(tenantId)
    try {
      await selectTenant(tenantId)
      queryClient.clear()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not select company')
    } finally {
      setLoading(null)
    }
  }

  return (
    <AuthLayout title="Select company" subtitle="Choose which transport company to manage">
      {error && <p className="mb-4 rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}
      <ul className="space-y-2">
        {memberships.map((m) => (
          <li key={m.tenantId}>
            <button
              type="button"
              onClick={() => handleSelect(m.tenantId)}
              disabled={loading != null}
              className="flex w-full items-center justify-between rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3 text-left transition hover:border-command-500 hover:bg-command-50 disabled:opacity-60"
            >
              <div>
                <p className="font-medium text-ink">{m.tenantName}</p>
                <p className="text-xs capitalize text-muted">{m.role.replace(/_/g, ' ')}</p>
              </div>
              <span className="text-xs font-semibold text-command-600">
                {loading === m.tenantId ? 'Loading…' : 'Select →'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </AuthLayout>
  )
}
