import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { DEFECT_SEVERITY_LABELS } from '@/lib/vehicles/defects'
import type { FleetDefectRow } from '@/lib/maintenance/types'
import type { DefectTriageStatus } from '@/lib/vehicles/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

export function MaintenanceDefectsTab({ defects }: { defects: FleetDefectRow[] }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const [selected, setSelected] = useState<FleetDefectRow | null>(null)
  const [triageStatus, setTriageStatus] = useState<DefectTriageStatus>('validated')
  const [notes, setNotes] = useState('')
  const [createWorkOrder, setCreateWorkOrder] = useState(true)
  const [markVor, setMarkVor] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  const open = defects.filter((d) => d.status !== 'closed')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance-hub'] })
    queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
    queryClient.invalidateQueries({ queryKey: ['vehicle-profile'] })
  }

  const triage = useMutation({
    mutationFn: () =>
      api.triageVehicleDefect(
        selected!.vehicleId,
        selected!.id,
        { triageStatus, notes: notes || undefined, createWorkOrder, markVor },
        actorName,
      ),
    onSuccess: () => {
      setFlash(createWorkOrder ? 'Defect triaged — work order linked' : 'Defect triaged')
      invalidate()
      setSelected(null)
      setNotes('')
    },
  })

  return (
    <div className="space-y-4">
      {flash && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          {flash}
        </p>
      )}
      <SectionCard
        title="Defect register"
        description={`${open.length} open defects from driver, yard and command — shared with vehicle records`}
      >
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
              <th className="pb-2 pr-3 font-medium">Vehicle</th>
              <th className="pb-2 pr-3 font-medium">Component</th>
              <th className="pb-2 pr-3 font-medium">Description</th>
              <th className="pb-2 pr-3 font-medium">Severity</th>
              <th className="pb-2 pr-3 font-medium">Status</th>
              <th className="pb-2 pr-3 font-medium">Triage</th>
              <th className="pb-2 pr-3 font-medium">Work order</th>
              <th className="pb-2 pr-3 font-medium">Impact</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {defects.map((d) => (
              <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="py-2.5 pr-3">
                  <Link to={`/vehicles/${d.vehicleId}?tab=Defects`} className="font-medium text-command-600 hover:underline">
                    {d.registrationNumber}
                  </Link>
                </td>
                <td className="py-2.5 pr-3">{d.component}</td>
                <td className="py-2.5 pr-3 max-w-[220px] truncate">{d.description}</td>
                <td className="py-2.5 pr-3">{DEFECT_SEVERITY_LABELS[d.severity]}</td>
                <td className="py-2.5 pr-3"><StatusPill status={d.status} /></td>
                <td className="py-2.5 pr-3 capitalize text-slate-600">{d.triageStatus.replace(/_/g, ' ')}</td>
                <td className="py-2.5 pr-3">
                  {d.linkedWorkOrderId ? (
                    <Link
                      to={`/maintenance?tab=work-orders&wo=${d.linkedWorkOrderId}&vehicle=${d.vehicleId}`}
                      className="font-mono text-xs text-command-600 hover:underline"
                    >
                      {d.linkedWorkOrderId}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-slate-600">{d.operationalImpact}</td>
                <td className="py-2.5">
                  {d.status !== 'closed' && d.triageStatus === 'pending' && (
                    <button type="button" onClick={() => setSelected(d)} className="text-xs font-medium text-command-600 hover:underline">
                      Triage
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {selected && (
        <SectionCard title={`Triage defect — ${selected.registrationNumber}`} description={selected.description}>
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="text-slate-600">Triage decision</span>
              <select
                value={triageStatus}
                onChange={(e) => setTriageStatus(e.target.value as DefectTriageStatus)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
              >
                <option value="validated">Validated — raise work</option>
                <option value="deferred">Deferred</option>
                <option value="duplicate">Duplicate</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label className="block">
              <span className="text-slate-600">Notes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5" rows={2} />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={createWorkOrder} onChange={(e) => setCreateWorkOrder(e.target.checked)} />
              Create linked work order
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={markVor} onChange={(e) => setMarkVor(e.target.checked)} />
              Mark vehicle VOR
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={triage.isPending}
                onClick={() => triage.mutate()}
                className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white"
              >
                Confirm triage
              </button>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg px-4 py-2 text-sm text-slate-600">
                Cancel
              </button>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
