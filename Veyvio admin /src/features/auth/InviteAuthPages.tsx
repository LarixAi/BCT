import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AuthLayout, authInputClass, authLinkClass, authPrimaryButtonClass } from '@/components/brand/AuthLayout'
import { SectionCard } from '@/components/ui'
import { AuthenticatorQr } from '@/features/auth/AuthenticatorQr'
import { api, isMockApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

const COMMAND_ROLES = [
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'company_administrator', label: 'Company administrator' },
  { value: 'transport_manager', label: 'Transport manager' },
  { value: 'yard_manager', label: 'Yard manager' },
  { value: 'compliance_manager', label: 'Compliance manager' },
  { value: 'read_only_auditor', label: 'Read-only auditor' },
] as const

const YARD_ROLES = [
  { value: 'yard_manager', label: 'Yard manager' },
  { value: 'yard_operative', label: 'Yard operative' },
] as const

export function InviteUsersPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [appType, setAppType] = useState<'COMMAND' | 'YARD'>('COMMAND')
  const [roleName, setRoleName] = useState('dispatcher')
  const [depotIds, setDepotIds] = useState<string[]>([])
  const [devToken, setDevToken] = useState<string | null>(null)
  const [error, setError] = useState('')

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => api.listInvitations(),
  })

  const { data: depots = [] } = useQuery({
    queryKey: ['depots'],
    queryFn: () => api.getDepots(),
    enabled: appType === 'YARD',
  })

  const roles = appType === 'YARD' ? YARD_ROLES : COMMAND_ROLES

  const create = useMutation({
    mutationFn: () =>
      api.createInvitation({
        email,
        roleName,
        appType,
        depotIds: appType === 'YARD' ? depotIds : undefined,
      }),
    onSuccess: (result) => {
      setEmail('')
      setDepotIds([])
      setDevToken(result.devInvitationToken ?? null)
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  function onAppTypeChange(next: 'COMMAND' | 'YARD') {
    setAppType(next)
    setRoleName(next === 'YARD' ? 'yard_manager' : 'dispatcher')
    setDepotIds([])
    setError('')
  }

  function toggleDepot(id: string) {
    setDepotIds((current) =>
      current.includes(id) ? current.filter((d) => d !== id) : [...current, id],
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Invitations</h1>
        <p className="text-sm text-ink-soft">
          Staff and yard users join by invitation only. Company is locked to{' '}
          <strong>{user?.tenantName ?? 'this operator'}</strong>. They cannot create a company from public signup.
        </p>
      </div>

      <SectionCard
        title={appType === 'YARD' ? 'Invite a Yard user' : 'Invite a Command user'}
        description="Sends a single-use link that expires in seven days. Yard invites require depot access."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setError('')
            if (appType === 'YARD' && depotIds.length === 0) {
              setError('Select at least one depot for Yard access')
              return
            }
            create.mutate()
          }}
        >
          <div className="flex flex-wrap items-end gap-3">
            <label className="w-44 text-sm">
              <span className="mb-1 block font-medium text-ink-soft">App</span>
              <select
                value={appType}
                onChange={(e) => onAppTypeChange(e.target.value as 'COMMAND' | 'YARD')}
                className="w-full rounded-lg border border-border-strong px-3 py-2"
              >
                <option value="COMMAND">Veyvio Command</option>
                <option value="YARD">Veyvio Yard</option>
              </select>
            </label>
            <label className="min-w-[220px] flex-1 text-sm">
              <span className="mb-1 block font-medium text-ink-soft">Work email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border-strong px-3 py-2"
              />
            </label>
            <label className="w-52 text-sm">
              <span className="mb-1 block font-medium text-ink-soft">Role</span>
              <select
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="w-full rounded-lg border border-border-strong px-3 py-2"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded-lg bg-command-600 px-4 py-2 text-sm font-semibold text-white hover:bg-command-700 disabled:opacity-60"
            >
              {create.isPending ? 'Sending…' : 'Create invitation'}
            </button>
          </div>

          {appType === 'YARD' && (
            <div className="rounded-lg border border-border bg-surface-muted/40 p-3">
              <p className="mb-2 text-sm font-medium text-ink">Depot access</p>
              <p className="mb-3 text-xs text-ink-soft">
                Yard users only see the depots you assign. Company stays locked to {user?.tenantName ?? 'this operator'}.
              </p>
              {depots.length === 0 ? (
                <p className="text-sm text-muted">No depots available. Add a depot before inviting Yard users.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {depots.map((depot) => {
                    const selected = depotIds.includes(depot.id)
                    return (
                      <button
                        key={depot.id}
                        type="button"
                        onClick={() => toggleDepot(depot.id)}
                        className={`rounded-lg border px-3 py-1.5 text-sm ${
                          selected
                            ? 'border-command-600 bg-command-50 font-semibold text-command-800'
                            : 'border-border-strong bg-white text-ink-soft hover:border-command-400'
                        }`}
                      >
                        {depot.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </form>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        {devToken && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Email delivery is not connected yet.{' '}
            <Link className="font-medium underline" to={`/accept-invitation?token=${encodeURIComponent(devToken)}`}>
              Open accept invitation link
            </Link>
          </p>
        )}
      </SectionCard>

      <SectionCard title="Pending and recent invitations" description={`${invitations.length} invitations`}>
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : invitations.length === 0 ? (
          <p className="text-sm text-muted">No invitations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3 font-medium">Email</th>
                  <th className="pb-2 pr-3 font-medium">App</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 font-medium">Expires</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2 pr-3">{row.email}</td>
                    <td className="py-2 pr-3">{row.appType}</td>
                    <td className="py-2 pr-3 capitalize">{row.status}</td>
                    <td className="py-2">{row.expiresAt ? new Date(row.expiresAt).toLocaleString('en-GB') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

export function AcceptInvitationPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<{ email: string; appType?: string } | null>(null)

  const preview = useQuery({
    queryKey: ['invitation-preview', token],
    queryFn: () => api.previewInvitation(token),
    enabled: Boolean(token),
    retry: false,
  })

  const isDriverInvite = preview.data?.appType === 'DRIVER'
  const isYardInvite = preview.data?.appType === 'YARD'

  useEffect(() => {
    if (!preview.data) return
    if (preview.data.firstName) setFirstName((current) => current || preview.data!.firstName!)
    if (preview.data.lastName) setLastName((current) => current || preview.data!.lastName!)
  }, [preview.data])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await api.acceptInvitation({ token, firstName, lastName, password })
      setDone({ email: result.email, appType: result.appType })
      if (result.appType !== 'DRIVER' && result.appType !== 'YARD') {
        navigate('/login')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invitation could not be accepted')
    } finally {
      setLoading(false)
    }
  }

  const acceptTitle = isDriverInvite
    ? 'Set up Veyvio Driver access'
    : isYardInvite
      ? 'Set up Veyvio Yard access'
      : 'Accept invitation'

  const acceptSubtitle = preview.data
    ? isDriverInvite
      ? `Create your Driver login for ${preview.data.companyName}`
      : isYardInvite
        ? `Create your Yard login for ${preview.data.companyName}`
        : `Join ${preview.data.companyName}`
    : 'Create your account from a secure invitation.'

  return (
    <AuthShell title={acceptTitle} subtitle={acceptSubtitle}>
      {!token && <p className="text-sm text-red-700">Missing invitation token.</p>}
      {preview.isError && <p className="text-sm text-red-700">{(preview.error as Error).message}</p>}
      {done?.appType === 'DRIVER' ? (
        <div className="space-y-3 text-sm text-ink-soft">
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">
            Login created for <strong>{done.email}</strong>. Your Driver app account is now linked.
          </p>
          <p>
            You can sign in with this email and password once the Driver app is available to you.
            An administrator may still need to activate the account before you can start duty.
          </p>
          <Link to="/login" className="inline-flex rounded-lg bg-command-600 px-4 py-2.5 text-sm font-semibold text-white">
            Continue to Command sign-in
          </Link>
        </div>
      ) : null}
      {done?.appType === 'YARD' ? (
        <div className="space-y-3 text-sm text-ink-soft">
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">
            Login created for <strong>{done.email}</strong>. Your Yard access is ready.
          </p>
          <p>
            Sign in on Veyvio Yard with this email and password. You will only see the depots assigned on your invitation.
          </p>
        </div>
      ) : null}
      {preview.data && !done && (
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
          <p className="text-sm text-ink-soft">
            Invited as <strong>{preview.data.email}</strong>
            {isDriverInvite ? ' · Driver app' : isYardInvite ? ' · Yard app' : ' · Command'}
          </p>
          {(isDriverInvite || isYardInvite) ? (
            <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-soft">
              Choose your own password. Administrators cannot see or set it. This link is single-use and expires soon.
            </p>
          ) : null}
          <Field label="First name" value={firstName} onChange={setFirstName} required />
          <Field label="Last name" value={lastName} onChange={setLastName} required />
          <Field label="Password (min 12 characters)" value={password} onChange={setPassword} type="password" required />
          <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
            {loading
              ? 'Creating account…'
              : isDriverInvite
                ? 'Create Driver login'
                : isYardInvite
                  ? 'Create Yard login'
                  : 'Create account'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [devToken, setDevToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await api.forgotPassword(email)
      setMessage(result.message)
      setDevToken(result.devResetToken)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Forgot password" subtitle="We will send reset instructions if an account exists for this email.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Work email" value={email} onChange={setEmail} type="email" required />
        <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-ink-soft">{message}</p>}
      {devToken && (
        <p className="mt-3 text-sm text-amber-900">
          <Link className="underline" to={`/reset-password?token=${encodeURIComponent(devToken)}`}>
            Open temporary reset link
          </Link>
        </p>
      )}
      <p className="mt-4 text-center text-xs text-muted">
        <Link to="/login" className={authLinkClass}>Back to sign in</Link>
      </p>
    </AuthShell>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [token, setToken] = useState(params.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.resetPassword(token, password)
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Reset password" subtitle="Choose a new password. Existing sessions will be revoked.">
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <Field label="Reset token" value={token} onChange={setToken} required />
        <Field label="New password" value={password} onChange={setPassword} type="password" required />
        <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </AuthShell>
  )
}

export function MfaSetupPage() {
  const { refreshUser } = useAuth()
  const navigate = useNavigate()
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null)
  const [codes, setCodes] = useState<string[] | null>(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function startSetup() {
    setLoading(true)
    setError('')
    try {
      const result = await api.enableMfa()
      if (!result.secret || !result.otpauthUri) {
        throw new Error('Authenticator setup did not return a QR secret')
      }
      setSetup({ secret: result.secret, otpauthUri: result.otpauthUri })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA setup failed')
    } finally {
      setLoading(false)
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await api.enableMfa({ code: confirmCode })
      setCodes(result.recoveryCodes ?? [])
      await refreshUser()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA confirmation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Protect this administrator account"
      subtitle="Scan the QR code with your authenticator app, then enter the 6-digit code to finish."
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {codes ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">
            Store these recovery codes securely. Each code works once if you lose your authenticator.
          </p>
          <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
            {codes.map((code) => (
              <li key={code} className="rounded bg-surface-muted px-2 py-1">
                {code}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => navigate('/')} className={authPrimaryButtonClass}>
            Continue to Command
          </button>
        </div>
      ) : !setup ? (
        <button type="button" onClick={startSetup} disabled={loading} className={authPrimaryButtonClass}>
          {loading ? 'Preparing…' : 'Set up authenticator app'}
        </button>
      ) : (
        <form onSubmit={confirmSetup} className="space-y-4">
          <AuthenticatorQr otpauthUri={setup.otpauthUri} secret={setup.secret} />
          <Field
            label="6-digit code from your app"
            value={confirmCode}
            onChange={setConfirmCode}
            required
          />
          <button type="submit" disabled={loading || confirmCode.trim().length < 6} className={authPrimaryButtonClass}>
            {loading ? 'Confirming…' : 'Confirm and enable MFA'}
          </button>
        </form>
      )}
      {isMockApi && <p className="mt-3 text-xs text-emerald-800">Demo mode MFA is simulated locally.</p>}
    </AuthShell>
  )
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <AuthLayout title={title} subtitle={subtitle} wide>
      {children}
    </AuthLayout>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  const id = useMemo(() => label.toLowerCase().replace(/\s+/g, '-'), [label])
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-soft">{label}</label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={authInputClass}
      />
    </div>
  )
}

/** Roles that must complete MFA before operational access. */
export function requiresMfa(role: string | null | undefined, mfaEnabled: boolean | undefined) {
  if (mfaEnabled) return false
  const privileged = new Set([
    'company_owner',
    'company_administrator',
    'transport_manager',
    'dispatcher',
    'safeguarding_lead',
    'compliance_manager',
  ])
  return privileged.has(String(role ?? ''))
}
