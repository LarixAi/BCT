import { useState, useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { canReturnToService } from '@/lib/vehicles/maintenance'
import { releaseChecklistForRepairType } from '@/lib/maintenance/release-checklist'
import {
  canEditVehicle,
  canMarkVehicleVor,
  canReturnVehicleToService as canReleasePerm,
  canVerifyVehicleDocuments,
} from '@/lib/vehicles/permissions'
import type { ReturnToServiceInput } from '@/lib/vehicles/types'
import { VehicleBackLink, VehicleProfileHeader } from './components/VehicleProfileHeader'
import { VehicleChecksTab } from './components/VehicleChecksTab'
import { VehicleComplianceTab } from './components/VehicleComplianceTab'
import { VehicleDefectsTab } from './components/VehicleDefectsTab'
import { VehicleEquipmentTab } from './components/VehicleEquipmentTab'
import { VehicleDamageTab } from './components/VehicleDamageTab'
import { VehicleTelematicsPanel } from './components/VehicleTelematicsPanel'
import { eventTypeLabel } from '@/lib/vehicles/events'
import { isOnboardingComplete } from '@/lib/vehicles/onboarding'
import { VehicleMaintenanceTab } from './components/VehicleMaintenanceTab'
import { VehicleWheelsTab } from './components/VehicleWheelsTab'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

const TABS = [
  'Overview',
  'Compliance',
  'Allocations',
  'Checks & inspections',
  'Defects',
  'Damage & media',
  'Maintenance',
  'Wheels & tyres',
  'Equipment',
  'Documents',
  'Timeline & audit',
] as const

const TAB_QUERY_MAP: Record<string, (typeof TABS)[number]> = {
  documents: 'Documents',
  damage: 'Damage & media',
  equipment: 'Equipment',
  checks: 'Checks & inspections',
  maintenance: 'Maintenance',
  defects: 'Defects',
}

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const tabFromQuery = searchParams.get('tab')
  const initialTab = tabFromQuery && TAB_QUERY_MAP[tabFromQuery] ? TAB_QUERY_MAP[tabFromQuery] : 'Overview'
  const [tab, setTab] = useState<(typeof TABS)[number]>(initialTab)
  const [showRelease, setShowRelease] = useState(false)
  const [releaseReason, setReleaseReason] = useState('')
  const [postRepairCheck, setPostRepairCheck] = useState(false)
  const [retorqueComplete, setRetorqueComplete] = useState(false)
  const [technicianSignOff, setTechnicianSignOff] = useState('')
  const [releaseChecklist, setReleaseChecklist] = useState<Record<string, boolean>>({})
  const permissions = user?.permissions ?? []
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const { data: vehicle, isLoading, error, isError } = useQuery({
    queryKey: ['vehicle-profile', id],
    queryFn: () => api.getVehicleProfile(id!),
    enabled: !!id,
  })

  const { data: duties = [] } = useQuery({
    queryKey: ['duties'],
    queryFn: () => api.getDuties(),
  })

  useEffect(() => {
    if (tabFromQuery && TAB_QUERY_MAP[tabFromQuery]) {
      setTab(TAB_QUERY_MAP[tabFromQuery])
    }
  }, [tabFromQuery])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicle-profile', id] })
    queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
    queryClient.invalidateQueries({ queryKey: ['vehicle-directory-summary'] })
    queryClient.invalidateQueries({ queryKey: ['vehicle-release-exceptions'] })
    queryClient.invalidateQueries({ queryKey: ['vehicles'] })
  }

  const returnToService = useMutation({
    mutationFn: (input: ReturnToServiceInput) => api.returnVehicleToService(id!, actorName, input),
    onSuccess: () => {
      invalidate()
      setShowRelease(false)
    },
  })

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>
  if (isError || !vehicle) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Vehicle not found'}</p>
  }

  const todayDuties = duties.filter((d) => d.vehicle?.id === vehicle.id)
  const canEdit = canEditVehicle(permissions)
  const canVor = canMarkVehicleVor(permissions)
  const canRelease = canReleasePerm(permissions)
  const canVerify = canVerifyVehicleDocuments(permissions)
  const openRepairType = vehicle.workOrders.find((w) => !['completed', 'cancelled'].includes(w.status))?.type ?? 'repair'
  const checklistItems = releaseChecklistForRepairType(openRepairType)
  const releaseBlockers = showRelease
    ? canReturnToService(vehicle, {
        reason: releaseReason,
        postRepairCheckComplete: postRepairCheck,
        wheelRetorqueComplete: retorqueComplete,
        technicianSignOff,
        checklist: releaseChecklist,
        repairType: openRepairType,
      })
    : []

  return (
    <div className="space-y-6">
      <VehicleBackLink />

      <VehicleProfileHeader
        vehicle={vehicle}
        actions={
          <>
            {canEdit && (
              <Link to={`/vehicles/${vehicle.id}/edit`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Edit
              </Link>
            )}
            {canVor && vehicle.operationalStatus !== 'vor' && (
              <button type="button" onClick={() => setTab('Defects')} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50">
                Mark VOR
              </button>
            )}
            {canRelease && (vehicle.operationalStatus === 'vor' || vehicle.operationalStatus === 'in_workshop') && (
              <button type="button" onClick={() => setShowRelease((v) => !v)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                Return to service
              </button>
            )}
          </>
        }
      />

      {vehicle.lifecycleStatus === 'awaiting_onboarding' && !isOnboardingComplete(vehicle.onboarding) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This vehicle is in onboarding and cannot be released until all stages are approved.{' '}
          <Link to={`/vehicles/${vehicle.id}/onboarding`} className="font-medium text-command-700 underline">
            Continue onboarding wizard →
          </Link>
        </div>
      )}

      {showRelease && (
        <SectionCard title="Return to service" description="All blockers must be resolved — work order completion alone does not release the vehicle">
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="text-slate-600">Release reason</span>
              <input value={releaseReason} onChange={(e) => setReleaseReason(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5" />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={postRepairCheck} onChange={(e) => setPostRepairCheck(e.target.checked)} />
              Post-repair inspection complete
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={retorqueComplete} onChange={(e) => setRetorqueComplete(e.target.checked)} />
              Wheel re-torque complete (if applicable)
            </label>
            <div>
              <p className="mb-2 text-slate-600">Return-to-service checklist ({openRepairType.replace(/_/g, ' ')})</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {checklistItems.map((item) => (
                  <label key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={releaseChecklist[item.id] ?? false}
                      onChange={(e) => setReleaseChecklist((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="text-slate-600">Technician sign-off</span>
              <input value={technicianSignOff} onChange={(e) => setTechnicianSignOff(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5" />
            </label>
            {releaseBlockers.length > 0 && (
              <ul className="list-inside list-disc text-red-700">
                {releaseBlockers.map((b: string) => <li key={b}>{b}</li>)}
              </ul>
            )}
            <button
              type="button"
              onClick={() =>
                returnToService.mutate({
                  reason: releaseReason,
                  postRepairCheckComplete: postRepairCheck,
                  wheelRetorqueComplete: retorqueComplete,
                  technicianSignOff,
                  checklist: releaseChecklist,
                  repairType: openRepairType,
                })
              }
              disabled={returnToService.isPending || releaseBlockers.length > 0 || !releaseReason}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Authorise release
            </button>
          </div>
        </SectionCard>
      )}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium ${tab === t ? 'bg-white text-command-700 ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Current operation">
            <dl className="space-y-2 text-sm">
              <Row label="Driver" value={vehicle.currentDriverName ?? '—'} />
              <Row label="Run" value={vehicle.currentRunReference ?? '—'} />
              <Row label="Location" value={vehicle.currentLocationLabel ?? '—'} />
              <Row label="Mileage" value={vehicle.mileage != null ? `${vehicle.mileage.toLocaleString()} mi` : '—'} />
            </dl>
          </SectionCard>
          <SectionCard title="Upcoming">
            <dl className="space-y-2 text-sm">
              <Row label="Next driver" value={vehicle.nextDriverName ?? '—'} />
              <Row label="Next run" value={vehicle.nextRunReference ?? '—'} />
              <Row label="Departure" value={vehicle.nextDepartureTime ?? '—'} />
            </dl>
          </SectionCard>
          <div className="lg:col-span-2">
            <VehicleTelematicsPanel vehicle={vehicle} />
          </div>
          {vehicle.tachograph && (
            <SectionCard title="Tachograph" className="lg:col-span-2">
              <p className="text-sm text-slate-600">
                {vehicle.tachograph.make} {vehicle.tachograph.model} · Next calibration: {vehicle.tachograph.nextCalibrationDate ?? '—'}
              </p>
              {vehicle.tachograph.reviewRequired && (
                <p className="mt-2 text-sm text-amber-800">Review required: {vehicle.tachograph.reviewReason}</p>
              )}
            </SectionCard>
          )}
        </div>
      )}

      {tab === 'Compliance' && <VehicleComplianceTab vehicle={vehicle} actorName={actorName} canVerify={canVerify} />}
      {tab === 'Allocations' && (
        <SectionCard title="Today's duties">
          {todayDuties.length === 0 ? (
            <p className="text-sm text-slate-500">Not allocated today.</p>
          ) : (
            <ul className="space-y-2">
              {todayDuties.map((d) => (
                <li key={d.id} className="flex justify-between text-sm">
                  <Link to={`/runs/${d.id}`} className="font-medium text-command-600 hover:underline">{d.reference}</Link>
                  <StatusPill status={d.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}
      {tab === 'Checks & inspections' && (
        <VehicleChecksTab
          vehicle={vehicle}
          actorName={actorName}
          showInitialInspectionAction={vehicle.lifecycleStatus === 'awaiting_onboarding'}
        />
      )}
      {tab === 'Defects' && <VehicleDefectsTab vehicle={vehicle} actorName={actorName} />}
      {tab === 'Damage & media' && <VehicleDamageTab vehicle={vehicle} actorName={actorName} />}
      {tab === 'Maintenance' && <VehicleMaintenanceTab vehicle={vehicle} actorName={actorName} />}
      {tab === 'Wheels & tyres' && <VehicleWheelsTab vehicle={vehicle} actorName={actorName} />}
      {tab === 'Equipment' && (
        <VehicleEquipmentTab
          vehicle={vehicle}
          editable={vehicle.lifecycleStatus === 'awaiting_onboarding'}
          actorName={actorName}
        />
      )}
      {tab === 'Documents' && <VehicleComplianceTab vehicle={vehicle} actorName={actorName} canVerify={canVerify} />}
      {tab === 'Timeline & audit' && (
        <div className="space-y-4">
          {vehicle.platformEvents.length > 0 && (
            <SectionCard title="Platform events" description="Cross-application event bus">
              <ul className="space-y-3">
                {vehicle.platformEvents.map((e) => (
                  <li key={e.id} className="border-b border-slate-100 pb-3 text-sm last:border-0">
                    <p className="font-medium capitalize">{eventTypeLabel(e.type)}</p>
                    <p className="text-slate-700">{e.summary}</p>
                    <p className="text-slate-500">
                      {e.sourceApplication}
                      {e.actorName && ` · ${e.actorName}`}
                      {' · '}
                      {new Date(e.createdAt).toLocaleString('en-GB')}
                    </p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
          <SectionCard title="Audit trail">
            <ul className="space-y-3">
              {vehicle.auditEvents.map((e) => (
                <li key={e.id} className="border-b border-slate-100 pb-3 text-sm last:border-0">
                  <p className="font-medium">{e.action}</p>
                  <p className="text-slate-600">{e.actor} · {new Date(e.createdAt).toLocaleString('en-GB')}</p>
                  {e.reason && <p className="text-slate-500">{e.reason}</p>}
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}
