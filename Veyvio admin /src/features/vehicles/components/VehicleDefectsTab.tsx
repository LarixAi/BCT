import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { DEFECT_SEVERITY_LABELS } from '@/lib/vehicles/defects'
import type { CreateVehicleDefectInput, DefectSeverity, VehicleProfile } from '@/lib/vehicles/types'
import { api } from '@/lib/api/client'

export function VehicleDefectsTab({ vehicle, actorName }: { vehicle: VehicleProfile; actorName: string }) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState('bodywork')
  const [component, setComponent] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<DefectSeverity>('minor')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicle-profile', vehicle.id] })
    queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
    queryClient.invalidateQueries({ queryKey: ['vehicle-directory-summary'] })
    queryClient.invalidateQueries({ queryKey: ['vehicle-release-exceptions'] })
  }

  const report = useMutation({
    mutationFn: () => {
      const input: CreateVehicleDefectInput = { category, component, description, severity }
      return api.reportVehicleDefect(vehicle.id, input, actorName)
    },
    onSuccess: () => {
      invalidate()
      setShowForm(false)
      setComponent('')
      setDescription('')
    },
  })

  const close = useMutation({
    mutationFn: ({ defectId, reason }: { defectId: string; reason: string }) =>
      api.closeVehicleDefect(vehicle.id, defectId, actorName, reason),
    onSuccess: invalidate,
  })

  const openDefects = vehicle.defects.filter((d) => d.status !== 'closed')

  return (
    <SectionCard
      title="Defect register"
      description={`${openDefects.length} open · dangerous defects auto-mark VOR`}
      action={
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-command-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-command-700"
        >
          {showForm ? 'Cancel' : 'Report defect'}
        </button>
      }
    >
      {showForm && (
        <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="text-slate-600">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" rows={2} />
          </label>
          <label className="text-sm">
            <span className="text-slate-600">Category</span>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5" />
          </label>
          <label className="text-sm">
            <span className="text-slate-600">Component</span>
            <input value={component} onChange={(e) => setComponent(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5" />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-slate-600">Severity</span>
            <select value={severity} onChange={(e) => setSeverity(e.target.value as DefectSeverity)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5">
              {Object.entries(DEFECT_SEVERITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => report.mutate()} disabled={!description || report.isPending} className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white sm:col-span-2">
            Submit defect
          </button>
        </div>
      )}

      {openDefects.length === 0 ? (
        <p className="text-sm text-slate-500">No open defects.</p>
      ) : (
        <ul className="space-y-2">
          {openDefects.map((d) => (
            <li key={d.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{d.component} — {DEFECT_SEVERITY_LABELS[d.severity]}</p>
                <StatusPill status={d.status} />
              </div>
              <p className="text-slate-600">{d.description}</p>
              <p className="text-xs text-slate-400">Reported by {d.reportedBy} · {d.source.replace(/_/g, ' ')}</p>
              {d.severity !== 'dangerous' && (
                <button type="button" onClick={() => close.mutate({ defectId: d.id, reason: 'Rectified and verified' })} className="mt-2 text-xs font-medium text-command-600 hover:underline">
                  Close defect
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
