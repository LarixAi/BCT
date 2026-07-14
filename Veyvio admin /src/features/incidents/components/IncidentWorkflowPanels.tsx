import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import {
  canAcknowledgeIncident,
  canAssignIncident,
  canAssessRegulatory,
  canCloseIncident,
  canContainIncident,
  canCreateDefectFromIncident,
  canEscalateIncident,
  canInvestigateIncident,
  canReopenIncident,
  canUploadIncidentEvidence,
} from '@/lib/incidents/permissions'
import type { IncidentDetailRecord, IncidentSeverity } from '@/lib/incidents/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

export function IncidentSafetyControlsPanel({ incident }: { incident: IncidentDetailRecord }) {
  const sc = incident.safetyControls
  if (incident.status === 'closed') return null

  const items = [
    { label: 'Everyone accounted for', value: sc.everyoneAccountedFor },
    { label: 'Medical treatment ongoing', value: sc.medicalTreatmentOngoing },
    { label: 'Vehicle safe', value: sc.vehicleSafe },
    { label: 'Driver fit to continue', value: sc.driverFitToContinue },
    { label: 'Location safe', value: sc.locationSafe },
    { label: 'Critical contacts notified', value: sc.criticalContactsNotified },
    { label: 'Evidence preserved', value: sc.evidencePreserved },
  ]

  return (
    <SectionCard title="Current safety controls" description="Answers remain visible until the incident is contained">
      <dl className="grid gap-2 sm:grid-cols-2" data-testid="safety-controls">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between gap-2 text-sm">
            <dt className="text-slate-600">{item.label}</dt>
            <dd className="font-medium">{item.value == null ? '—' : item.value ? 'Yes' : 'No'}</dd>
          </div>
        ))}
      </dl>
      {sc.isContained && <p className="mt-3 text-sm font-medium text-emerald-800">Incident contained</p>}
    </SectionCard>
  )
}

