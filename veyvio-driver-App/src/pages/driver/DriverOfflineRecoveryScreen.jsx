import DriverMobileAuthLayout, { DriverAuthPrimaryButton, driverAuthLinkClass } from "@/components/driver/auth/DriverMobileAuthLayout"

const REVIEW_STATUSES = new Set(["RECONCILIATION_REQUIRED", "MIGRATION_REVIEW_REQUIRED"])

function pluralise(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural
}

function recoveryStatusLabel(status) {
  return REVIEW_STATUSES.has(status) ? "Needs attention" : "Waiting to sync"
}

function evidenceLabel(item) {
  if (item?.odometerPresent && item?.signaturePresent) {
    return "Photo and signature saved on this device."
  }
  return "Saved evidence will be checked when you reconnect."
}

export default function DriverOfflineRecoveryScreen({ session, onRetry, onSignOut }) {
  const recovery = session?.recovery ?? {}
  const walkarounds = recovery.walkarounds ?? []
  const pendingChecks = Number(recovery.pendingChecks ?? 0)
  const pendingDefects = Number(recovery.pendingDefects ?? 0)
  const pendingReconciliation = Number(recovery.pendingReconciliation ?? 0)
  const hasSavedWork = pendingChecks > 0 || pendingDefects > 0 || pendingReconciliation > 0 || walkarounds.length > 0

  return (
    <DriverMobileAuthLayout
      title="Offline"
      subtitle="You're offline. Saved work will stay on this device until you're connected again."
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
          Reconnect to continue driver tasks. Anything already saved here will remain on this device until it can sync.
        </p>

        {hasSavedWork ? (
          <div className="space-y-2 text-sm text-slate-800">
            {pendingChecks > 0 ? (
              <p>
                <span className="font-semibold">{pendingChecks}</span> vehicle {pluralise(pendingChecks, "check")} waiting to sync
              </p>
            ) : null}
            {pendingDefects > 0 ? (
              <p>
                <span className="font-semibold">{pendingDefects}</span> defect {pluralise(pendingDefects, "report")} waiting to sync
              </p>
            ) : null}
            {pendingReconciliation > 0 ? (
              <p>
                <span className="font-semibold">{pendingReconciliation}</span> saved {pluralise(pendingReconciliation, "item")} need{pendingReconciliation === 1 ? "s" : ""} attention. Reconnect, then use Review and retry on Offline & sync.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No saved work is waiting to sync.</p>
        )}

        {walkarounds.length ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saved work</p>
            {walkarounds.map((item, index) => (
              <div
                key={item.clientCheckId || `saved-check-${index}`}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-slate-900">Vehicle check</p>
                  <p className="text-xs font-medium text-slate-600">{recoveryStatusLabel(item.status)}</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{evidenceLabel(item)}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </DriverMobileAuthLayout>
  )
}
