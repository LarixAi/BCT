export function ExceptionBulkBar({
  count,
  onAssignDispatch,
  onAssignFleet,
  onEscalate,
  onInvestigating,
  onClose,
  onExport,
}: {
  count: number
  onAssignDispatch?: () => void
  onAssignFleet?: () => void
  onEscalate?: () => void
  onInvestigating?: () => void
  onClose?: () => void
  onExport?: () => void
}) {
  if (count === 0) return null

  const actions: { label: string; onClick?: () => void }[] = [
    { label: 'Assign to dispatcher', onClick: onAssignDispatch },
    { label: 'Assign to fleet', onClick: onAssignFleet },
    { label: 'Escalate', onClick: onEscalate },
    { label: 'Mark investigating', onClick: onInvestigating },
    { label: 'Close resolved', onClick: onClose },
    { label: 'Export', onClick: onExport },
  ].filter((a) => a.onClick)

  if (actions.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
      <p className="mr-1 text-xs font-medium text-ink-soft">{count} selected</p>
      {actions.map((a) => (
        <BulkButton key={a.label} label={a.label} onClick={a.onClick!} />
      ))}
    </div>
  )
}

function BulkButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-surface-muted"
    >
      {label}
    </button>
  )
}