export function AcknowledgeIncidentPanel({ incident }: { incident: IncidentDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canAck = canAcknowledgeIncident(user?.permissions ?? [])
  const [notes, setNotes] = useState('')

  const ack = useMutation({
    mutationFn: () => api.acknowledgeIncidentHub({ incidentId: incident.id, notes: notes || undefined }, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents-hub'] })
      queryClient.invalidateQueries({ queryKey: ['incident-detail', incident.id] })
    },
  })

  if (!canAck || incident.isAcknowledged) return null

  return (
    <SectionCard title="Acknowledge incident">
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Acknowledgement notes" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={2} />
      <button type="button" disabled={ack.isPending} onClick={() => ack.mutate()} className="mt-2 rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white" data-testid="acknowledge-incident">
        Acknowledge
      </button>
    </SectionCard>
  )
}

export function AssignIncidentPanel({ incident }: { incident: IncidentDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canAssign = canAssignIncident(user?.permissions ?? [])
  const [ownerName, setOwnerName] = useState(incident.ownerName ?? 'Sarah Mitchell')

  const assign = useMutation({
    mutationFn: () => api.assignIncidentHub({ incidentId: incident.id, ownerName }, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents-hub'] })
      queryClient.invalidateQueries({ queryKey: ['incident-detail', incident.id] })
    },
  })

  if (!canAssign) return null

  return (
    <SectionCard title="Assign incident lead">
      <div className="flex flex-wrap gap-2">
        <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
        <button type="button" disabled={assign.isPending} onClick={() => assign.mutate()} className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white">
          Assign
        </button>
      </div>
    </SectionCard>
  )
}

export function IncidentEvidencePanel({ incident }: { incident: IncidentDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canUpload = canUploadIncidentEvidence(user?.permissions ?? [])
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState<'photo' | 'document' | 'statement'>('photo')

  const upload = useMutation({
    mutationFn: () => api.uploadIncidentEvidenceHub({ incidentId: incident.id, kind, label: label || 'Evidence' }, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-detail', incident.id] })
      setLabel('')
    },
  })

  return (
    <SectionCard title="Evidence" description="Original evidence is retained — never overwritten">
      {incident.evidence.length === 0 ? (
        <p className="text-sm text-slate-500">No evidence uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {incident.evidence.map((ev) => (
            <li key={ev.id} className="py-3 first:pt-0">
              <p className="text-sm font-medium">{ev.label}</p>
              <p className="text-xs text-slate-500">{ev.kind} · {ev.uploadedBy} · {new Date(ev.uploadedAt).toLocaleString('en-GB')}</p>
            </li>
          ))}
        </ul>
      )}
      {canUpload && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4" data-testid="evidence-upload">
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
            <option value="photo">Photo</option>
            <option value="document">Document</option>
            <option value="statement">Statement</option>
          </select>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Description" className="min-w-[160px] flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
          <button type="button" disabled={upload.isPending} onClick={() => upload.mutate()} className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white">Upload</button>
        </div>
      )}
    </SectionCard>
  )
}

export function CloseIncidentPanel({ incident }: { incident: IncidentDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canClose = canCloseIncident(user?.permissions ?? [])
  const [reason, setReason] = useState('')

  const close = useMutation({
    mutationFn: () => api.closeIncidentHub({ incidentId: incident.id, reason }, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents-hub'] })
      queryClient.invalidateQueries({ queryKey: ['incident-detail', incident.id] })
    },
  })

  if (!canClose || incident.status === 'closed') return null

  return (
    <SectionCard title="Close incident">
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Closure reason" className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
      <button type="button" disabled={!reason || close.isPending} onClick={() => close.mutate()} className="mt-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium">
        Close incident
      </button>
    </SectionCard>
  )
}

export function AddIncidentUpdatePanel({ incident }: { incident: IncidentDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canUpdate = canInvestigateIncident(user?.permissions ?? [])
  const [update, setUpdate] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.addIncidentUpdateHub({ incidentId: incident.id, update }, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-detail', incident.id] })
      setUpdate('')
    },
  })

  if (!canUpdate || incident.status === 'closed') return null

  return (
    <SectionCard title="Add timeline update">
      <textarea value={update} onChange={(e) => setUpdate(e.target.value)} placeholder="Operational update or correction" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={2} />
      <button type="button" disabled={!update || mutation.isPending} onClick={() => mutation.mutate()} className="mt-2 rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white" data-testid="add-incident-update">
        Add update
      </button>
    </SectionCard>
  )
}

export function ContainIncidentPanel({ incident }: { incident: IncidentDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canContain = canContainIncident(user?.permissions ?? [])
  const [notes, setNotes] = useState('')
  const [everyoneAccountedFor, setEveryoneAccountedFor] = useState(true)
  const [vehicleSafe, setVehicleSafe] = useState(true)
  const [evidencePreserved, setEvidencePreserved] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      api.containIncidentHub(
        { incidentId: incident.id, notes, everyoneAccountedFor, vehicleSafe, evidencePreserved },
        actorName,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents-hub'] })
      queryClient.invalidateQueries({ queryKey: ['incident-detail', incident.id] })
    },
  })

  if (!canContain || incident.status === 'closed' || incident.safetyControls.isContained) return null

  return (
    <SectionCard title="Contain incident" description="Confirm immediate risks are controlled">
      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={everyoneAccountedFor} onChange={(e) => setEveryoneAccountedFor(e.target.checked)} />Everyone accounted for</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={vehicleSafe} onChange={(e) => setVehicleSafe(e.target.checked)} />Vehicle / location safe</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={evidencePreserved} onChange={(e) => setEvidencePreserved(e.target.checked)} />Evidence preserved</label>
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Containment notes" className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={2} />
      <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()} className="mt-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white" data-testid="contain-incident">
        Mark contained
      </button>
    </SectionCard>
  )
}

export function EscalateIncidentPanel({ incident }: { incident: IncidentDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canEscalate = canEscalateIncident(user?.permissions ?? [])
  const [severity, setSeverity] = useState<IncidentSeverity>(incident.severity === 'near_miss' ? 'high' : 'critical')
  const [reason, setReason] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.escalateIncidentHub({ incidentId: incident.id, severity, reason }, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents-hub'] })
      queryClient.invalidateQueries({ queryKey: ['incident-detail', incident.id] })
    },
  })

  if (!canEscalate || incident.status === 'closed') return null

  return (
    <SectionCard title="Escalate severity">
      <select value={severity} onChange={(e) => setSeverity(e.target.value as IncidentSeverity)} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
      </select>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for escalation" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
      <button type="button" disabled={!reason || mutation.isPending} onClick={() => mutation.mutate()} className="mt-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-800" data-testid="escalate-incident">
        Escalate
      </button>
    </SectionCard>
  )
}

