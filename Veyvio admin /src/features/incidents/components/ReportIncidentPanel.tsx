import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { CATEGORY_LABELS, INCIDENT_CATEGORIES } from '@/lib/incidents/constants'
import type { IncidentCategory, IncidentSeverity } from '@/lib/incidents/types'
import { api } from '@/lib/api/client'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { tKey } from '@/lib/tenant/tenant-query-scope'


const IMMEDIATE_ACTION_OPTIONS = [
  'Emergency services contacted',
  'First aid administered',
  'Area secured / isolated',
  'Vehicle stopped safely',
  'Passengers accounted for',
  'Supervisor notified',
  'Evidence preserved',
]

export function ReportIncidentPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const { data: vehicles = [] } = useQuery({ queryKey: tKey(['vehicles']), queryFn: () => api.getVehicles() })
  const { data: drivers = [] } = useQuery({ queryKey: tKey(['drivers']), queryFn: () => api.getDrivers() })
  const { data: schools = [] } = useQuery({ queryKey: tKey(['schools']), queryFn: () => api.getSchools() })
  const { data: contracts = [] } = useQuery({ queryKey: tKey(['contracts']), queryFn: () => api.getContracts() })
  const { data: passengers = [] } = useQuery({ queryKey: tKey(['passengers']), queryFn: () => api.getPassengers() })

  const [step, setStep] = useState(1)
  const [immediateDanger, setImmediateDanger] = useState<'yes' | 'emergency_contacted' | 'no' | 'unknown'>('no')
  const [category, setCategory] = useState<IncidentCategory>('passenger_injury')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<IncidentSeverity>('medium')
  const [location, setLocation] = useState('')
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16))
  const [isSafeguarding, setIsSafeguarding] = useState(false)
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [runReference, setRunReference] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [contractId, setContractId] = useState('')
  const [bookingReference, setBookingReference] = useState('')
  const [passengerIds, setPassengerIds] = useState<string[]>([])
  const [manifestId, setManifestId] = useState('')
  const [passengerInvolved, setPassengerInvolved] = useState(false)
  const [immediateActionsTaken, setImmediateActionsTaken] = useState<string[]>([])
  const [createDefect, setCreateDefect] = useState(false)
  const [markVehicleVor, setMarkVehicleVor] = useState(false)

  const selectedDriver = drivers.find((d) => d.id === driverId)

  const report = useMutation({
    mutationFn: () =>
      api.reportIncidentHub(
        {
          immediateDanger,
          occurredAt: new Date(occurredAt).toISOString(),
          location,
          category,
          title,
          description,
          severity,
          isSafeguarding: isSafeguarding || category === 'safeguarding',
          reportingSource: 'admin',
          vehicleId: vehicleId || undefined,
          driverId: driverId || undefined,
          driverName: selectedDriver ? `${selectedDriver.firstName} ${selectedDriver.lastName}` : undefined,
          runReference: runReference || undefined,
          schoolId: schoolId || undefined,
          contractId: contractId || undefined,
          bookingReference: bookingReference || undefined,
          passengerIds: passengerIds.length ? passengerIds : undefined,
          manifestId: manifestId || undefined,
          passengerInvolved,
          immediateActionsTaken,
          createDefect,
          markVehicleVor,
        },
        actorName,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tKey(['incidents-hub']) })
      onClose()
    },
  })

  function toggleAction(action: string) {
    setImmediateActionsTaken((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action],
    )
  }

  return (
    <SectionCard title="Report incident" description="Step-by-step safety reporting — emergency action always takes priority">
      {step === 1 && (
        <div className="space-y-4" data-testid="report-incident-step-1">
          <p className="text-sm font-medium text-ink">Is anyone currently in immediate danger or need of emergency assistance?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              ['yes', 'Yes — emergency response required'],
              ['emergency_contacted', 'Emergency services already contacted'],
              ['no', 'No immediate danger'],
              ['unknown', 'Unknown'],
            ] as const).map(([value, label]) => (
              <label key={value} className={`rounded-lg border p-3 text-sm cursor-pointer ${immediateDanger === value ? 'border-red-400 bg-red-50' : 'border-border'}`}>
                <input type="radio" name="danger" value={value} checked={immediateDanger === value} onChange={() => setImmediateDanger(value)} className="mr-2" />
                {label}
              </label>
            ))}
          </div>
          {immediateDanger === 'yes' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              Call emergency services first. Record the incident once people are safe.
            </div>
          )}
          <button type="button" onClick={() => setStep(2)} className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white">
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-3 sm:grid-cols-2" data-testid="report-incident-step-2">
          <label className="block text-sm sm:col-span-2">
            <span className="text-ink-soft">Short title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" placeholder="Brief description of what happened" />
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as IncidentCategory)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
              {INCIDENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">Severity</span>
            <select value={severity} onChange={(e) => setSeverity(e.target.value as IncidentSeverity)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="near_miss">Near miss</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">When it occurred</span>
            <input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">Location</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-ink-soft">What happened?</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={isSafeguarding} onChange={(e) => setIsSafeguarding(e.target.checked)} />
            Safeguarding incident — restricted workflow
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" disabled={!title || !description || !location} onClick={() => setStep(3)} className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              Continue
            </button>
            <button type="button" onClick={() => setStep(1)} className="rounded-lg px-4 py-2 text-sm text-ink-soft">Back</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-3 sm:grid-cols-2" data-testid="report-incident-step-3">
          <label className="block text-sm">
            <span className="text-ink-soft">Vehicle (optional)</span>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
              <option value="">No vehicle linked</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNumber} — {v.make} {v.model}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">Driver (optional)</span>
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
              <option value="">No driver linked</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-ink-soft">Run / duty reference (optional)</span>
            <input value={runReference} onChange={(e) => setRunReference(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" placeholder="e.g. RUN-2841" />
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">School (optional)</span>
            <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" data-testid="report-school-select">
              <option value="">No school linked</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">Contract (optional)</span>
            <select value={contractId} onChange={(e) => setContractId(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" data-testid="report-contract-select">
              <option value="">No contract linked</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">Booking reference (optional)</span>
            <input value={bookingReference} onChange={(e) => setBookingReference(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" placeholder="e.g. BKG-4421" />
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">Manifest ID (optional)</span>
            <input value={manifestId} onChange={(e) => setManifestId(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" placeholder="e.g. mf-114" />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-ink-soft">Passengers (optional)</span>
            <select
              multiple
              value={passengerIds}
              onChange={(e) => setPassengerIds(Array.from(e.target.selectedOptions, (o) => o.value))}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              data-testid="report-passenger-select"
            >
              {passengers.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
          </label>
          {vehicleId && (
            <div className="space-y-2 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={createDefect} onChange={(e) => setCreateDefect(e.target.checked)} />
                Create linked defect from this incident
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={markVehicleVor} onChange={(e) => setMarkVehicleVor(e.target.checked)} />
                Mark vehicle off road (VOR)
              </label>
            </div>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" onClick={() => setStep(4)} className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white">Continue</button>
            <button type="button" onClick={() => setStep(2)} className="rounded-lg px-4 py-2 text-sm text-ink-soft">Back</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4" data-testid="report-incident-step-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={passengerInvolved} onChange={(e) => setPassengerInvolved(e.target.checked)} />
            Passenger or vulnerable person involved — welfare follow-up may be required
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(5)} className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white">Continue</button>
            <button type="button" onClick={() => setStep(3)} className="rounded-lg px-4 py-2 text-sm text-ink-soft">Back</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4" data-testid="report-incident-step-5">
          <p className="text-sm font-medium text-ink">Immediate actions already taken</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {IMMEDIATE_ACTION_OPTIONS.map((action) => (
              <label key={action} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={immediateActionsTaken.includes(action)} onChange={() => toggleAction(action)} />
                {action}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={report.isPending} onClick={() => report.mutate()} className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" data-testid="submit-incident-report">
              Submit incident
            </button>
            <button type="button" onClick={() => setStep(4)} className="rounded-lg px-4 py-2 text-sm text-ink-soft">Back</button>
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-ink-soft">Cancel</button>
          </div>
        </div>
      )}
    </SectionCard>
  )
}
