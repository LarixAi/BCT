import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, expiryTone, formatDate } from '@/components/ui/status'
import { REQUIREMENT_TYPE_OPTIONS } from '@/lib/vehicles/compliance'
import { DOCUMENT_FOLDERS, groupDocumentsByFolder } from '@/lib/vehicles/document-folders'
import type { DocumentFolderId } from '@/lib/vehicles/document-folders'
import type { VehicleProfile } from '@/lib/vehicles/types'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function VehicleDocumentsTab({
  vehicle,
  actorName,
  canVerify,
}: {
  vehicle: VehicleProfile
  actorName: string
  canVerify: boolean
}) {
  const queryClient = useQueryClient()
  const [folder, setFolder] = useState<DocumentFolderId>('compliance')
  const [showUpload, setShowUpload] = useState(false)
  const [requirementType, setRequirementType] = useState(REQUIREMENT_TYPE_OPTIONS[0]!.type)
  const [expiryDate, setExpiryDate] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')

  const grouped = useMemo(() => groupDocumentsByFolder(vehicle.documents), [vehicle.documents])
  const activeFolder = DOCUMENT_FOLDERS.find((f) => f.id === folder)!
  const rows = grouped[folder]

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: tKey(['vehicle-profile', vehicle.id]) })
    queryClient.invalidateQueries({ queryKey: tKey(['vehicle-profiles']) })
    queryClient.invalidateQueries({ queryKey: tKey(['vehicle-directory-summary']) })
    queryClient.invalidateQueries({ queryKey: tKey(['vehicles']) })
  }

  const upload = useMutation({
    mutationFn: () => {
      const opt = REQUIREMENT_TYPE_OPTIONS.find((o) => o.type === requirementType)
      return api.uploadVehicleDocument(
        vehicle.id,
        {
          requirementType,
          label: opt?.label ?? requirementType,
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
    <div className="space-y-4">
      <SectionCard
        title="Document cabinet"
        description="Digital filing for this vehicle — compliance certificates, ownership and manufacturer packs"
        action={
          canVerify ? (
            <button
              type="button"
              onClick={() => setShowUpload((v) => !v)}
              className="rounded-lg bg-command-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-command-700"
            >
              {showUpload ? 'Cancel' : 'Upload document'}
            </button>
          ) : undefined
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {DOCUMENT_FOLDERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFolder(f.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                folder === f.id
                  ? 'bg-command-600 text-white'
                  : 'border border-border bg-surface text-ink-soft hover:bg-surface-muted'
              }`}
            >
              {f.label}
              <span className="ml-1 tabular-nums opacity-80">({grouped[f.id].length})</span>
            </button>
          ))}
        </div>

        <p className="mb-3 text-sm text-ink-soft">{activeFolder.description}</p>

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

        {rows.length === 0 ? (
          <p className="text-sm text-muted">No documents in this folder yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted">
                <th className="pb-2 pr-3 font-medium">Document</th>
                <th className="pb-2 pr-3 font-medium">Reference</th>
                <th className="pb-2 pr-3 font-medium">Expiry</th>
                <th className="pb-2 pr-3 font-medium">Verification</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((doc) => {
                const tone = expiryTone(doc.expiryDate)
                return (
                  <tr key={doc.id} className="border-b border-border/60">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium">{doc.label}</p>
                      <p className="text-xs text-muted">{doc.fileName ?? doc.requirementType}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-ink-soft">{doc.referenceNumber ?? '—'}</td>
                    <td className={`py-2.5 pr-3 tabular-nums ${tone === 'expired' ? 'text-red-700' : tone === 'warning' ? 'text-amber-700' : ''}`}>
                      {doc.expiryDate ? formatDate(doc.expiryDate) : '—'}
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusPill status={doc.verificationStatus} />
                      {doc.verifiedBy && (
                        <span className="mt-1 block text-xs text-muted">
                          {doc.verifiedBy}
                          {doc.verifiedAt ? ` · ${new Date(doc.verifiedAt).toLocaleDateString('en-GB')}` : ''}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5">
                      {canVerify &&
                        (doc.verificationStatus === 'uploaded' ||
                          doc.verificationStatus === 'awaiting_review') && (
                          <button
                            type="button"
                            onClick={() => verify.mutate(doc.id)}
                            className="text-xs font-medium text-command-700 hover:underline"
                          >
                            Verify
                          </button>
                        )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard title="Expiry reminders" description="Dates that affect release and Dispatch">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <ExpiryRow label="MOT" date={vehicle.motExpiry} />
          <ExpiryRow label="Insurance" date={vehicle.insuranceExpiry} />
          <ExpiryRow label="Tax" date={vehicle.taxExpiry} />
          <ExpiryRow label="Tachograph" date={vehicle.tachographCalibrationExpiry} />
        </dl>
      </SectionCard>
    </div>
  )
}

function ExpiryRow({ label, date }: { label: string; date: string | null }) {
  const tone = expiryTone(date)
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={`font-semibold tabular-nums ${
          tone === 'expired' ? 'text-red-700' : tone === 'warning' ? 'text-amber-700' : 'text-ink'
        }`}
      >
        {date ? formatDate(date) : '—'}
      </dd>
    </div>
  )
}
