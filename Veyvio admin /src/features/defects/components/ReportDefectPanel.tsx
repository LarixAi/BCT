import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import type { DefectsHubData } from '@/lib/defects/types'
import type { DefectSeverity } from '@/lib/vehicles/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

const CATEGORIES = [
  'brakes', 'steering', 'suspension', 'tyres', 'lights', 'engine', 'bodywork',
  'doors', 'accessibility', 'interior', 'telematics', 'other',
]

export function ReportDefectPanel({ hub, onClose }: { hub: DefectsHubData; onClose: () => void }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const { data: vehicleProfiles = [] } = useQuery({
    queryKey: ['vehicle-profiles'],
    queryFn: () => api.getVehicleProfiles(),
  })

  const activeVehicles = vehicleProfiles.filter((v) => v.lifecycleStatus === 'active' || v.lifecycleStatus === 'awaiting_onboarding')

  const [vehicleId, setVehicleId] = useState(activeVehicles[0]?.id ?? hub.register[0]?.vehicleId ?? '')
  const [category, setCategory] = useState('bodywork')
  const [component, setComponent] = useState('')
  const [description, setDescription] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [severity, setSeverity] = useState<DefectSeverity>('minor')
  const [location, setLocation] = useState('')
  const [markVor, setMarkVor] = useState(false)
  const [passengersOnboard, setPassengersOnboard] = useState(false)
  const [safeToMove, setSafeToMove] = useState(true)
  const [recoveryRequired, setRecoveryRequired] = useState(false)
  const [affectsAccessibility, setAffectsAccessibility] = useState(false)
  const [emergencySupport, setEmergencySupport] = useState(false)

  const vehicleOptions = activeVehicles.map((v) => ({ id: v.id, label: `${v.registrationNumber}${v.fleetNumber ? ` (${v.fleetNumber})` : ''}` }))

  const report = useMutation({
    mutationFn: (submitVor: boolean) =>
      api.reportDefectHub(
        {
          vehicleId,
          category,
          component,
          description,
          severity,
          location: location || undefined,
          markVor: submitVor || markVor,
          symptoms: symptoms || undefined,
          passengersOnboard,
          safeToMove,
          recoveryRequired,
          affectsAccessibility,
          emergencySupport,
        },
        actorName,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defects-hub'] })
      onClose()
    },
  })

  return (
    <SectionCard title="Report defect" description="Structured defect report — submits for triage and safety review">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-ink-soft">Vehicle</span>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
            {vehicleOptions.map((v) => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-ink-soft">Severity</span>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as DefectSeverity)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
            <option value="advisory">Advisory</option>
            <option value="minor">Minor</option>
            <option value="major">Major</option>
            <option value="dangerous">Critical</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-ink-soft">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-ink-soft">Component</span>
          <input value={component} onChange={(e) => setComponent(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" placeholder="e.g. Nearside mirror" />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-ink-soft">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" placeholder="What is wrong?" />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-ink-soft">Symptoms</span>
          <input value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" placeholder="What did the driver or reporter observe?" />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-ink-soft">Location</span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" placeholder="Depot or roadside location" />
        </label>
      </div>

      <fieldset className="mt-4 rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-medium text-ink-soft">Safety assessment</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={passengersOnboard} onChange={(e) => setPassengersOnboard(e.target.checked)} />
            Passengers onboard
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={safeToMove} onChange={(e) => setSafeToMove(e.target.checked)} />
            Safe to move
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={recoveryRequired} onChange={(e) => setRecoveryRequired(e.target.checked)} />
            Recovery required
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={affectsAccessibility} onChange={(e) => setAffectsAccessibility(e.target.checked)} />
            Affects accessibility service
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={markVor} onChange={(e) => setMarkVor(e.target.checked)} />
            Mark vehicle VOR on submit
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={emergencySupport} onChange={(e) => setEmergencySupport(e.target.checked)} />
            Request emergency support
          </label>
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!vehicleId || !component || !description || report.isPending}
          onClick={() => report.mutate(false)}
          className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Submit for triage
        </button>
        <button
          type="button"
          disabled={!vehicleId || !component || !description || report.isPending}
          onClick={() => report.mutate(true)}
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 disabled:opacity-50"
        >
          Submit and mark VOR
        </button>
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-ink-soft">
          Cancel
        </button>
      </div>
    </SectionCard>
  )
}
