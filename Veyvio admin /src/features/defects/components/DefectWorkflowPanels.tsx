import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { DEFECT_RESTRICTION_OPTIONS } from '@/lib/defects/restrictions'
import { CLOSURE_REASON_LABELS, VERIFICATION_LEVEL_LABELS } from '@/lib/defects/verification'
import {
  canApplyDefectRestriction,
  canCloseDefect,
  canCompleteRepair,
  canReopenDefect,
  canVerifyDefect,
} from '@/lib/defects/permissions'
import type { DefectDetailRecord, DefectClosureReason } from '@/lib/defects/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

function invalidate(queryClient: ReturnType<typeof useQueryClient>, defectId: string) {
  queryClient.invalidateQueries({ queryKey: ['defects-hub'] })
  queryClient.invalidateQueries({ queryKey: ['defect-detail', defectId] })
  queryClient.invalidateQueries({ queryKey: ['maintenance-hub'] })
  queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
}

export function RepairWorkflowPanel({ defect }: { defect: DefectDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const permissions = user?.permissions ?? []
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canRepair = canCompleteRepair(permissions)

  const [diagnosis, setDiagnosis] = useState(defect.repair?.diagnosis ?? '')
  const [workPerformed, setWorkPerformed] = useState(defect.repair?.workPerformed ?? '')
  const [notes, setNotes] = useState('')

  const complete = useMutation({
    mutationFn: () =>
      api.completeDefectRepairHub(
        {
          defectId: defect.id,
          vehicleId: defect.vehicleId,
          diagnosis,
          workPerformed,
          repairType: 'permanent',
          notes: notes || undefined,
        },
        actorName,
      ),
    onSuccess: () => invalidate(queryClient, defect.id),
  })

  if (defect.defectStatus === 'closed') {
    return (
      <SectionCard title="Repair information">
        <p className="text-sm text-ink-soft">Defect closed — repair record retained in vehicle history.</p>
        {defect.repair && (
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Diagnosis" value={defect.repair.diagnosis ?? '—'} />
            <Row label="Work performed" value={defect.repair.workPerformed ?? '—'} />
            <Row label="Completed by" value={defect.repair.completedBy ?? '—'} />
          </dl>
        )}
      </SectionCard>
    )
  }

  if (defect.workflowStatus === 'awaiting_verification' || defect.repair?.completedAt) {
    return (
      <SectionCard title="Repair information" description="Repair completed — awaiting independent verification">
        <dl className="space-y-2 text-sm">
          <Row label="Work order" value={defect.repair?.linkedWorkOrderId ?? '—'} />
          <Row label="Technician" value={defect.repair?.technicianName ?? '—'} />
          <Row label="Diagnosis" value={(defect.repair?.diagnosis ?? diagnosis) || '—'} />
          <Row label="Work performed" value={(defect.repair?.workPerformed ?? workPerformed) || '—'} />
          <Row label="Completed" value={defect.repair?.completedAt ? new Date(defect.repair.completedAt).toLocaleString('en-GB') : '—'} />
        </dl>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Record repair" description="Technician diagnosis and work performed — moves defect to verification">
      {defect.repair?.linkedWorkOrderId && (
        <p className="mb-3 text-sm text-ink-soft">Linked job: {defect.repair.linkedWorkOrderId} ({defect.repair.workOrderStatus})</p>
      )}
      {canRepair ? (
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="text-ink-soft">Diagnosis</span>
            <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
          </label>
          <label className="block">
            <span className="text-ink-soft">Work performed</span>
            <textarea value={workPerformed} onChange={(e) => setWorkPerformed(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
          </label>
          <label className="block">
            <span className="text-ink-soft">Notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
          </label>
          <button
            type="button"
            disabled={!diagnosis || !workPerformed || complete.isPending}
            onClick={() => complete.mutate()}
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Mark repair complete
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted">Awaiting maintenance team to record repair.</p>
      )}
    </SectionCard>
  )
}

export function VerificationWorkflowPanel({ defect }: { defect: DefectDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const permissions = user?.permissions ?? []
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canVerify = canVerifyDefect(permissions)

  const [level, setLevel] = useState<1 | 2 | 3 | 4>(defect.verification?.requiredLevel ?? 1)
  const [method, setMethod] = useState('Physical inspection')
  const [notes, setNotes] = useState('')

  const verify = useMutation({
    mutationFn: (result: 'pass' | 'fail') =>
      api.verifyDefectHub(
        { defectId: defect.id, vehicleId: defect.vehicleId, result, level, method, notes: notes || undefined },
        actorName,
      ),
    onSuccess: () => invalidate(queryClient, defect.id),
  })

  const required = defect.verification?.requiredLevel ?? 1

  if (defect.defectStatus === 'closed') {
    return (
      <SectionCard title="Verification" description="Repair independently verified before closure">
        <dl className="space-y-2 text-sm">
          <Row label="Required level" value={VERIFICATION_LEVEL_LABELS[required]} />
          <Row label="Result" value={defect.verification?.result ?? '—'} />
          <Row label="Verified by" value={defect.verification?.verifiedBy ?? '—'} />
        </dl>
      </SectionCard>
    )
  }

  if (defect.workflowStatus !== 'awaiting_verification') {
    return (
      <SectionCard title="Verification" description={`Required: ${VERIFICATION_LEVEL_LABELS[required]}`}>
        <p className="text-sm text-muted">Verification is required after repair is completed.</p>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Repair verification" description={`Required: ${VERIFICATION_LEVEL_LABELS[required]}`}>
      {canVerify ? (
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="text-ink-soft">Verification level</span>
            <select value={level} onChange={(e) => setLevel(Number(e.target.value) as 1 | 2 | 3 | 4)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
              {([1, 2, 3, 4] as const).map((l) => (
                <option key={l} value={l}>{VERIFICATION_LEVEL_LABELS[l]}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-ink-soft">Method</span>
            <input value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
          </label>
          <label className="block">
            <span className="text-ink-soft">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={verify.isPending} onClick={() => verify.mutate('pass')} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
              Pass verification
            </button>
            <button type="button" disabled={verify.isPending} onClick={() => verify.mutate('fail')} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-800">
              Fail — reopen repair
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">Awaiting authorised verifier sign-off.</p>
      )}
    </SectionCard>
  )
}

export function RestrictionWorkflowPanel({ defect }: { defect: DefectDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const permissions = user?.permissions ?? []
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canRestrict = canApplyDefectRestriction(permissions)

  const [restrictionType, setRestrictionType] = useState<(typeof DEFECT_RESTRICTION_OPTIONS)[number]['type']>('day_shift_only')
  const [reason, setReason] = useState('')

  const apply = useMutation({
    mutationFn: () => {
      const option = DEFECT_RESTRICTION_OPTIONS.find((o) => o.type === restrictionType)!
      return api.applyDefectRestrictionHub(
        {
          defectId: defect.id,
          vehicleId: defect.vehicleId,
          restrictionType,
          label: option.label,
          reason: reason || `Restriction due to defect ${defect.defectRef}`,
        },
        actorName,
      )
    },
    onSuccess: () => invalidate(queryClient, defect.id),
  })

  const lift = useMutation({
    mutationFn: (restrictionId: string) =>
      api.liftDefectRestrictionHub(defect.vehicleId, restrictionId, defect.id, actorName),
    onSuccess: () => invalidate(queryClient, defect.id),
  })

  return (
    <SectionCard title="Operational restrictions" description="Controlled limits on vehicle use — expired restrictions must not continue silently">
      {defect.restrictions.length > 0 ? (
        <ul className="mb-4 divide-y divide-border text-sm">
          {defect.restrictions.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div>
                <p className="font-medium">{r.label}</p>
                <p className="text-xs text-muted">{r.reason}</p>
              </div>
              {canRestrict && (
                <button type="button" onClick={() => lift.mutate(r.id)} className="text-xs font-medium text-command-600 hover:underline">
                  Lift restriction
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-muted">No active restrictions linked to this defect.</p>
      )}
      {canRestrict && defect.defectStatus !== 'closed' && (
        <div className="space-y-3 border-t border-border pt-3 text-sm">
          <label className="block">
            <span className="text-ink-soft">Restriction type</span>
            <select value={restrictionType} onChange={(e) => setRestrictionType(e.target.value as typeof restrictionType)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
              {DEFECT_RESTRICTION_OPTIONS.map((o) => (
                <option key={o.type} value={o.type}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-ink-soft">Reason</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" placeholder="Authorised operational limit" />
          </label>
          <button type="button" disabled={apply.isPending} onClick={() => apply.mutate()} className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white">
            Apply restriction
          </button>
        </div>
      )}
    </SectionCard>
  )
}

export function CloseDefectPanel({ defect }: { defect: DefectDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const permissions = user?.permissions ?? []
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canClose = canCloseDefect(permissions)
  const canReopen = canReopenDefect(permissions)

  const [reason, setReason] = useState<DefectClosureReason>('permanently_repaired')
  const [reopenReason, setReopenReason] = useState('')

  const close = useMutation({
    mutationFn: () => api.closeDefectHub({ defectId: defect.id, vehicleId: defect.vehicleId, reason }, actorName),
    onSuccess: () => invalidate(queryClient, defect.id),
  })

  const reopen = useMutation({
    mutationFn: () => api.reopenDefectHub({ defectId: defect.id, vehicleId: defect.vehicleId, reason: reopenReason }, actorName),
    onSuccess: () => invalidate(queryClient, defect.id),
  })

  if (defect.defectStatus === 'closed') {
    return (
      <SectionCard title="Closure">
        <dl className="space-y-2 text-sm">
          <Row label="Reason" value={CLOSURE_REASON_LABELS[defect.closureReason ?? ''] ?? defect.closureReason ?? '—'} />
          <Row label="Closed by" value={defect.closedBy ?? '—'} />
        </dl>
        {canReopen && (
          <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
            <label className="block">
              <span className="text-ink-soft">Reopen reason</span>
              <input value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
            </label>
            <button type="button" disabled={!reopenReason || reopen.isPending} onClick={() => reopen.mutate()} className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-medium text-amber-900">
              Reopen defect
            </button>
          </div>
        )}
      </SectionCard>
    )
  }

  if (!canClose) return null

  return (
    <SectionCard title="Close defect" description="Only close when repair, evidence and verification requirements are met">
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="text-ink-soft">Close-out reason</span>
          <select value={reason} onChange={(e) => setReason(e.target.value as DefectClosureReason)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
            {Object.entries(CLOSURE_REASON_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <button type="button" disabled={close.isPending} onClick={() => close.mutate()} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted">
          Close without verification
        </button>
        <p className="text-xs text-muted">Safety-critical defects should be closed via verification pass.</p>
      </div>
    </SectionCard>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-36 shrink-0 text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  )
}
