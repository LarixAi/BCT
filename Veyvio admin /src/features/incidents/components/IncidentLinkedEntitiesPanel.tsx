import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { linkedEntitiesSummary } from '@/lib/incidents/linking'
import { canInvestigateIncident } from '@/lib/incidents/permissions'
import type { IncidentDetailRecord } from '@/lib/incidents/types'
import { api } from '@/lib/api/client'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function IncidentLinkedEntitiesPanel({ incident }: { incident: IncidentDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canEdit = canInvestigateIncident(user?.permissions ?? [])
  const links = incident.linkedEntities

  const { data: schools = [] } = useQuery({ queryKey: tKey(['schools']), queryFn: () => api.getSchools(), enabled: canEdit })
  const { data: contracts = [] } = useQuery({ queryKey: tKey(['contracts']), queryFn: () => api.getContracts(), enabled: canEdit })
  const { data: passengers = [] } = useQuery({ queryKey: tKey(['passengers']), queryFn: () => api.getPassengers(), enabled: canEdit })

  const [schoolId, setSchoolId] = useState(links.schoolId ?? '')
  const [contractId, setContractId] = useState(links.contractId ?? '')
  const [passengerIds, setPassengerIds] = useState<string[]>(links.passengerIds)
  const [manifestId, setManifestId] = useState(links.manifestId ?? '')
  const [freezeManifest, setFreezeManifest] = useState(links.manifestFrozen)

  const save = useMutation({
    mutationFn: () =>
      api.linkIncidentEntitiesHub(
        {
          incidentId: incident.id,
          schoolId: schoolId || undefined,
          contractId: contractId || undefined,
          passengerIds,
          manifestId: manifestId || undefined,
          manifestLabel: manifestId ? `Manifest ${manifestId}` : undefined,
          manifestVersion: manifestId ? (links.manifestVersion ?? 1) : undefined,
          freezeManifest,
        },
        actorName,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tKey(['incident-detail', incident.id]) })
      queryClient.invalidateQueries({ queryKey: tKey(['incidents-hub']) })
    },
  })

  return (
    <SectionCard title="Linked entities" description="Schools, contracts, passengers, and manifest context">
      <dl className="grid gap-2 text-sm sm:grid-cols-2" data-testid="incident-linked-entities">
        <Row label="School" value={links.schoolName ?? '—'} />
        <Row label="Contract" value={links.contractName ?? '—'} />
        <Row label="Customer" value={links.customerName ?? '—'} />
        <Row label="Passengers" value={links.passengerNames.length ? links.passengerNames.join(', ') : '—'} />
        <Row label="Manifest" value={links.manifestLabel ?? '—'} />
        <Row label="Manifest frozen" value={links.manifestFrozen ? 'Yes — edits blocked' : 'No'} />
        <Row label="Summary" value={linkedEntitiesSummary(links)} className="sm:col-span-2" />
      </dl>

      {canEdit && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <p className="text-sm font-medium text-ink">Update links</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-soft">School</span>
              <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
                <option value="">None</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Contract</span>
              <select value={contractId} onChange={(e) => setContractId(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
                <option value="">None</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-ink-soft">Passengers</span>
              <select
                multiple
                value={passengerIds}
                onChange={(e) => setPassengerIds(Array.from(e.target.selectedOptions, (o) => o.value))}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              >
                {passengers.map((p) => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Manifest ID</span>
              <input value={manifestId} onChange={(e) => setManifestId(e.target.value)} placeholder="e.g. mf-114" className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
            </label>
            <label className="flex items-end gap-2 text-sm">
              <input type="checkbox" checked={freezeManifest} onChange={(e) => setFreezeManifest(e.target.checked)} />
              Freeze manifest for investigation
            </label>
          </div>
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            data-testid="save-linked-entities"
          >
            Save links
          </button>
        </div>
      )}
    </SectionCard>
  )
}

function Row({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  )
}
