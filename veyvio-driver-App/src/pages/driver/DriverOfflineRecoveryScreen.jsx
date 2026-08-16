import DriverMobileAuthLayout, { DriverAuthPrimaryButton, driverAuthLinkClass } from "@/components/driver/auth/DriverMobileAuthLayout"

export default function DriverOfflineRecoveryScreen({ session, onRetry, onSignOut }) {
  const recovery = session?.recovery ?? {}
  const walkarounds = recovery.walkarounds ?? []
  const pendingChecks = recovery.pendingChecks ?? 0
  const pendingDefects = recovery.pendingDefects ?? 0
  const pendingReconciliation = recovery.pendingReconciliation ?? 0
  const displayName = session?.driver?.fullName ?? "Driver"
  const organisation = session?.organisationName || session?.driver?.organisationName || ""

  return (
    <DriverMobileAuthLayout
      title="Offline"
      subtitle="Command cannot be reached. Saved work is still on this device. This is not a live duty session."
      centerContent={false}
      stickyFooter={
        <div className="space-y-3">
          <DriverAuthPrimaryButton type="button" onClick={() => void onRetry?.()}>
            Try connection
          </DriverAuthPrimaryButton>
          <button type="button" onClick={() => void onSignOut?.()} className={`w-full py-2 text-sm ${driverAuthLinkClass}`}>
            Sign out
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-left">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Offline recovery only. Sign-on, dispatch, tenant switching, and vehicle assignment stay blocked until Command
          confirms your session.
        </p>
        <p className="text-sm text-slate-700">
          {displayName}
          {organisation ? ` · ${organisation}` : ""}
        </p>
        <ul className="space-y-1 text-sm text-slate-800">
          <li>Pending vehicle checks: {pendingChecks}</li>
          <li>Pending defects: {pendingDefects}</li>
          <li>Needs review: {pendingReconciliation}</li>
        </ul>
        {walkarounds.length ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saved vehicle checks</p>
            {walkarounds.map((item) => (
              <div key={item.clientCheckId} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <p className="font-medium text-slate-900">{item.status}</p>
                <p className="mt-1 break-all text-xs text-slate-600">{item.clientCheckId}</p>
                <p className="mt-1 text-xs text-slate-700">
                  Evidence on this device: odometer {item.odometerPresent ? "present" : "missing"} · signature{" "}
                  {item.signaturePresent ? "present" : "missing"} · {item.mediaPresentCount} media record
                  {item.mediaPresentCount === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No queued vehicle checks on this device.</p>
        )}
      </div>
    </DriverMobileAuthLayout>
  )
}
