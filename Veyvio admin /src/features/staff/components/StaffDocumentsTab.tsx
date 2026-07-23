import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, formatDate } from '@/components/ui/status'
import { STAFF_DOCUMENT_TYPES } from '@/lib/staff/documents'
import type { StaffProfile } from '@/lib/staff/types'
import { api } from '@/lib/api/client'

export function StaffDocumentsTab({
  staff,
  actorName,
  canManage,
  canVerify,
}: {
  staff: StaffProfile
  actorName: string
  canManage: boolean
  canVerify: boolean
}) {
  const queryClient = useQueryClient()
  const [showUpload, setShowUpload] = useState(false)
  const [requirementType, setRequirementType] = useState<string>(STAFF_DOCUMENT_TYPES[0]!.type)
  const [expiryDate, setExpiryDate] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['staff-profile', staff.id] })
    queryClient.invalidateQueries({ queryKey: ['staff-hub'] })
  }

  const upload = useMutation({
    mutationFn: () => {
      const opt = STAFF_DOCUMENT_TYPES.find((o) => o.type === requirementType)!
      return api.uploadStaffDocument(
        staff.id,
        {
          requirementType,
          label: opt.label,
          expiryDate: expiryDate || null,
          referenceNumber: referenceNumber || null,
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
    mutationFn: (documentId: string) => api.verifyStaffDocument(staff.id, documentId, actorName),
    onSuccess: invalidate,
  })

  return (
    <div className="space-y-4">
      <SectionCard
        title="Documents"
        description="Employment, compliance and authorisation records — previous versions are preserved"
        action={
          canManage && (
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
        {showUpload && (
          <div className="mb-4 grid gap-3 rounded-lg border border-border bg-surface-muted p-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="text-ink-soft">Document type</span>
              <select
                value={requirementType}
                onChange={(e) => setRequirementType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              >
                {STAFF_DOCUMENT_TYPES.map((o) => (
                  <option key={o.type} value={o.type}>
                    {o.label}{o.sensitive ? ' (restricted)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Reference number</span>
              <input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Expiry date</span>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
            </label>
            <button type="button" onClick={() => upload.mutate()} disabled={upload.isPending} className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white sm:col-span-2">
              Submit upload
            </button>
          </div>
        )}

        {staff.documents.length === 0 ? (
          <p className="text-sm text-muted">No documents recorded.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {staff.documents.map((doc) => (
              <li key={doc.id} className="rounded-lg border border-border px-3 py-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {doc.label}
                      {doc.sensitive && <span className="ml-2 text-xs text-amber-700">Restricted</span>}
                    </p>
                    <p className="text-xs text-muted">
                      {doc.fileName ?? '—'}
                      {doc.referenceNumber ? ` · ${doc.referenceNumber}` : ''}
                    </p>
                    {doc.verifiedBy && <p className="text-xs text-muted">Verified by {doc.verifiedBy}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusPill status={doc.verificationStatus} />
                    <p className="text-xs text-muted">Expires {formatDate(doc.expiryDate)}</p>
                    {canVerify && doc.verificationStatus === 'awaiting_review' && (
                      <button type="button" onClick={() => verify.mutate(doc.id)} className="text-xs text-command-600 hover:underline">
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {staff.documentVersions.length > 0 && (
        <SectionCard title="Document history" description="Superseded versions retained for audit">
          <ul className="space-y-2 text-sm">
            {staff.documentVersions.map((v) => (
              <li key={v.id} className="rounded-lg border border-border px-3 py-2 text-ink-soft">
                <p className="font-medium text-ink">{v.label}</p>
                <p className="text-xs">Replaced {formatDate(v.replacedAt.slice(0, 10))} by {v.replacedBy}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}
