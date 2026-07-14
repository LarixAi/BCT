import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { FUEL_TYPE_LABELS, OWNERSHIP_TYPE_LABELS, VEHICLE_CATEGORY_LABELS } from '@/lib/vehicles/constants'
import type { CreateVehicleInput, FuelType, OwnershipType, UpdateVehicleInput, VehicleCategory } from '@/lib/vehicles/types'
import { VehicleBackLink } from './components/VehicleProfileHeader'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

export function VehicleFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const { data: existing, isLoading } = useQuery({
    queryKey: ['vehicle-profile', id],
    queryFn: () => api.getVehicleProfile(id!),
    enabled: isEdit,
  })

  const [registrationNumber, setRegistrationNumber] = useState('')
  const [fleetNumber, setFleetNumber] = useState('')
  const [vin, setVin] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>('minibus')
  const [homeDepotId, setHomeDepotId] = useState('depot-wembley')
  const [seatingCapacity, setSeatingCapacity] = useState('16')
  const [wheelchairCapacity, setWheelchairCapacity] = useState('0')
  const [fuelType, setFuelType] = useState<FuelType>('diesel')
  const [ownershipType, setOwnershipType] = useState<OwnershipType>('owned')
  const [mileage, setMileage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!existing) return
    setRegistrationNumber(existing.registrationNumber)
    setFleetNumber(existing.fleetNumber ?? '')
    setVin(existing.vin ?? '')
    setMake(existing.make)
    setModel(existing.model)
    setVehicleCategory(existing.vehicleCategory)
    setHomeDepotId(existing.homeDepotId)
    setSeatingCapacity(String(existing.seatingCapacity))
    setWheelchairCapacity(String(existing.wheelchairCapacity))
    setFuelType(existing.fuelType)
    setOwnershipType(existing.ownershipType)
    setMileage(existing.mileage != null ? String(existing.mileage) : '')
  }, [existing])

  const save = useMutation({
    mutationFn: async () => {
      if (isEdit && id) {
        const input: UpdateVehicleInput = {
          registrationNumber: registrationNumber.toUpperCase(),
          fleetNumber: fleetNumber || undefined,
          vin: vin || undefined,
          make,
          model,
          vehicleCategory,
          homeDepotId,
          seatingCapacity: Number(seatingCapacity),
          wheelchairCapacity: Number(wheelchairCapacity),
          fuelType,
          mileage: mileage ? Number(mileage) : undefined,
        }
        return api.updateVehicle(id, input, actorName)
      }
      const input: CreateVehicleInput = {
        registrationNumber: registrationNumber.toUpperCase(),
        fleetNumber: fleetNumber || undefined,
        vin: vin || undefined,
        make,
        model,
        vehicleCategory,
        homeDepotId,
        seatingCapacity: Number(seatingCapacity),
        wheelchairCapacity: Number(wheelchairCapacity),
        fuelType,
        ownershipType,
      }
      return api.createVehicle(input, actorName)
    },
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-directory-summary'] })
      navigate(isEdit ? `/vehicles/${vehicle.id}` : `/vehicles/${vehicle.id}/onboarding`)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not save vehicle'),
  })

  if (isEdit && isLoading) return <p className="text-sm text-slate-500">Loading…</p>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <VehicleBackLink />
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{isEdit ? 'Edit vehicle' : 'Add vehicle'}</h1>
        <p className="text-sm text-slate-600">
          {isEdit
            ? 'Update vehicle identity and specification. Release status is recalculated automatically.'
            : 'New vehicles enter onboarding — they cannot be released until documents and inspections are complete.'}
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <SectionCard title="Identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-600">Registration</span>
            <input
              required
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Fleet number</span>
            <input
              value={fleetNumber}
              onChange={(e) => setFleetNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-600">VIN / chassis number</span>
            <input
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Specification">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-600">Make</span>
            <input required value={make} onChange={(e) => setMake(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Model</span>
            <input required value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Category</span>
            <select value={vehicleCategory} onChange={(e) => setVehicleCategory(e.target.value as VehicleCategory)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
              {Object.entries(VEHICLE_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Home depot</span>
            <select value={homeDepotId} onChange={(e) => setHomeDepotId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
              <option value="depot-wembley">Wembley Depot</option>
              <option value="depot-croydon">Croydon Depot</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Seating capacity</span>
            <input type="number" min={1} value={seatingCapacity} onChange={(e) => setSeatingCapacity(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Wheelchair positions</span>
            <input type="number" min={0} value={wheelchairCapacity} onChange={(e) => setWheelchairCapacity(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Fuel type</span>
            <select value={fuelType} onChange={(e) => setFuelType(e.target.value as FuelType)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
              {Object.entries(FUEL_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          {!isEdit && (
            <label className="block text-sm">
              <span className="text-slate-600">Ownership</span>
              <select value={ownershipType} onChange={(e) => setOwnershipType(e.target.value as OwnershipType)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
                {Object.entries(OWNERSHIP_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
          )}
          {isEdit && (
            <label className="block text-sm">
              <span className="text-slate-600">Mileage</span>
              <input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
          )}
        </div>
      </SectionCard>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending || !registrationNumber || !make || !model}
          className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-60"
        >
          {save.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create vehicle'}
        </button>
      </div>
    </div>
  )
}
