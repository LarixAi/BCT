import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { DAMAGE_CLASSIFICATION_LABELS, DAMAGE_ZONES, zoneLabel } from '@/lib/vehicles/damage'
import type { DamageClassification, DamageZone, ReportDamageInput, VehicleProfile } from '@/lib/vehicles/types'
import { api } from '@/lib/api/client'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

export function VehicleDamageTab({ vehicle, actorName }: { vehicle: VehicleProfile; actorName: string }) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [zone, setZone] = useState<DamageZone>('front_bumper')
  const [description, setDescription] = useState('')
  const [classification, setClassification] = useState<DamageClassification>('existing')
  const [baseline, setBaseline] = useState(false)
  const [selectedZone, setSelectedZone] = useState<DamageZone | null>(null)
  const [imageFileName, setImageFileName] = useState<string | null>(null)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState('')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicle-profile', vehicle.id] })
  }

  const report = useMutation({
    mutationFn: () => {
      const input: ReportDamageInput = {
        zone,
        description,
        classification,
        baseline,
        imageFileName: imageFileName ?? undefined,
        imageDataUrl: imageDataUrl ?? undefined,
      }
      return api.reportVehicleDamage(vehicle.id, input, actorName)
    },
    onSuccess: () => {
      invalidate()
      setDescription('')
      setBaseline(false)
      setImageFileName(null)
      setImageDataUrl(null)
      setImageError('')
      if (fileRef.current) fileRef.current.value = ''
    },
  })

  const onFile = (file: File | null) => {
    setImageError('')
    if (!file) {
      setImageFileName(null)
      setImageDataUrl(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      setImageError('Please choose an image file')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Image must be under 2 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImageFileName(file.name)
      setImageDataUrl(typeof reader.result === 'string' ? reader.result : null)
    }
    reader.readAsDataURL(file)
  }

  const zoneRecords = selectedZone ? vehicle.damageRecords.filter((r) => r.zone === selectedZone) : vehicle.damageRecords
  const zonesWithDamage = new Set(vehicle.damageRecords.map((r) => r.zone))

  return (
    <div className="space-y-4">
      <SectionCard title="Body zone map" description="Select a zone to view or record damage. Baseline records support comparison on return.">
        <div className="grid max-w-md grid-cols-3 gap-1">
          {DAMAGE_ZONES.map((z) => {
            const hasDamage = zonesWithDamage.has(z.id)
            const active = selectedZone === z.id
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => setSelectedZone(z.id === selectedZone ? null : z.id)}
                className={`rounded border px-1 py-2 text-center text-[10px] font-medium leading-tight ${
                  active
                    ? 'border-command-500 bg-command-50 text-command-800'
                    : hasDamage
                      ? 'border-amber-300 bg-amber-50 text-amber-900'
                      : 'border-border bg-surface text-ink-soft hover:bg-surface-muted'
                }`}
                style={{ gridRow: z.row + 1, gridColumn: z.col + 1 }}
              >
                {z.label}
              </button>
            )
          })}
        </div>
        {selectedZone && (
          <p className="mt-2 text-sm text-ink-soft">
            Selected: <span className="font-medium">{zoneLabel(selectedZone)}</span>
            {' · '}
            {zoneRecords.length} record{zoneRecords.length === 1 ? '' : 's'}
          </p>
        )}
      </SectionCard>

      <SectionCard title="Record damage">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="text-ink-soft">Body zone</span>
            <select value={zone} onChange={(e) => setZone(e.target.value as DamageZone)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
              {DAMAGE_ZONES.map((z) => (
                <option key={z.id} value={z.id}>{z.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-ink-soft">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="text-ink-soft">Classification</span>
            <select value={classification} onChange={(e) => setClassification(e.target.value as DamageClassification)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
              {Object.entries(DAMAGE_CLASSIFICATION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-2 text-sm">
            <input type="checkbox" checked={baseline} onChange={(e) => setBaseline(e.target.checked)} />
            Baseline record (onboarding / intake)
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-ink-soft">Photo</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
            {imageError && <p className="mt-1 text-xs text-red-700">{imageError}</p>}
            {imageDataUrl && (
              <img src={imageDataUrl} alt="Damage preview" className="mt-2 max-h-32 rounded-lg border border-border object-cover" />
            )}
          </label>
          <button
            type="button"
            onClick={() => report.mutate()}
            disabled={report.isPending || !description.trim()}
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 sm:col-span-2 sm:w-fit"
          >
            Save damage record
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Damage register" description={`${vehicle.damageRecords.length} records on file`}>
        {zoneRecords.length === 0 ? (
          <p className="text-sm text-muted">No damage records{selectedZone ? ' for this zone' : ''}.</p>
        ) : (
          <ul className="divide-y divide-border">
            {zoneRecords.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-ink">{r.zoneLabel}</p>
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-soft">
                        {DAMAGE_CLASSIFICATION_LABELS[r.classification]}
                      </span>
                    </div>
                    <p className="mt-1 text-ink-soft">{r.description}</p>
                    <p className="mt-1 text-xs text-muted">
                      {r.reportedBy} · {new Date(r.reportedAt).toLocaleString('en-GB')}
                      {r.baseline && ' · Baseline'}
                      {r.imageFileName && !r.imageDataUrl && ` · ${r.imageFileName}`}
                    </p>
                  </div>
                  {r.imageDataUrl && (
                    <img
                      src={r.imageDataUrl}
                      alt={r.imageFileName ?? r.zoneLabel}
                      className="h-20 w-28 shrink-0 rounded-lg border border-border object-cover"
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
