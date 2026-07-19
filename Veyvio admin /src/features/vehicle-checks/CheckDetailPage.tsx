import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { LIFECYCLE_STATUS_LABELS, RELEASE_STATUS_LABELS } from '@/lib/checks/constants'
import { canMarkCheckVor, canReviewCheck } from '@/lib/checks/permissions'
import {
  ConditionalReleasePanel,
  OperationalImpactPanel,
  ResolveImpactPanel,
  SuspiciousFlagsPanel,
} from './components/CheckWorkflowPanels'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

export function CheckDetailPage() {
  const { checkId } = useParams<{ checkId: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const permissions = user?.permissions ?? []
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const { data: check, isLoading, error, isError } = useQuery({
    queryKey: ['check-detail', checkId],
    queryFn: () => api.getCheckDetail(checkId!),
    enabled: !!checkId,
  })

  const review = useMutation({
    mutationFn: (decision: 'approve' | 'reject' | 'request_redo') =>
      api.reviewCheck({ checkId: checkId!, decision }, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks-hub'] })
      queryClient.invalidateQueries({ queryKey: ['check-detail', checkId] })
    },
  })

  const markVor = useMutation({
    mutationFn: () => api.markVehicleVor(check!.vehicleId, { reason: 'Failed vehicle check', category: 'safety_check' }, actorName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['check-detail', checkId] }),
  })

  if (isLoading) return <p className="text-sm text-slate-500">Loading check…</p>
  if (isError || !check) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Check not found'}</p>
  }

  const canReview = canReviewCheck(permissions)
  const canVor = canMarkCheckVor(permissions)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/vehicle-checks" className="text-sm text-command-600 hover:underline">
            ← Vehicle Checks
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{check.registrationNumber}</h1>
          <p className="text-sm text-slate-600">
            {check.makeModel} · {check.fleetNumber} · {check.checkTypeLabel}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill status={check.operationalStatus} />
            <StatusPill status={check.lifecycleStatus} />
            {check.result && <StatusPill status={check.result} />}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canReview && check.lifecycleStatus === 'awaiting_review' && (
            <>
              <button type="button" onClick={() => review.mutate('approve')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white">
                Approve
              </button>
              <button type="button" onClick={() => review.mutate('request_redo')} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium">
                Request redo
              </button>
              <button type="button" onClick={() => review.mutate('reject')} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-800">
                Reject
              </button>
            </>
          )}
          {canVor && check.result === 'fail' && !check.vorStatus && (
            <button type="button" onClick={() => markVor.mutate()} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-800">
              Mark VOR
            </button>
          )}
          <Link to={`/vehicles/${check.vehicleId}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
            Open vehicle
          </Link>
        </div>
      </div>

      <OperationalImpactPanel check={check} />
      <SuspiciousFlagsPanel check={check} />
      <ResolveImpactPanel check={check} />
      <ConditionalReleasePanel check={check} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SectionCard title="Check summary">
          <dl className="space-y-2 text-sm">
            <Row label="Depot" value={check.depotName} />
            <Row label="Location" value={check.currentLocation ?? '—'} />
            <Row label="Release" value={RELEASE_STATUS_LABELS[check.operationalStatus] ?? check.operationalStatus} />
            <Row label="Lifecycle" value={LIFECYCLE_STATUS_LABELS[check.lifecycleStatus] ?? check.lifecycleStatus} />
            <Row label="Completed by" value={check.completedBy ?? '—'} />
            <Row label="Source" value={check.sourceApplication ?? '—'} />
            <Row label="Driver" value={check.currentDriverName ?? '—'} />
            <Row label="Assigned work" value={check.assignedRunReference ?? '—'} />
            <Row label="Template" value={check.templateVersion} />
            <Row label="Odometer" value={check.odometer != null ? String(check.odometer) : '—'} />
            <Row label="Fuel / charge" value={check.fuelLevel ?? '—'} />
            <Row
              label="Started"
              value={check.startedAt ? new Date(check.startedAt).toLocaleString('en-GB') : '—'}
            />
            <Row
              label="Submitted"
              value={check.submittedAt ? new Date(check.submittedAt).toLocaleString('en-GB') : '—'}
            />
            <Row label="Reviewer" value={check.reviewerName ?? 'Pending'} />
          </dl>
          </SectionCard>
        </div>

        <div className="lg:col-span-2">
          <SectionCard title="Check timeline">
          <ul className="space-y-2 text-sm">
            {check.timeline.map((e) => (
              <li key={e.id} className="flex gap-3 border-b border-slate-50 pb-2">
                <span className="shrink-0 text-xs text-slate-500">{new Date(e.occurredAt).toLocaleString('en-GB')}</span>
                <div>
                  <p className="font-medium">{e.action}</p>
                  <p className="text-xs text-slate-500">
                    {e.actorName} · {e.source}
                    {e.detail ? ` · ${e.detail}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          </SectionCard>
        </div>
      </div>

      {check.sections.length > 0 && (
        <SectionCard title="Full walkaround" description="Every question and answer from the driver submission">
          <div className="grid gap-3 md:grid-cols-2">
            {check.sections.map((s) => {
              const failed = /fail|no\s*\//i.test(s.answer)
              const advisory = /advisory/i.test(s.answer)
              return (
                <div
                  key={s.id}
                  className={`rounded-lg border p-3 ${
                    failed
                      ? 'border-red-200 bg-red-50/50'
                      : advisory
                        ? 'border-amber-200 bg-amber-50/50'
                        : 'border-slate-200'
                  }`}
                >
                  <p className="text-xs font-medium uppercase text-slate-500">{s.section.replace(/_/g, ' ')}</p>
                  <p className="text-sm font-medium">{s.question}</p>
                  <p
                    className={`mt-1 text-sm font-semibold ${
                      failed ? 'text-red-800' : advisory ? 'text-amber-900' : 'text-emerald-800'
                    }`}
                  >
                    {s.answer}
                  </p>
                  {s.notes && <p className="mt-1 text-xs text-amber-800">{s.notes}</p>}
                  {s.zone || s.damageType ? (
                    <p className="mt-1 text-xs text-slate-600">
                      {[s.zone, s.damageType].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                  {s.photoDataUrl ? (
                    <img
                      src={s.photoDataUrl}
                      alt={`Evidence for ${s.question}`}
                      className="mt-2 max-h-40 w-full rounded-md object-cover"
                    />
                  ) : null}
                  {s.createdDefectId && <p className="mt-1 text-xs text-red-700">Created defect {s.createdDefectId}</p>}
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Evidence" description={`${check.evidence.length} items captured — originals preserved`}>
        {check.evidence.length === 0 ? (
          <p className="text-sm text-slate-500">No evidence uploaded with this check.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {check.evidence.map((e) => (
              <li key={e.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium capitalize">{e.kind.replace(/_/g, ' ')}</p>
                <p className="text-slate-600">{e.label}</p>
                <p className="text-xs text-slate-500">{new Date(e.capturedAt).toLocaleString('en-GB')}</p>
                {e.url ? (
                  <img src={e.url} alt={e.label} className="mt-2 max-h-48 w-full rounded-md object-cover" />
                ) : null}
                {!e.sufficient && <p className="text-xs text-amber-700">Insufficient</p>}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {check.defectSummaries.length > 0 && (
        <SectionCard title="Linked defects">
          <ul className="space-y-2 text-sm">
            {check.defectSummaries.map((d) => (
              <li key={d.id} className="flex justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span>{d.description}</span>
                <StatusPill status={d.severity} />
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}
