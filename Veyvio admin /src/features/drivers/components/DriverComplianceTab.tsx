import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, expiryTone, formatDate } from '@/components/ui/status'
import { REQUIREMENT_TYPE_OPTIONS } from '@/lib/drivers/compliance'
import type { DriverProfile } from '@/lib/drivers/types'
import { api } from '@/lib/api/client'

export function DriverComplianceTab({
  driver,
  actorName,
  canVerify,
}: {
  driver: DriverProfile
  actorName: string
  canVerify: boolean
}) {
  const queryClient = useQueryClient()
  const [showUpload, setShowUpload] = useState(false)
  const [requirementType, setRequirementType] = useState(REQUIREMENT_TYPE_OPTIONS[0]!.type)
  const [expiryDate, setExpiryDate] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [rejectDocId, setRejectDocId] = useState<string | null>(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['driver-profile', driver.id] })
    queryClient.invalidateQueries({ queryKey: ['driver-profiles'] })
    queryClient.invalidateQueries({ queryKey: ['driver-directory-summary'] })
    queryClient.invalidateQueries({ queryKey: ['drivers'] })
  }

  const upload = useMutation({
    mutationFn: () => {
      const opt = REQUIREMENT_TYPE_OPTIONS.find((o) => o.type === requirementType)!
      return api.uploadDriverDocument(
        driver.id,
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
    mutationFn: (documentId: string) => api.verifyDriverDocument(driver.id, documentId, actorName),
    onSuccess: invalidate,
  })

  const reject = useMutation({
    mutationFn: (documentId: string) =>
      api.rejectDriverDocument(driver.id, documentId, rejectReason || 'Evidence unclear or invalid', actorName),
    onSuccess: () => {
      invalidate()
      setRejectDocId(null)
      setRejectReason('')
    },
  })

  const actionError =
    (verify.isError && (verify.error instanceof Error ? verify.error.message : 'Verify failed')) ||
    (reject.isError && (reject.error instanceof Error ? reject.error.message : 'Reject failed')) ||
    (upload.isError && (upload.error instanceof Error ? upload.error.message : 'Upload failed')) ||
    null

  return (
    <div className="space-y-4">
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
        <p className="mb-3 text-xs text-slate-500">
          Uploaded documents require verification before they affect eligibility. Previous versions are preserved.
        </p>

        {actionError ? (
          <p className="mb-3 rounded-lg border border-critical/30 bg-critical/5 px-3 py-2 text-sm text-critical">
            {actionError}
          </p>
        ) : null}

        {showUpload && (
          <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="text-slate-600">Requirement type</span>
              <select
                value={requirementType}
                onChange={(e) => setRequirementType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
              >
                {REQUIREMENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.type} value={o.type}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Reference number</span>
              <input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Expiry date</span>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
              />
            </label>
            <button
              type="button"
              onClick={() => upload.mutate()}
              disabled={upload.isPending}
              className="sm:col-span-2 rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
            >
              Submit for review
            </button>
          </div>
        )}

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
              <th className="pb-2 pr-4">Requirement</th>
              <th className="pb-2 pr-4">Expiry</th>
              <th className="pb-2 pr-4">Verification</th>
              <th className="pb-2 pr-4">File</th>
              {canVerify && <th className="pb-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {driver.documents.length === 0 ? (
              <tr>
                <td colSpan={canVerify ? 5 : 4} className="py-4 text-slate-500">
                  No documents uploaded yet.
                </td>
              </tr>
            ) : (
              driver.documents.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-50">
                  <td className="py-2.5 pr-4 font-medium">{doc.label}</td>
                  <td className="py-2.5 pr-4">
                    <span className={expiryTone(doc.expiryDate) === 'expired' ? 'text-red-700' : ''}>
                      {formatDate(doc.expiryDate)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusPill status={doc.verificationStatus} />
                    {doc.rejectionReason && (
                      <p className="mt-1 text-xs text-red-700">{doc.rejectionReason}</p>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">{doc.fileName ?? '—'}</td>
                  {canVerify && (
                    <td className="py-2.5">
                      {(doc.verificationStatus === 'awaiting_review' || doc.verificationStatus === 'uploaded') && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => verify.mutate(doc.id)}
                            disabled={verify.isPending}
                            className="text-xs font-medium text-emerald-700 hover:underline"
                          >
                            Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectDocId(doc.id)}
                            className="text-xs font-medium text-red-700 hover:underline"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {rejectDocId && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <label className="block text-sm">
              <span className="text-red-900">Rejection reason</span>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-red-200 px-3 py-1.5"
              />
            </label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => reject.mutate(rejectDocId)}
                disabled={reject.isPending}
                className="rounded-lg bg-red-700 px-3 py-1 text-xs font-medium text-white"
              >
                Confirm reject
              </button>
              <button type="button" onClick={() => setRejectDocId(null)} className="text-xs text-slate-600">
                Cancel
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      {driver.documentVersions.length > 0 && (
        <SectionCard title="Document history">
          <p className="mb-2 text-xs text-slate-500">Previous evidence is never overwritten.</p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
                <th className="pb-2 pr-4">Requirement</th>
                <th className="pb-2 pr-4">Replaced</th>
                <th className="pb-2 pr-4">By</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {driver.documentVersions.map((v) => (
                <tr key={v.id} className="border-b border-slate-50">
                  <td className="py-2 pr-4">{v.label}</td>
                  <td className="py-2 pr-4 text-slate-600">{formatDate(v.replacedAt.slice(0, 10))}</td>
                  <td className="py-2 pr-4 text-slate-600">{v.replacedBy}</td>
                  <td className="py-2">
                    <StatusPill status={v.verificationStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}
    </div>
  )
}
