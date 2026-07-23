import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, expiryTone, formatDate } from '@/components/ui/status'
import { REQUIREMENT_TYPE_OPTIONS } from '@/lib/vehicles/compliance'
import type { VehicleProfile } from '@/lib/vehicles/types'
import { api } from '@/lib/api/client'

export function VehicleComplianceTab({
  vehicle,
  actorName,
  canVerify,
}: {
  vehicle: VehicleProfile
  actorName: string
  canVerify: boolean
}) {
  const queryClient = useQueryClient()
  const [showUpload, setShowUpload] = useState(false)
  const [requirementType, setRequirementType] = useState(REQUIREMENT_TYPE_OPTIONS[0]!.type)
  const [expiryDate, setExpiryDate] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicle-profile', vehicle.id] })
    queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
    queryClient.invalidateQueries({ queryKey: ['vehicle-directory-summary'] })
    queryClient.invalidateQueries({ queryKey: ['vehicles'] })
  }

  const upload = useMutation({
    mutationFn: () => {
      const opt = REQUIREMENT_TYPE_OPTIONS.find((o) => o.type === requirementType)!
      return api.uploadVehicleDocument(
        vehicle.id,
        {
          requirementType,
          label: opt.label,
          expiryDate: expiryDate || undefined,
          referenceNumber: referenceNumber || undefined,
          fileName: `${requirementType}-upload.pdf`,
        },
        actorName,
      )
    },
    onSuccess: () => {
      invalidate()
      setShowUpload(false)
      setExpiryDate('')
      setReferenceNumber('')
    },
  })

  const verify = useMutation({
    mutationFn: (documentId: string) => api.verifyVehicleDocument(vehicle.id, documentId, actorName),
    onSuccess: invalidate,
  })

  return (
    <SectionCard
      title="Compliance and documents"
      action={
        canVerify && (
          <button
            type="button"
            onClick={() => setShowUpload((v) => !v)}
            className="rounded-lg bg-command-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-command-700"
          >
            {showUpload ? 'Cancel' : 'Upload document'}
          </button>
        )
      }
    >
      <p className="mb-3 text-xs text-muted">
        Certificates must be verified before they affect vehicle release. MOT, insurance, tax and tachograph dates sync from verified documents.
      </p>

      {showUpload && (
        <div className="mb-4 grid gap-3 rounded-lg border border-border bg-surface-muted p-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="text-ink-soft">Requirement type</span>
            <select
              value={requirementType}
              onChange={(e) => setRequirementType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
            >
              {REQUIREMENT_TYPE_OPTIONS.map((o) => (
                <option key={o.type} value={o.type}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">Expiry date</span>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">Reference number</span>
            <input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
            />
          </label>
          <button
            type="button"
            onClick={() => upload.mutate()}
            disabled={upload.isPending}
            className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-60 sm:col-span-2"
          >
            {upload.isPending ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      )}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <th className="pb-2 pr-4 font-medium">Document</th>
            <th className="pb-2 pr-4 font-medium">Expiry</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vehicle.documents.map((doc) => (
            <tr key={doc.id} className="border-b border-border/60 last:border-0">
              <td className="py-2.5 pr-4 font-medium">{doc.label}</td>
              <td
                className={`py-2.5 pr-4 ${expiryTone(doc.expiryDate) === 'expired' ? 'text-red-700' : expiryTone(doc.expiryDate) === 'warning' ? 'text-amber-700' : 'text-ink-soft'}`}
              >
                {formatDate(doc.expiryDate)}
              </td>
              <td className="py-2.5 pr-4">
                <StatusPill status={doc.verificationStatus} />
              </td>
              <td className="py-2.5">
                {canVerify && (doc.verificationStatus === 'uploaded' || doc.verificationStatus === 'awaiting_review') && (
                  <button
                    type="button"
                    onClick={() => verify.mutate(doc.id)}
                    disabled={verify.isPending}
                    className="text-xs font-medium text-command-600 hover:underline"
                  >
                    Verify
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  )
}
