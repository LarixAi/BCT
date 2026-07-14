import { SectionCard } from '@/components/ui'
import { formatDate } from '@/components/ui/status'
import type { StaffProfile } from '@/lib/staff/types'

export function StaffSessionsPanel({ staff }: { staff: StaffProfile }) {
  return (
    <SectionCard title="Devices and sessions" description="Registered devices and active sign-in sessions">
      {staff.devices.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-medium text-slate-700">Registered devices</h3>
          <ul className="space-y-2 text-sm">
            {staff.devices.map((d) => (
              <li key={d.id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <div>
                  <p className="font-medium">{d.label}</p>
                  <p className="text-xs text-slate-500">{d.platform} · Last seen {formatDate(d.lastSeenAt.slice(0, 10))}</p>
                </div>
                <div className="text-xs text-slate-600">
                  {d.trusted ? 'Trusted' : 'Untrusted'}
                  {d.mfaRegistered ? ' · MFA registered' : ' · No MFA on device'}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {staff.sessions.length === 0 ? (
        <p className="text-sm text-slate-500">No active sessions.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {staff.sessions.map((s) => (
            <li key={s.id} className="rounded-lg border border-slate-200 px-3 py-2">
              <p className="font-medium">{s.deviceLabel}</p>
              <p className="text-xs text-slate-500">
                {s.application} · {s.ipAddress}{s.location ? ` · ${s.location}` : ''}
              </p>
              <p className="text-xs text-slate-500">
                Started {formatDate(s.startedAt.slice(0, 10))} · Last active {formatDate(s.lastActiveAt.slice(0, 10))}
                {s.current && <span className="ml-2 text-emerald-700">Current session</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-slate-500">
        SSO: {staff.account.ssoEnabled ? `Enabled (${staff.account.authProvider})` : 'Not enabled'} · MFA policy: {staff.account.mfaPolicy.replace(/_/g, ' ')}
      </p>
    </SectionCard>
  )
}
