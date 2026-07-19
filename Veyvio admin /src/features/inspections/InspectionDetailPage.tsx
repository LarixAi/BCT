import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import {
  INSPECTION_OUTCOME_LABELS,
  INSPECTION_STATUS_LABELS,
  INSPECTION_TYPE_LABELS,
  WORKFLOW_STEPS,
} from '@/lib/inspections/constants'
import { daysRemainingLabel } from '@/lib/inspections/due'
import { canSignOffInspection, inspectionSignOffBlockers } from '@/lib/inspections/sign-off'
import type { InspectionStatus } from '@/lib/inspections/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import { InspectionChecklistPanel } from './InspectionChecklistPanel'

function workflowIndex(status: InspectionStatus): number {
  if (status === 'failed' || status === 'held') return WORKFLOW_STEPS.indexOf('completed')
  if (status === 'incomplete') return WORKFLOW_STEPS.indexOf('in_progress')
  const idx = WORKFLOW_STEPS.indexOf(status as (typeof WORKFLOW_STEPS)[number])
  return idx >= 0 ? idx : 0
}

export function InspectionDetailPage() {
  const { inspectionId = '' } = useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const { data: inspection, isLoading, isError, error } = useQuery({
    queryKey: ['inspection', inspectionId],
    queryFn: () => api.getInspection(inspectionId),
    enabled: Boolean(inspectionId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inspection', inspectionId] })
    queryClient.invalidateQueries({ queryKey: ['inspections-hub'] })
  }

  const start = useMutation({
    mutationFn: () => api.startInspection(inspectionId, actorName),
    onSuccess: invalidate,
  })

  const signOff = useMutation({
    mutationFn: () => api.signOffInspection(inspectionId, actorName),
    onSuccess: invalidate,
  })

  if (isLoading) return <p className="text-sm text-slate-500">Loading inspection…</p>
  if (isError || !inspection) {
    return (
      <p className="text-sm text-red-800">
        {error instanceof Error ? error.message : 'Inspection not found'}
      </p>
    )
  }

  const stepIdx = workflowIndex(inspection.status)
  const blockers = inspectionSignOffBlockers(inspection)
  const canSign = canSignOffInspection(inspection)
  const yardPrepareHref = `/yard?task=prepare_for_service&vehicle=${encodeURIComponent(inspection.registrationNumber)}`
  const yardReturnHref = `/yard?task=return_inspection&vehicle=${encodeURIComponent(inspection.registrationNumber)}`

  return (
    <div className="space-y-6">
      <div>
        <Link to="/inspections" className="text-sm font-medium text-command-600 hover:underline">
          ← Inspections
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tabular-nums text-slate-900">
              {inspection.registrationNumber}
            </h1>
            <p className="text-sm text-slate-600">
              {INSPECTION_TYPE_LABELS[inspection.inspectionType]}
              {inspection.fleetNumber ? ` · ${inspection.fleetNumber}` : ''} · {inspection.depot}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['due', 'scheduled', 'prepared'].includes(inspection.status) && (
              <button
                type="button"
                onClick={() => start.mutate()}
                disabled={start.isPending}
                className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-60"
              >
                Start inspection
              </button>
            )}
            <Link
              to={yardPrepareHref}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Yard prepare
            </Link>
            <Link
              to={`/vehicles/${inspection.vehicleId}?tab=checks`}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Vehicle record
            </Link>
          </div>
        </div>
      </div>

      {inspection.driverInstruction && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Driver instruction</p>
          <p className="mt-0.5">{inspection.driverInstruction}</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Due</p>
          <p className="font-medium tabular-nums">{new Date(inspection.dueDate).toLocaleDateString('en-GB')}</p>
          <p className="text-xs text-slate-500">{daysRemainingLabel(inspection.dueDate)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Status</p>
          <StatusPill status={inspection.status} />
          <p className="mt-1 text-xs text-slate-500">
            {INSPECTION_STATUS_LABELS[inspection.status] ?? inspection.status}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Outcome</p>
          <p className="font-medium text-slate-900">
            {INSPECTION_OUTCOME_LABELS[inspection.outcome] ?? inspection.outcome}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Provider / inspector</p>
          <p className="font-medium text-slate-900">{inspection.provider}</p>
          <p className="text-xs text-slate-500">{inspection.inspectorName ?? 'Not assigned'}</p>
        </div>
      </div>

      <SectionCard title="Workflow" description="Closed loop from schedule through sign-off">
        <ol className="flex flex-wrap gap-2">
          {WORKFLOW_STEPS.map((step, i) => {
            const done = i <= stepIdx
            const current = i === stepIdx
            return (
              <li
                key={step}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  current
                    ? 'bg-command-600 text-white'
                    : done
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {INSPECTION_STATUS_LABELS[step] ?? step}
              </li>
            )
          })}
        </ol>
      </SectionCard>

      {inspection.inspectionType === 'safety_pmi' && (
        <InspectionChecklistPanel inspection={inspection} />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Defects raised" description="Shared defect records from this inspection">
          {inspection.linkedDefects.length === 0 ? (
            <p className="text-sm text-slate-500">No defects linked.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {inspection.linkedDefects.map((d) => (
                <li key={d.defectId} className="rounded-lg border border-slate-200 px-3 py-2">
                  <Link to={`/defects/${d.defectId}`} className="font-medium text-command-600 hover:underline">
                    {d.component}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {d.severity} · {d.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Linked maintenance work orders" description="Rectification owned by Maintenance">
          {inspection.linkedWorkOrders.length === 0 ? (
            <p className="text-sm text-slate-500">No work orders linked.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {inspection.linkedWorkOrders.map((w) => (
                <li key={w.workOrderId} className="rounded-lg border border-slate-200 px-3 py-2">
                  <Link
                    to={`/maintenance?tab=work-orders&wo=${w.workOrderId}&vehicle=${encodeURIComponent(inspection.registrationNumber)}`}
                    className="font-medium text-command-600 hover:underline"
                  >
                    {w.title}
                  </Link>
                  <p className="text-xs text-slate-500">{w.status}</p>
                  {w.workOrderId.startsWith('wo-') && inspection.inspectionType === 'safety_pmi' && (
                    <Link
                      to={`/maintenance?tab=pmi&wo=${w.workOrderId}`}
                      className="mt-1 inline-block text-xs text-command-600 hover:underline"
                    >
                      Open PMI lens
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link
            to={`/maintenance?tab=work-orders&vehicle=${encodeURIComponent(inspection.registrationNumber)}`}
            className="mt-3 inline-block text-sm font-medium text-command-600 hover:underline"
          >
            Raise / view work orders →
          </Link>
        </SectionCard>
      </div>

      <SectionCard title="Evidence" description="Checklist attachments and imports">
        {inspection.evidenceSummary.length === 0 && !inspection.importFileName ? (
          <p className="text-sm text-slate-500">No evidence recorded yet.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {inspection.importFileName && <li>Imported: {inspection.importFileName}</li>}
            {inspection.evidenceSummary.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Sign-off" description="Vehicle is not available until sign-off clears blockers">
        {inspection.status === 'signed_off' ? (
          <p className="text-sm text-emerald-800">
            Signed off {inspection.signedOffAt ? new Date(inspection.signedOffAt).toLocaleString('en-GB') : ''}
            {inspection.signedOffBy ? ` by ${inspection.signedOffBy}` : ''}.
          </p>
        ) : (
          <>
            {blockers.length > 0 ? (
              <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-red-800">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-sm text-slate-600">All sign-off checks are clear.</p>
            )}
            <button
              type="button"
              disabled={!canSign || signOff.isPending}
              onClick={() => signOff.mutate()}
              className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-60"
            >
              Sign off inspection
            </button>
            {signOff.isError && (
              <p className="mt-2 text-sm text-red-700">
                {signOff.error instanceof Error ? signOff.error.message : 'Sign-off failed'}
              </p>
            )}
          </>
        )}
        {(inspection.status === 'signed_off' || canSign) && (
          <p className="mt-3 text-sm">
            After sign-off, complete Yard return verification:{' '}
            <Link to={yardReturnHref} className="font-medium text-command-600 hover:underline">
              Open Yard return inspection
            </Link>
          </p>
        )}
      </SectionCard>
    </div>
  )
}
