import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import {
  CONTRIBUTING_FACTOR_OPTIONS,
  IMMEDIATE_CAUSE_OPTIONS,
  UNDERLYING_CAUSE_OPTIONS,
} from '@/lib/incidents/investigation'
import { canInvestigateIncident } from '@/lib/incidents/permissions'
import type { IncidentDetailRecord } from '@/lib/incidents/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

function CauseChecklist({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: readonly string[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  return (
    <div>
      <p className="text-sm font-medium text-slate-900">{label}</p>
      <div className="mt-2 grid gap-1 sm:grid-cols-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
            {opt}
          </label>
        ))}
      </div>
    </div>
  )
}

export function IncidentInvestigationPanel({ incident }: { incident: IncidentDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canEdit = canInvestigateIncident(user?.permissions ?? [])
  const inv = incident.investigation

  const [scope, setScope] = useState(inv.scope ?? '')
  const [investigatorName, setInvestigatorName] = useState(inv.investigatorName ?? incident.ownerName ?? '')
  const [targetCompletionDate, setTargetCompletionDate] = useState(inv.targetCompletionDate?.slice(0, 10) ?? '')
  const [confirmedFacts, setConfirmedFacts] = useState(inv.confirmedFacts.join('\n'))
  const [disputedInformation, setDisputedInformation] = useState(inv.disputedInformation.join('\n'))
  const [immediateCauses, setImmediateCauses] = useState(inv.immediateCauses)
  const [contributingFactors, setContributingFactors] = useState(inv.contributingFactors)
  const [underlyingCauses, setUnderlyingCauses] = useState(inv.underlyingCauses)
  const [findingsSummary, setFindingsSummary] = useState(inv.findingsSummary ?? '')

  const mutation = useMutation({
    mutationFn: () =>
      api.updateIncidentInvestigationHub(
        {
          incidentId: incident.id,
          scope,
          investigatorName,
          targetCompletionDate: targetCompletionDate || undefined,
          confirmedFacts: confirmedFacts.split('\n').map((s) => s.trim()).filter(Boolean),
          disputedInformation: disputedInformation.split('\n').map((s) => s.trim()).filter(Boolean),
          immediateCauses,
          contributingFactors,
          underlyingCauses,
          findingsSummary: findingsSummary || undefined,
        },
        actorName,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-detail', incident.id] })
      queryClient.invalidateQueries({ queryKey: ['incidents-hub'] })
    },
  })

  if (!canEdit) {
    return (
      <SectionCard title="Investigation workspace" data-testid="investigation-readonly">
        <dl className="space-y-2 text-sm">
          <Row label="Scope" value={inv.scope ?? '—'} />
          <Row label="Investigator" value={inv.investigatorName ?? '—'} />
          <Row label="Target completion" value={inv.targetCompletionDate ? new Date(inv.targetCompletionDate).toLocaleDateString('en-GB') : '—'} />
        </dl>
        {inv.immediateCauses.length > 0 && <CauseList title="Immediate causes" items={inv.immediateCauses} />}
        {inv.contributingFactors.length > 0 && <CauseList title="Contributing factors" items={inv.contributingFactors} />}
        {inv.underlyingCauses.length > 0 && <CauseList title="Underlying causes" items={inv.underlyingCauses} />}
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Investigation workspace" description="Structured cause analysis — allegations are not proven facts until confirmed">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="text-slate-600">Investigation scope</span>
          <input value={scope} onChange={(e) => setScope(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Investigator</span>
          <input value={investigatorName} onChange={(e) => setInvestigatorName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Target completion</span>
          <input type="date" value={targetCompletionDate} onChange={(e) => setTargetCompletionDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5" />
        </label>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block text-sm">
          <span className="text-slate-600">Confirmed facts (one per line)</span>
          <textarea value={confirmedFacts} onChange={(e) => setConfirmedFacts(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5" data-testid="confirmed-facts" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Disputed information (one per line)</span>
          <textarea value={disputedInformation} onChange={(e) => setDisputedInformation(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5" />
        </label>
      </div>
      <div className="mt-4 space-y-4" data-testid="cause-analysis">
        <CauseChecklist label="Immediate causes" options={IMMEDIATE_CAUSE_OPTIONS} selected={immediateCauses} onChange={setImmediateCauses} />
        <CauseChecklist label="Contributing factors" options={CONTRIBUTING_FACTOR_OPTIONS} selected={contributingFactors} onChange={setContributingFactors} />
        <CauseChecklist label="Underlying organisational causes" options={UNDERLYING_CAUSE_OPTIONS} selected={underlyingCauses} onChange={setUnderlyingCauses} />
      </div>
      <label className="mt-4 block text-sm">
        <span className="text-slate-600">Findings summary</span>
        <textarea value={findingsSummary} onChange={(e) => setFindingsSummary(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5" />
      </label>
      <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()} className="mt-4 rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white" data-testid="save-investigation">
        Save investigation
      </button>
    </SectionCard>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-36 shrink-0 text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}

function CauseList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  )
}