export function ReopenIncidentPanel({ incident }: { incident: IncidentDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canReopen = canReopenIncident(user?.permissions ?? [])
  const [reason, setReason] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.reopenIncidentHub({ incidentId: incident.id, reason }, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents-hub'] })
      queryClient.invalidateQueries({ queryKey: ['incident-detail', incident.id] })
    },
  })

  if (!canReopen || incident.status !== 'closed') return null

  return (
    <SectionCard title="Reopen incident">
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for reopening" className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
      <button type="button" disabled={!reason || mutation.isPending} onClick={() => mutation.mutate()} className="mt-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium" data-testid="reopen-incident">
        Reopen
      </button>
    </SectionCard>
  )
}

export function CreateDefectFromIncidentPanel({ incident }: { incident: IncidentDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canCreate = canCreateDefectFromIncident(user?.permissions ?? [])
  const [component, setComponent] = useState('')
  const [description, setDescription] = useState(incident.title)

  const mutation = useMutation({
    mutationFn: () => api.createDefectFromIncidentHub({ incidentId: incident.id, component, description }, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-detail', incident.id] })
    },
  })

  if (!canCreate || !incident.operationalLinks.vehicleId || incident.operationalLinks.linkedDefectId) return null

  return (
    <SectionCard title="Create defect from incident">
      <input value={component} onChange={(e) => setComponent(e.target.value)} placeholder="Component / area" className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" rows={2} />
      <button type="button" disabled={!component || !description || mutation.isPending} onClick={() => mutation.mutate()} className="mt-2 rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white" data-testid="create-defect-from-incident">
        Create defect
      </button>
    </SectionCard>
  )
}

export function MarkIncidentVorPanel({ incident }: { incident: IncidentDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canMark = canCreateDefectFromIncident(user?.permissions ?? [])
  const [reason, setReason] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.markIncidentVehicleVorHub({ incidentId: incident.id, reason }, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-detail', incident.id] })
    },
  })

  if (!canMark || !incident.operationalLinks.vehicleId || !incident.vehicleStillOperational) return null

  return (
    <SectionCard title="Mark vehicle VOR">
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for off-road" className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
      <button type="button" disabled={!reason || mutation.isPending} onClick={() => mutation.mutate()} className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900" data-testid="mark-incident-vor">
        Mark VOR
      </button>
    </SectionCard>
  )
}

export function RegulatoryDecisionPanel({ incident }: { incident: IncidentDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canAssess = canAssessRegulatory(user?.permissions ?? [])
  const pending = incident.regulatoryAssessments.filter((r) => r.status === 'pending')
  const [assessmentId, setAssessmentId] = useState(pending[0]?.id ?? '')
  const [potentiallyRequired, setPotentiallyRequired] = useState(true)
  const [decision, setDecision] = useState('')
  const [externalReference, setExternalReference] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      api.recordIncidentRegulatoryDecisionHub(
        { incidentId: incident.id, assessmentId, potentiallyRequired, decision, externalReference: externalReference || undefined },
        actorName,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-detail', incident.id] })
      setDecision('')
    },
  })

  if (!canAssess || pending.length === 0) return null

  return (
    <SectionCard title="Record regulatory decision">
      <select value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
        {pending.map((r) => (
          <option key={r.id} value={r.id}>{r.label}</option>
        ))}
      </select>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={potentiallyRequired} onChange={(e) => setPotentiallyRequired(e.target.checked)} />
        External report potentially required
      </label>
      <input value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="Decision / rationale" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
      <input value={externalReference} onChange={(e) => setExternalReference(e.target.value)} placeholder="External reference (optional)" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
      <button type="button" disabled={!decision || !assessmentId || mutation.isPending} onClick={() => mutation.mutate()} className="mt-2 rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white" data-testid="record-regulatory-decision">
        Record decision
      </button>
    </SectionCard>
  )
}

export function AddCorrectiveActionPanel({ incident }: { incident: IncidentDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canAdd = canInvestigateIncident(user?.permissions ?? [])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ownerName, setOwnerName] = useState(incident.ownerName ?? 'Sarah Mitchell')
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString().slice(0, 10))

  const mutation = useMutation({
    mutationFn: () => api.addIncidentActionHub({ incidentId: incident.id, title, description, ownerName, dueDate, priority: 'medium' }, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-detail', incident.id] })
      setTitle('')
      setDescription('')
    },
  })

  if (!canAdd || incident.status === 'closed') return null

  return (
    <SectionCard title="Add corrective action">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Action title" className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" rows={2} />
      <div className="mt-2 flex flex-wrap gap-2">
        <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
      </div>
      <button type="button" disabled={!title || !description || mutation.isPending} onClick={() => mutation.mutate()} className="mt-2 rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white" data-testid="add-corrective-action">
        Add action
      </button>
    </SectionCard>
  )
}
