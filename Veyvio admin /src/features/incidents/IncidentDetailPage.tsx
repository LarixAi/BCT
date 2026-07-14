import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { CATEGORY_LABELS, REPORTING_SOURCE_LABELS, SEVERITY_DISPLAY, STATUS_LABELS } from '@/lib/incidents/constants'
import { canViewSafeguardingIncident } from '@/lib/incidents/permissions'
import { IncidentDriverIntakePanel, IncidentDriverReportPanel } from './components/IncidentDriverReportPanel'
import { IncidentAuditPanel } from './components/IncidentAuditPanel'
import { IncidentCctvPanel } from './components/IncidentCctvPanel'
import { IncidentExportPacksButton } from './components/IncidentExportPacksButton'
import { IncidentInsurerPanel } from './components/IncidentInsurerPanel'
import { IncidentInvestigationPanel } from './components/IncidentInvestigationPanel'
import { IncidentLinkedEntitiesPanel } from './components/IncidentLinkedEntitiesPanel'
import { IncidentPeoplePanel } from './components/IncidentPeoplePanel'
import { IncidentRiskBadge } from './components/IncidentRiskBadge'
import {
  AcknowledgeIncidentPanel,
  AddCorrectiveActionPanel,
  AddIncidentUpdatePanel,
  AssignIncidentPanel,
  CloseIncidentPanel,
  ContainIncidentPanel,
  CreateDefectFromIncidentPanel,
  EscalateIncidentPanel,
  IncidentEvidencePanel,
  IncidentSafetyControlsPanel,
  MarkIncidentVorPanel,
  RegulatoryDecisionPanel,
  ReopenIncidentPanel,
} from './components/IncidentWorkflowPanels'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

