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
  onAssignDispatch: () => void
  onAssignFleet: () => void
  onEscalate: () => void
  onInvestigating: () => void
  onClose: () => void
  onExport: () => void
}) {
  if (count === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
      <p className="mr-1 text-xs font-medium text-ink-soft">{count} selected</p>
      <BulkButton label="Assign to dispatcher" onClick={onAssignDispatch} />
      <BulkButton label="Assign to fleet" onClick={onAssignFleet} />
      <BulkButton label="Escalate" onClick={onEscalate} />
      <BulkButton label="Mark investigating" onClick={onInvestigating} />
      <BulkButton label="Close resolved" onClick={onClose} />
      <BulkButton label="Export" onClick={onExport} />
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
