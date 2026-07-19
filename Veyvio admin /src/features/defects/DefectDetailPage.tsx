import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { AVAILABILITY_LABELS, SEVERITY_DISPLAY, WORKFLOW_STATUS_LABELS } from '@/lib/defects/constants'
import { canTriageDefect, canMarkDefectVor } from '@/lib/defects/permissions'
import type { DefectTriageStatus } from '@/lib/vehicles/types'
import {
  CloseDefectPanel,
  RepairWorkflowPanel,
  RestrictionWorkflowPanel,
  VerificationWorkflowPanel,
} from './components/DefectWorkflowPanels'
import { EvidenceUploadPanel } from './components/EvidenceUploadPanel'
import { DefectSourcePanel } from './components/DefectSourcePanel'
import { DefectAuditPanel } from './components/DefectAuditPanel'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

type DetailTab = 'overview' | 'evidence' | 'triage' | 'repair' | 'verification' | 'restrictions' | 'impact' | 'history' | 'audit'

export function DefectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const [triageStatus, setTriageStatus] = useState<DefectTriageStatus>('validated')
  const [notes, setNotes] = useState('')
  const [createWorkOrder, setCreateWorkOrder] = useState(true)
  const [markVor, setMarkVor] = useState(false)

  const permissions = user?.permissions ?? []
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canTriage = canTriageDefect(permissions)
  const canMarkVor = canMarkDefectVor(permissions)
  const [showVorConfirm, setShowVorConfirm] = useState(false)
  const [vorReason, setVorReason] = useState('')

  const { data: defect, isLoading, error, isError } = useQuery({
    queryKey: ['defect-detail', id],
    queryFn: () => api.getDefectDetailById(id!),
    enabled: !!id,
  })

  const triage = useMutation({
    mutationFn: () =>
      api.triageDefectHub(
        {
          defectId: defect!.id,
          vehicleId: defect!.vehicleId,
          triageStatus,
          notes: notes || undefined,
          createWorkOrder,
          markVor,
        },
        actorName,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defects-hub'] })
      queryClient.invalidateQueries({ queryKey: ['defect-detail', id] })
      setActiveTab('overview')
    },
  })

  const markVorMutation = useMutation({
    mutationFn: () =>
      api.markDefectVorHub(
        { defectId: defect!.id, vehicleId: defect!.vehicleId, reason: vorReason || defect!.description },
        actorName,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defects-hub'] })
      queryClient.invalidateQueries({ queryKey: ['defect-detail', id] })
      setShowVorConfirm(false)
    },
  })

  if (isLoading) return <p className="text-sm text-slate-500">Loading defect…</p>
  if (isError || !defect) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Defect not found'}</p>
  }

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'triage', label: 'Assessment' },
    { id: 'repair', label: 'Repair' },
    { id: 'verification', label: 'Verification' },
    { id: 'restrictions', label: 'Restrictions' },
    { id: 'impact', label: 'Operational impact' },
    { id: 'history', label: 'History' },
    { id: 'audit', label: 'Audit' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/defects" className="text-sm text-command-600 hover:underline">
            ← Defects
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{defect.defectRef}</h1>
          <p className="text-sm text-slate-600">
            {defect.registrationNumber}
            {defect.fleetNumber ? ` · ${defect.fleetNumber}` : ''} · {defect.makeModel}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
              {SEVERITY_DISPLAY[defect.severity] ?? defect.severity}
            </span>
            <StatusPill status={defect.workflowStatus} />
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {AVAILABILITY_LABELS[defect.vehicleAvailability] ?? defect.vehicleAvailability}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canTriage && defect.triageStatus === 'pending' && (
            <button
              type="button"
              onClick={() => setActiveTab('triage')}
              className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              Triage defect
            </button>
          )}
          {defect.workflowStatus === 'awaiting_verification' && (
            <button
              type="button"
              onClick={() => setActiveTab('verification')}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              Verify repair
            </button>
          )}
          {canMarkVor && defect.vehicleAvailability !== 'vor' && (
            <button
              type="button"
              onClick={() => setShowVorConfirm((v) => !v)}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
            >
              Mark VOR
            </button>
          )}
          <Link to={`/vehicles/${defect.vehicleId}?tab=Defects`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
            Open vehicle
          </Link>
          {defect.linkedWorkOrderId && (
            <Link to="/maintenance?tab=work-orders" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
              Maintenance job
            </Link>
          )}
        </div>
      </div>

      {showVorConfirm && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4" data-testid="mark-vor-panel">
          <p className="text-sm font-medium text-red-900">Mark vehicle VOR for this defect</p>
          <textarea
            value={vorReason}
            onChange={(e) => setVorReason(e.target.value)}
            placeholder="Reason for VOR decision"
            className="mt-2 w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
            rows={2}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={markVorMutation.isPending}
              onClick={() => markVorMutation.mutate()}
              className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-medium text-white"
            >
              Confirm VOR
            </button>
            <button type="button" onClick={() => setShowVorConfirm(false)} className="rounded-lg px-3 py-1.5 text-sm text-slate-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      {defect.recurringWarning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {defect.recurringWarning}
        </div>
      )}

      {defect.operationalImpact.impactSummary && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
          <h2 className="text-sm font-semibold text-red-900">Operational impact</h2>
          <p className="mt-1 text-sm text-red-800">{defect.operationalImpact.impactSummary}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
              activeTab === t.id ? 'border-b-2 border-command-600 text-command-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Defect summary">
              <dl className="space-y-2 text-sm">
                <Row label="Title" value={defect.title} />
                <Row label="Description" value={defect.description} />
                <Row label="Category" value={defect.category} />
                <Row label="Component" value={defect.component} />
                <Row label="Severity" value={SEVERITY_DISPLAY[defect.severity] ?? defect.severity} />
                <Row label="Status" value={WORKFLOW_STATUS_LABELS[defect.workflowStatus] ?? defect.workflowStatus} />
                <Row label="Reported by" value={defect.reportedBy} />
                <Row label="Source" value={defect.source} />
                <Row label="Location" value={defect.location ?? defect.depotName} />
                <Row label="Assignee" value={defect.assignee ?? 'Unassigned'} />
                {defect.linkedCheckId && (
                  <Row label="Linked check" value={
                    <Link to={`/vehicle-checks/${defect.linkedCheckId}`} className="text-command-600 hover:underline">
                      {defect.linkedCheckId}
                    </Link>
                  } />
                )}
              </dl>
            </SectionCard>
            <SectionCard title="Vehicle impact">
              <dl className="space-y-2 text-sm">
                <Row label="Availability" value={AVAILABILITY_LABELS[defect.vehicleAvailability] ?? defect.vehicleAvailability} />
                <Row label="VOR applied" value={defect.vorApplied ? 'Yes' : 'No'} />
                <Row label="Open defects on vehicle" value={String(defect.operationalImpact.openDefectCount)} />
                <Row label="Assigned work" value={defect.assignedRunReference ?? '—'} />
                <Row label="Next departure" value={defect.nextDepartureTime ?? '—'} />
                <Row label="Driver" value={defect.operationalImpact.assignedDriverName ?? '—'} />
                {defect.restrictionLabel && <Row label="Restriction" value={defect.restrictionLabel} />}
                {defect.operationalImpact.dispatchBlocked && (
                  <Row label="Dispatch" value={defect.operationalImpact.dispatchBlockReason ?? 'Blocked'} />
                )}
              </dl>
            </SectionCard>
          </div>
          <DefectSourcePanel source={defect.sourceRecord} />
          {defect.safetyContext && (
            <SectionCard title="Safety assessment at report">
              <dl className="space-y-2 text-sm">
                {defect.safetyContext.symptoms && <Row label="Symptoms" value={defect.safetyContext.symptoms} />}
                <Row label="Passengers onboard" value={defect.safetyContext.passengersOnboard == null ? '—' : defect.safetyContext.passengersOnboard ? 'Yes' : 'No'} />
                <Row label="Safe to move" value={defect.safetyContext.safeToMove == null ? '—' : defect.safetyContext.safeToMove ? 'Yes' : 'No'} />
                <Row label="Recovery required" value={defect.safetyContext.recoveryRequired == null ? '—' : defect.safetyContext.recoveryRequired ? 'Yes' : 'No'} />
                <Row label="Affects accessibility" value={defect.safetyContext.affectsAccessibility == null ? '—' : defect.safetyContext.affectsAccessibility ? 'Yes' : 'No'} />
              </dl>
            </SectionCard>
          )}
          <CloseDefectPanel defect={defect} />
        </div>
      )}

      {activeTab === 'evidence' && (
        <SectionCard title="Evidence" description="Original evidence is retained and never overwritten">
          {defect.evidence.length === 0 ? (
            <p className="text-sm text-slate-500">No evidence uploaded.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {defect.evidence.map((ev) => (
                <li key={ev.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0">
                  <div>
                    <p className="text-sm font-medium">{ev.label}</p>
                    <p className="text-xs text-slate-500 capitalize">{ev.kind.replace(/_/g, ' ')} · {ev.source}</p>
                    <p className="text-xs text-slate-500">Uploaded by {ev.uploadedBy}</p>
                  </div>
                  <time className="text-xs text-slate-500">
                    {new Date(ev.capturedAt).toLocaleString('en-GB')}
                  </time>
                </li>
              ))}
            </ul>
          )}
          <EvidenceUploadPanel defect={defect} />
        </SectionCard>
      )}

      {activeTab === 'triage' && (
        <SectionCard title="Triage decision" description="Formal safety review — identity and reasoning are recorded">
          {defect.triageStatus !== 'pending' ? (
            <dl className="space-y-2 text-sm">
              <Row label="Decision" value={defect.triageStatus} />
              <Row label="Reviewed by" value={defect.triagedBy ?? '—'} />
              <Row label="Reviewed at" value={defect.triagedAt ? new Date(defect.triagedAt).toLocaleString('en-GB') : '—'} />
            </dl>
          ) : canTriage ? (
            <div className="space-y-3 text-sm">
              <label className="block">
                <span className="text-slate-600">Triage decision</span>
                <select
                  value={triageStatus}
                  onChange={(e) => setTriageStatus(e.target.value as DefectTriageStatus)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                >
                  <option value="validated">Confirm defect — schedule repair</option>
                  <option value="deferred">Monitor until inspection</option>
                  <option value="duplicate">Duplicate of existing defect</option>
                  <option value="rejected">Not a defect</option>
                </select>
              </label>
              <label className="block">
                <span className="text-slate-600">Reviewer comments</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5" />
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={createWorkOrder} onChange={(e) => setCreateWorkOrder(e.target.checked)} />
                Create linked maintenance job
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={markVor} onChange={(e) => setMarkVor(e.target.checked)} />
                Mark vehicle VOR
              </label>
              <button
                type="button"
                disabled={triage.isPending}
                onClick={() => triage.mutate()}
                className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white"
              >
                Confirm triage
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Awaiting triage by an authorised reviewer.</p>
          )}
        </SectionCard>
      )}

      {activeTab === 'repair' && <RepairWorkflowPanel defect={defect} />}
      {activeTab === 'verification' && <VerificationWorkflowPanel defect={defect} />}
      {activeTab === 'restrictions' && <RestrictionWorkflowPanel defect={defect} />}

      {activeTab === 'impact' && (
        <SectionCard title="Operational impact" description="Affected work and replacement availability">
          <dl className="space-y-2 text-sm">
            <Row label="Current run" value={defect.operationalImpact.currentRunReference ?? '—'} />
            <Row label="Next run" value={defect.operationalImpact.nextRunReference ?? '—'} />
            <Row label="Next departure" value={defect.operationalImpact.nextDepartureTime ?? '—'} />
            <Row label="Assigned driver" value={defect.operationalImpact.assignedDriverName ?? '—'} />
            <Row label="Wheelchair service required" value={defect.operationalImpact.wheelchairRequired ? 'Yes' : 'No'} />
            <Row label="Similar past defects" value={String(defect.operationalImpact.similarDefectCount)} />
            <Row label="Replacement candidates" value={String(defect.operationalImpact.replacementCandidates)} />
            <Row label="Dispatch blocked" value={defect.operationalImpact.dispatchBlocked ? 'Yes' : 'No'} />
            {defect.operationalImpact.dispatchBlockReason && (
              <Row label="Block reason" value={defect.operationalImpact.dispatchBlockReason} />
            )}
          </dl>
          {defect.operationalImpact.impactSummary && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {defect.operationalImpact.impactSummary}
            </p>
          )}
        </SectionCard>
      )}

      {activeTab === 'history' && (
        <SectionCard title="Audit trail">
          <ul className="space-y-2 text-sm">
            {defect.timeline.map((e) => (
              <li key={e.id} className="flex gap-3 border-b border-slate-50 pb-2">
                <span className="shrink-0 text-xs text-slate-500">{new Date(e.occurredAt).toLocaleString('en-GB')}</span>
                <div>
                  <p className="font-medium">{e.action}</p>
                  <p className="text-xs text-slate-500">
                    {e.actorName}
                    {e.detail ? ` · ${e.detail}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {activeTab === 'audit' && <DefectAuditPanel entries={defect.auditTrail} />}
    </div>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-36 shrink-0 text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}