type DetailTab = 'summary' | 'driver_report' | 'timeline' | 'people' | 'evidence' | 'investigation' | 'regulatory' | 'actions' | 'vehicle' | 'audit'

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<DetailTab>('summary')
  const canSafeguarding = canViewSafeguardingIncident(user?.permissions ?? [])

  const { data: incident, isLoading, error, isError } = useQuery({
    queryKey: ['incident-detail', id],
    queryFn: () => api.getIncidentDetail(id!),
    enabled: !!id,
  })

  if (isLoading) return <p className="text-sm text-slate-500">Loading incident…</p>
  if (isError || !incident) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Incident not found'}</p>
  }

  if (incident.isSafeguarding && !canSafeguarding) {
    return (
      <div className="space-y-4">
        <Link to="/incidents" className="text-sm text-command-600 hover:underline">← Incidents</Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-900">Restricted safeguarding incident</h1>
          <p className="mt-2 text-sm text-red-800">You do not have permission to view this incident. Contact your safeguarding lead.</p>
        </div>
      </div>
    )
  }

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'summary', label: 'Summary' },
    ...(incident.driverReport ? [{ id: 'driver_report' as const, label: 'Driver report' }] : []),
    { id: 'timeline', label: 'Timeline' },
    { id: 'people', label: 'People' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'investigation', label: 'Investigation' },
    { id: 'regulatory', label: 'Regulatory' },
    { id: 'actions', label: 'Actions' },
    { id: 'vehicle', label: 'Vehicle & journey' },
    { id: 'audit', label: 'Audit' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/incidents" className="text-sm text-command-600 hover:underline">← Incidents</Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{incident.incidentRef}</h1>
          <p className="text-lg text-slate-800">{incident.title}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">{SEVERITY_DISPLAY[incident.severity]}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{STATUS_LABELS[incident.status]}</span>
            {incident.isSafeguarding && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Safeguarding</span>}
            {!incident.isAcknowledged && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">Unacknowledged</span>}
            <IncidentRiskBadge risk={incident.riskScore} />
          </div>
          <p className="mt-2 text-sm text-slate-600">{incident.location ?? incident.depotName} · {new Date(incident.occurredAt).toLocaleString('en-GB')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <IncidentExportPacksButton incident={incident} />
          {incident.operationalLinks.vehicleId && (
            <Link to={`/vehicles/${incident.operationalLinks.vehicleId}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
              Open vehicle
            </Link>
          )}
          {incident.operationalLinks.linkedDefectId && (
            <Link to={`/defects/${incident.operationalLinks.linkedDefectId}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
              Linked defect
            </Link>
          )}
        </div>
      </div>

      {incident.operationalSummary && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">{incident.operationalSummary}</div>
      )}

      <IncidentDriverIntakePanel incident={incident} />

      <IncidentSafetyControlsPanel incident={incident} />

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id)} className={`rounded-t-lg px-3 py-2 text-sm font-medium ${activeTab === t.id ? 'border-b-2 border-command-600 text-command-700' : 'text-slate-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Incident details">
              <dl className="space-y-2 text-sm">
                <Row label="Category" value={CATEGORY_LABELS[incident.category] ?? incident.category} />
                <Row label="Reported by" value={incident.reportedBy} />
                <Row label="Source" value={REPORTING_SOURCE_LABELS[incident.reportingSource] ?? incident.reportingSource} />
                <Row label="Owner" value={incident.ownerName ?? 'Unassigned'} />
                <Row label="Confidentiality" value={incident.confidentiality.replace(/_/g, ' ')} />
              </dl>
            </SectionCard>
            <SectionCard title="Operational links">
              <dl className="space-y-2 text-sm">
                <Row label="Vehicle" value={incident.operationalLinks.vehicleRegistration ?? '—'} />
                <Row label="Driver" value={incident.operationalLinks.driverName ?? '—'} />
                <Row label="Run" value={incident.operationalLinks.runReference ?? '—'} />
                <Row label="Depot" value={incident.operationalLinks.depotName} />
              </dl>
            </SectionCard>
          </div>
          <IncidentLinkedEntitiesPanel incident={incident} />
          <AcknowledgeIncidentPanel incident={incident} />
          <AssignIncidentPanel incident={incident} />
          <ContainIncidentPanel incident={incident} />
          <EscalateIncidentPanel incident={incident} />
          <AddIncidentUpdatePanel incident={incident} />
          <CloseIncidentPanel incident={incident} />
          <ReopenIncidentPanel incident={incident} />
        </div>
      )}

      {activeTab === 'driver_report' && (
        <SectionCard title="Driver report" description="Original driver submission — preserved for audit">
          <IncidentDriverReportPanel incident={incident} />
        </SectionCard>
      )}

      {activeTab === 'timeline' && (
        <SectionCard title="Timeline" description="Chronological record — corrections appear as new entries">
          <ul className="space-y-2" data-testid="incident-timeline">
            {incident.timeline.map((e) => (
              <li key={e.id} className="flex gap-3 border-b border-slate-50 pb-2 text-sm">
                <time className="shrink-0 text-xs text-slate-500">{new Date(e.occurredAt).toLocaleString('en-GB')}</time>
                <div>
                  <p className="font-medium">{e.action}{e.isSystem ? ' (system)' : ''}</p>
                  <p className="text-xs text-slate-500">{e.actorName}{e.detail ? ` · ${e.detail}` : ''}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {activeTab === 'people' && <IncidentPeoplePanel incident={incident} />}

      {activeTab === 'evidence' && (
        <div className="space-y-4">
          <IncidentEvidencePanel incident={incident} />
          <IncidentCctvPanel incident={incident} />
        </div>
      )}

      {activeTab === 'investigation' && <IncidentInvestigationPanel incident={incident} />}

      {activeTab === 'regulatory' && (
        <div className="space-y-4">
          <SectionCard title="Regulatory assessments" description="Assessment checklist — not automatic legal conclusions">
            {incident.regulatoryAssessments.length === 0 ? (
              <p className="text-sm text-slate-500">No external assessments required.</p>
            ) : (
              <ul className="divide-y divide-slate-100" data-testid="regulatory-assessments">
                {incident.regulatoryAssessments.map((r) => (
                  <li key={r.id} className="py-3 first:pt-0">
                    <p className="font-medium">{r.label}</p>
                    <p className="text-sm text-slate-600">Status: {r.status.replace(/_/g, ' ')}</p>
                    {r.decision && <p className="text-sm text-slate-600">Decision: {r.decision}</p>}
                    {r.deadline && <p className="text-xs text-amber-700">Deadline: {new Date(r.deadline).toLocaleString('en-GB')}</p>}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          <IncidentInsurerPanel incident={incident} />
          <RegulatoryDecisionPanel incident={incident} />
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="space-y-4">
          <SectionCard title="Corrective actions">
          {incident.correctiveActions.length === 0 ? (
            <p className="text-sm text-slate-500">No corrective actions yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {incident.correctiveActions.map((a) => (
                <li key={a.id} className="flex justify-between gap-2 py-3 first:pt-0">
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-sm text-slate-600">{a.description}</p>
                    <p className="text-xs text-slate-500">{a.ownerName} · Due {new Date(a.dueDate).toLocaleDateString('en-GB')}</p>
                  </div>
                  <span className={`text-xs font-medium ${a.status === 'overdue' ? 'text-red-700' : 'text-slate-600'}`}>{a.status}</span>
                </li>
              ))}
            </ul>
          )}
          {incident.immediateActions.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-900">Immediate actions taken</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {incident.immediateActions.map((a) => (
                  <li key={a.id}>{a.action} — {a.completedBy} ({new Date(a.completedAt).toLocaleString('en-GB')})</li>
                ))}
              </ul>
            </div>
          )}
          </SectionCard>
          <AddCorrectiveActionPanel incident={incident} />
        </div>
      )}

      {activeTab === 'vehicle' && (
        <div className="space-y-4">
          <SectionCard title="Vehicle and journey">
          <dl className="space-y-2 text-sm">
            <Row label="Vehicle" value={incident.operationalLinks.vehicleRegistration ?? '—'} />
            <Row label="Fleet number" value={incident.operationalLinks.fleetNumber ?? '—'} />
            <Row label="Driver" value={incident.operationalLinks.driverName ?? '—'} />
            <Row label="Run" value={incident.operationalLinks.runReference ?? '—'} />
            <Row label="Trip" value={incident.operationalLinks.tripReference ?? '—'} />
            <Row label="Linked check" value={incident.operationalLinks.linkedCheckId ?? '—'} />
            <Row label="Linked defect" value={incident.operationalLinks.linkedDefectId ?? '—'} />
          </dl>
          </SectionCard>
          {incident.telematicsSnapshot && (
            <SectionCard title="Telematics snapshot" description="Event data preserved from vehicle systems">
              <dl className="grid gap-2 text-sm sm:grid-cols-2" data-testid="telematics-snapshot">
                <Row label="Event" value={incident.telematicsSnapshot.eventType.replace(/_/g, ' ')} />
                <Row label="Reference" value={incident.telematicsSnapshot.reference} />
                <Row label="Occurred" value={new Date(incident.telematicsSnapshot.occurredAt).toLocaleString('en-GB')} />
                <Row label="Speed" value={incident.telematicsSnapshot.speedMph != null ? `${incident.telematicsSnapshot.speedMph} mph` : '—'} />
                <Row label="Preserved" value={incident.telematicsSnapshot.preserved ? 'Yes' : 'No'} />
              </dl>
            </SectionCard>
          )}
          <CreateDefectFromIncidentPanel incident={incident} />
          <MarkIncidentVorPanel incident={incident} />
        </div>
      )}

      {activeTab === 'audit' && <IncidentAuditPanel entries={incident.auditTrail} />}
    </div>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-36 shrink-0 text-slate-500">{label}</dt>
      <dd className="font-medium capitalize text-slate-900">{value}</dd>
    </div>
  )
}
