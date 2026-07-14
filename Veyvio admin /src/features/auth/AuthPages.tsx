import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, isMockApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState(isMockApi ? 'demo@veyvio.com' : '')
  const [password, setPassword] = useState(isMockApi ? 'demo' : '')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(email, password, rememberMe)
      if (result.requiresTenantSelection) {
        navigate('/select-company')
        return
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-command-600">Veyvio</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Command</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to your transport operations centre</p>
          {isMockApi && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Demo mode — any email and password will sign you in. No backend required.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
          )}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-command-500 focus:outline-none focus:ring-2 focus:ring-command-500/20"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-command-500 focus:outline-none focus:ring-2 focus:ring-command-500/20"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-slate-300"
            />
            Remember me
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-command-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-command-700 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          {isMockApi ? 'Running in frontend-only demo mode' : `API: ${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}`}
        </p>
      </div>
    </div>
  )
}

export function SelectCompanyPage() {
  const navigate = useNavigate()
  const { selectTenant } = useAuth()
  const memberships = api.getPendingMemberships()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  if (memberships.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-600">No companies available. Please sign in again.</p>
          <Link to="/login" className="mt-4 inline-block text-sm font-medium text-command-600 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  async function handleSelect(tenantId: string) {
    setError('')
    setLoading(tenantId)
    try {
      await selectTenant(tenantId)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not select company')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Select company</h1>
        <p className="mt-1 text-sm text-slate-600">Choose which transport company to manage</p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        )}

        <ul className="mt-6 space-y-2">
          {memberships.map((m) => (
            <li key={m.tenantId}>
              <button
                type="button"
                onClick={() => handleSelect(m.tenantId)}
                disabled={loading != null}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left hover:border-command-500 hover:bg-command-50 disabled:opacity-60"
              >
                <div>
                  <p className="font-medium text-slate-900">{m.tenantName}</p>
                  <p className="text-xs capitalize text-slate-500">{m.role.replace(/_/g, ' ')}</p>
                </div>
                <span className="text-xs text-command-600">
                  {loading === m.tenantId ? 'Loading…' : 'Select →'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}