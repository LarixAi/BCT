import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'
import { PLACE_KIND_LABELS, type PlaceKind } from '@/lib/places/types'

const EMPTY_FORM = { kind: 'customer_site' as PlaceKind, name: '', address: '', lat: '', lng: '', radiusM: '120' }

export function PlacesPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: places = [], isLoading } = useQuery({
    queryKey: tKey(['places']),
    queryFn: () => api.getPlaces(),
  })

  const createMutation = useMutation({
    mutationFn: () => {
      const lat = Number(form.lat)
      const lng = Number(form.lng)
      const radiusM = Number(form.radiusM || '120')
      if (!form.name.trim()) throw new Error('Name is required')
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error('Enter a valid latitude')
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error('Enter a valid longitude')
      return api.createPlace({
        kind: form.kind,
        name: form.name.trim(),
        address: form.address.trim() || null,
        lat,
        lng,
        radiusM,
      })
    },
    onSuccess: async () => {
      setForm(EMPTY_FORM)
      setFormError(null)
      await queryClient.invalidateQueries({ queryKey: tKey(['places']) })
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : 'Could not save this place.')
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Places</h1>
        <p className="text-sm text-ink-soft">
          Depots, customer sites, and waypoints as reusable locations. Linking a duty stop to a place lets Driver
          suggest arrival when the driver's GPS enters the geofence — the driver still confirms it, this never marks a
          stop arrived automatically.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate()
        }}
        className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <select
          value={form.kind}
          onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as PlaceKind }))}
          className="rounded-lg border border-border px-3 py-1.5 text-sm lg:col-span-1"
        >
          {Object.entries(PLACE_KIND_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          required
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="rounded-lg border border-border px-3 py-1.5 text-sm lg:col-span-2"
        />
        <input
          placeholder="Address (optional)"
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          className="rounded-lg border border-border px-3 py-1.5 text-sm lg:col-span-2"
        />
        <input
          required
          type="number"
          step="any"
          placeholder="Lat"
          value={form.lat}
          onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
        />
        <input
          required
          type="number"
          step="any"
          placeholder="Lng"
          value={form.lng}
          onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
        />
        <input
          type="number"
          step="1"
          min="1"
          max="2000"
          placeholder="Radius (m)"
          value={form.radiusM}
          onChange={(e) => setForm((f) => ({ ...f, radiusM: e.target.value }))}
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-lg bg-command-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50 lg:col-span-1"
        >
          {createMutation.isPending ? 'Saving…' : 'Add place'}
        </button>
        {formError && <p className="text-xs text-red-700 sm:col-span-2 lg:col-span-6">{formError}</p>}
      </form>

      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : places.length === 0 ? (
        <p className="text-sm text-muted">No places yet — add a depot or customer site above.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2">Kind</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Address</th>
                <th className="px-4 py-2">Coordinates</th>
                <th className="px-4 py-2">Geofence radius</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {places.map((place) => (
                <tr key={place.id}>
                  <td className="px-4 py-2 text-ink-soft">{PLACE_KIND_LABELS[place.kind]}</td>
                  <td className="px-4 py-2 font-medium text-ink">{place.name}</td>
                  <td className="px-4 py-2 text-ink-soft">{place.address ?? '—'}</td>
                  <td className="px-4 py-2 tabular-nums text-ink-soft">
                    {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-ink-soft">{place.radiusM}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
