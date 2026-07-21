import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, expiryTone, formatDate } from '@/components/ui/status'
import {
  REQUIREMENT_TYPE_OPTIONS,
  buildCoreComplianceSlots,
  definitionKeyForDocumentRequirementType,
  isDocumentPendingAdminReview,
  listSupplementaryComplianceDocuments,
} from '@/lib/drivers/compliance'
import {
  driverDocumentFileLabel,
  enrichDriverDocumentsForCompliance,
  formatDocumentExpiry,
  formatDocumentSubmittedAt,
} from '@/lib/drivers/document-display'
import {
  getRequirementRequestMeta,
  hydrateRequirementStore,
  markRequirementLocalStatus,
} from '@/lib/drivers/activation-requirements'
import type { DriverDocument, DriverProfile } from '@/lib/drivers/types'
import { api } from '@/lib/api/client'

function sourceLabel(sourceApp: string | undefined) {
  if (sourceApp === 'DRIVER') return 'Driver app'
  if (sourceApp === 'COMMAND') return 'Admin upload'
  return sourceApp ?? '—'
}

function isAwaitingReview(doc: DriverDocument) {
  return isDocumentPendingAdminReview(doc.verificationStatus)
}

function defaultDocumentDueDate() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

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
  const [requestResubmitOnReject, setRequestResubmitOnReject] = useState(true)
  const [requestFeedback, setRequestFeedback] = useState<string | null>(null)

  const { data: persistedReqs } = useQuery({
    queryKey: ['driver-requirements', driver.id],
    queryFn: () => api.listDriverRequirements(driver.id),
  })

  useEffect(() => {
    if (persistedReqs?.requirements) {
      hydrateRequirementStore(driver.id, persistedReqs.requirements)
    }
  }, [driver.id, persistedReqs])

  const documents = useMemo(() => {
    const enriched = enrichDriverDocumentsForCompliance(driver)
    return [...enriched].sort(
      (a, b) =>
        new Date(b.createdAt ?? b.updatedAt ?? 0).getTime() -
        new Date(a.createdAt ?? a.updatedAt ?? 0).getTime(),
    )
  }, [driver])

  const coreSlots = useMemo(() => {
    void persistedReqs
    return buildCoreComplianceSlots({ ...driver, documents }).map((slot) => {
      if (slot.status !== 'missing' && slot.status !== 'rejected') return slot
      const meta = getRequirementRequestMeta(driver.id, slot.definitionKey)
      if (
        meta.statusOverride === 'request_sent' ||
        meta.statusOverride === 'opened' ||
        Boolean(meta.lastRequestedAt)
      ) {
        return {
          ...slot,
          status: 'request_sent' as const,
          lastRequestedAt: meta.lastRequestedAt,
        }
      }
      return { ...slot, lastRequestedAt: meta.lastRequestedAt }
    })
  }, [driver, documents, persistedReqs])

  const supplementaryDocuments = useMemo(
    () => listSupplementaryComplianceDocuments(documents, coreSlots),
    [documents, coreSlots],
  )

  const pendingReviewCount = documents.filter(isAwaitingReview).length

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['driver-profile', driver.id] })
    queryClient.invalidateQueries({ queryKey: ['driver-profiles'] })
    queryClient.invalidateQueries({ queryKey: ['driver-directory-summary'] })
    queryClient.invalidateQueries({ queryKey: ['drivers'] })
    queryClient.invalidateQueries({ queryKey: ['driver-requirements', driver.id] })
  }

  const requestMissing = useMutation({
    mutationFn: async (definitionKey: string) => {
      const label =
        REQUIREMENT_TYPE_OPTIONS.find((o) => o.type === definitionKey)?.label ??
        definitionKey.replace(/_/g, ' ')
      const result = await api.requestDriverRequirements(
        driver.id,
        {
          definitionKeys: [definitionKey],
          mode: 'request',
          dueAt: defaultDocumentDueDate(),
          message: `Please upload a clear photo of your ${label}, including the expiry date, in the Driver app Documents section.`,
          channels: ['in_app', 'email'],
        },
        actorName || 'Admin',
      )
      return { result, definitionKey, label }
    },
    onSuccess: ({ result, definitionKey, label }) => {
      if (result.requirements?.length) {
        hydrateRequirementStore(driver.id, result.requirements)
      } else {
        markRequirementLocalStatus(driver.id, definitionKey, 'request_sent')
      }
      setRequestFeedback(
        result.count > 0
          ? `Request sent — ${label}. The driver will see it in Documents / notifications.`
          : `Request skipped for ${label}${result.skipped?.length ? ' (recently requested)' : ''}.`,
      )
      invalidate()
    },
    onError: (err) => {
      setRequestFeedback(null)
      console.error('requestDriverRequirements failed', err)
    },
  })

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
      api.rejectDriverDocument(
        driver.id,
        documentId,
        rejectReason.trim() || 'Photo unclear or details do not match. Upload again.',
        actorName,
        { requestResubmit: requestResubmitOnReject },
      ),
    onSuccess: () => {
      invalidate()
      setRejectDocId(null)
      setRejectReason('')
      setRequestResubmitOnReject(true)
    },
  })

  const resubmit = useMutation({
    mutationFn: (doc: DriverDocument) => {
      const definitionKey = definitionKeyForDocumentRequirementType(doc.requirementType)
      return api.requestDriverRequirements(
        driver.id,
        {
          definitionKeys: [definitionKey],
          mode: 'resend',
          dueAt: defaultDocumentDueDate(),
          message:
            doc.rejectionReason ??
            `Please upload ${doc.label} again in the Driver app.`,
          channels: ['in_app', 'email'],
        },
        actorName,
      )
    },
    onSuccess: (result, doc) => {
      if (result.requirements?.length) {
        hydrateRequirementStore(driver.id, result.requirements)
      } else {
        markRequirementLocalStatus(
          driver.id,
          definitionKeyForDocumentRequirementType(doc.requirementType),
          'request_sent',
        )
      }
      setRequestFeedback(`Resend request sent for ${doc.label}.`)
      invalidate()
    },
  })

  async function openDocument(documentId: string) {
    try {
      const payload = await api.getDriverDocumentDownloadUrl(driver.id, documentId)
      window.open(payload.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not open document file.')
    }
  }

  const actionError =
    (verify.isError && (verify.error instanceof Error ? verify.error.message : 'Approve failed')) ||
    (reject.isError && (reject.error instanceof Error ? reject.error.message : 'Decline failed')) ||
    (resubmit.isError &&
      (resubmit.error instanceof Error ? resubmit.error.message : 'Resend request failed')) ||
    (upload.isError && (upload.error instanceof Error ? upload.error.message : 'Upload failed')) ||
    (requestMissing.isError &&
      (requestMissing.error instanceof Error
        ? requestMissing.error.message
        : 'Could not send document request')) ||
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
          Each required document appears once below — even when nothing is uploaded yet. Approve evidence when it is
          valid, or request a clear photo (including expiry date) from the driver. Extra uploads (e.g. card backs)
          appear separately at the bottom.
        </p>

        {pendingReviewCount > 0 ? (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {pendingReviewCount === 1
              ? 'One document is waiting for your review.'
              : `${pendingReviewCount} documents are waiting for your review.`}
          </p>
        ) : null}

        {requestFeedback ? (
          <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            {requestFeedback}
          </p>
        ) : null}

        {actionError ? (
          <p className="mb-3 rounded-lg border border-critical/30 bg-critical/5 px-3 py-2 text-sm text-critical">
            {actionError}
          </p>
        ) : null}

        <h3 className="mb-2 text-sm font-semibold text-slate-800">Required compliance documents</h3>
        <table className="mb-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
              <th className="pb-2 pr-4">Document</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Submitted</th>
              <th className="pb-2 pr-4">Source</th>
              <th className="pb-2 pr-4">Expiry</th>
              <th className="pb-2 pr-4">File</th>
              {canVerify ? <th className="pb-2">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {coreSlots.map((slot) => {
              const doc = slot.primary
              const requestingThis =
                requestMissing.isPending && requestMissing.variables === slot.definitionKey
              const displayStatus =
                slot.status === 'under_review'
                  ? 'awaiting_review'
                  : slot.status
              return (
                <tr key={slot.definitionKey} className="border-b border-slate-50 align-top">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium">{slot.label}</p>
                    <p className="text-xs text-slate-500">
                      Upload or request a clear photo of the document, including expiry date.
                    </p>
                    {slot.lastRequestedAt ? (
                      <p className="mt-1 text-xs text-slate-400">
                        Last requested {formatDate(String(slot.lastRequestedAt).slice(0, 10))}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusPill status={displayStatus} />
                    {doc?.rejectionReason ? (
                      <p className="mt-1 text-xs text-red-700">{doc.rejectionReason}</p>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">
                    {doc ? formatDocumentSubmittedAt(doc.createdAt ?? doc.updatedAt) : '—'}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">
                    {doc ? sourceLabel(doc.sourceApp) : '—'}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">
                    {formatDocumentExpiry(doc?.expiryDate)}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">
                    {doc?.fileObjectId ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs">{driverDocumentFileLabel(doc)}</span>
                        <button
                          type="button"
                          onClick={() => openDocument(doc.id)}
                          className="text-left text-xs font-medium text-command-700 hover:underline"
                        >
                          View file
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">No file yet</span>
                    )}
                  </td>
                  {canVerify ? (
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-2">
                        {doc && isAwaitingReview(doc) ? (
                          <>
                            <button
                              type="button"
                              onClick={() => verify.mutate(doc.id)}
                              disabled={verify.isPending}
                              className="text-xs font-medium text-emerald-700 hover:underline"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectDocId(doc.id)
                                setRejectReason('')
                                setRequestResubmitOnReject(true)
                              }}
                              className="text-xs font-medium text-red-700 hover:underline"
                            >
                              Decline
                            </button>
                          </>
                        ) : null}
                        {slot.status === 'missing' ||
                        slot.status === 'rejected' ||
                        slot.status === 'request_sent' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRequestFeedback(null)
                              requestMissing.mutate(slot.definitionKey)
                            }}
                            disabled={requestMissing.isPending}
                            className="text-xs font-medium text-command-700 hover:underline disabled:opacity-50"
                          >
                            {requestingThis
                              ? 'Sending…'
                              : slot.status === 'request_sent'
                                ? 'Resend request'
                                : 'Request from driver'}
                          </button>
                        ) : null}
                        {!doc ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRequirementType(slot.definitionKey)
                              setShowUpload(true)
                            }}
                            className="text-xs font-medium text-slate-600 hover:underline"
                          >
                            Upload for them
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
        </table>

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

        {supplementaryDocuments.length > 0 ? (
          <>
        <h3 className="mb-1 text-sm font-semibold text-slate-800">Additional uploads</h3>
        <p className="mb-2 text-xs text-slate-500">
          Extra photos and non-core evidence — not shown in the required list above.
        </p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
              <th className="pb-2 pr-4">Requirement</th>
              <th className="pb-2 pr-4">Submitted</th>
              <th className="pb-2 pr-4">Source</th>
              <th className="pb-2 pr-4">Expiry</th>
              <th className="pb-2 pr-4">Verification</th>
              <th className="pb-2 pr-4">File</th>
              {canVerify && <th className="pb-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
              {supplementaryDocuments.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-50">
                  <td className="py-2.5 pr-4 font-medium">{doc.label}</td>
                  <td className="py-2.5 pr-4 text-slate-600">
                    {formatDocumentSubmittedAt(doc.createdAt ?? doc.updatedAt)}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">{sourceLabel(doc.sourceApp)}</td>
                  <td className="py-2.5 pr-4">
                    <span className={expiryTone(doc.expiryDate) === 'expired' ? 'text-red-700' : ''}>
                      {formatDocumentExpiry(doc.expiryDate)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusPill status={doc.verificationStatus} />
                    {doc.rejectionReason && (
                      <p className="mt-1 text-xs text-red-700">{doc.rejectionReason}</p>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">
                    <div className="flex flex-col gap-1">
                      <span>{driverDocumentFileLabel(doc)}</span>
                      {doc.fileObjectId ? (
                        <button
                          type="button"
                          onClick={() => openDocument(doc.id)}
                          className="text-left text-xs font-medium text-command-700 hover:underline"
                        >
                          View file
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">No file attached</span>
                      )}
                    </div>
                  </td>
                  {canVerify && (
                    <td className="py-2.5">
                      <div className="flex flex-col gap-2">
                        {isAwaitingReview(doc) && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => verify.mutate(doc.id)}
                              disabled={verify.isPending}
                              className="text-xs font-medium text-emerald-700 hover:underline"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectDocId(doc.id)
                                setRejectReason('')
                                setRequestResubmitOnReject(true)
                              }}
                              className="text-xs font-medium text-red-700 hover:underline"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                        {doc.verificationStatus === 'rejected' && (
                          <button
                            type="button"
                            onClick={() => resubmit.mutate(doc)}
                            disabled={resubmit.isPending}
                            className="text-left text-xs font-medium text-command-700 hover:underline"
                          >
                            Ask driver to resend
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
          </>
        ) : null}

        {rejectDocId && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <label className="block text-sm">
              <span className="text-red-900">Reason for decline (shown to driver)</span>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                placeholder="e.g. Expiry date not visible — upload a clear photo of the full card."
                className="mt-1 w-full rounded-lg border border-red-200 px-3 py-1.5"
              />
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-red-900">
              <input
                type="checkbox"
                checked={requestResubmitOnReject}
                onChange={(e) => setRequestResubmitOnReject(e.target.checked)}
              />
              Ask driver to upload again in the app
            </label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => reject.mutate(rejectDocId)}
                disabled={reject.isPending}
                className="rounded-lg bg-red-700 px-3 py-1 text-xs font-medium text-white"
              >
                Confirm decline
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
