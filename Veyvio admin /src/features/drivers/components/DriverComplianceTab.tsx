import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, expiryTone, formatDate } from '@/components/ui/status'
import { cn } from '@/lib/cn'
import {
  REQUIREMENT_TYPE_OPTIONS,
  buildCoreComplianceSlots,
  definitionKeyForDocumentRequirementType,
  isDocumentPendingAdminReview,
  listSupplementaryComplianceDocuments,
} from '@/lib/drivers/compliance'
import type { ComplianceRequirementSlot } from '@/lib/drivers/compliance'
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
import { tKey } from '@/lib/tenant/tenant-query-scope'


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

function StatTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'critical' | 'attention' | 'ready' | 'neutral'
}) {
  const toneClasses: Record<typeof tone, string> = {
    critical: 'border-critical/25 bg-critical/5 text-critical',
    attention: 'border-attention/25 bg-attention/5 text-attention',
    ready: 'border-ready/25 bg-ready/5 text-ready',
    neutral: 'border-border bg-page text-ink-soft',
  }
  return (
    <div className={cn('rounded-lg border px-3 py-2', toneClasses[tone])}>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">{label}</p>
    </div>
  )
}

function RequirementCard({
  slot,
  canVerify,
  onOpenDocument,
  onApprove,
  approvePending,
  onDecline,
  onRequest,
  requestPending,
  onUploadForThem,
}: {
  slot: ComplianceRequirementSlot
  canVerify: boolean
  onOpenDocument: (documentId: string) => void
  onApprove: (documentId: string) => void
  approvePending: boolean
  onDecline: (documentId: string) => void
  onRequest: (definitionKey: string) => void
  requestPending: boolean
  onUploadForThem: (definitionKey: string) => void
}) {
  const doc = slot.primary
  const displayStatus = slot.status === 'under_review' ? 'awaiting_review' : slot.status
  const accent =
    displayStatus === 'verified' || displayStatus === 'expiring_soon'
      ? 'bg-ready'
      : displayStatus === 'awaiting_review' || displayStatus === 'request_sent'
        ? 'bg-attention'
        : 'bg-critical'

  return (
    <div className="flex overflow-hidden rounded-lg border border-border bg-surface">
      <div className={cn('w-1 flex-shrink-0', accent)} aria-hidden />
      <div className="flex flex-1 flex-wrap items-start justify-between gap-4 p-3">
        <div className="min-w-[180px] flex-1 basis-56">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-ink">{slot.label}</p>
            <StatusPill status={displayStatus} />
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Upload or request a clear photo, including expiry date.
          </p>
          {doc?.rejectionReason ? <p className="mt-1 text-xs text-critical">{doc.rejectionReason}</p> : null}
          {slot.lastRequestedAt ? (
            <p className="mt-1 text-xs text-muted">
              Last requested {formatDate(String(slot.lastRequestedAt).slice(0, 10))}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted">Submitted</p>
            <p>{doc ? formatDocumentSubmittedAt(doc.createdAt ?? doc.updatedAt) : '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted">Source</p>
            <p>{doc ? sourceLabel(doc.sourceApp) : '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted">Expiry</p>
            <p>{formatDocumentExpiry(doc?.expiryDate)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted">File</p>
            {doc?.fileObjectId ? (
              <button
                type="button"
                onClick={() => onOpenDocument(doc.id)}
                className="font-medium text-command-700 hover:underline"
              >
                View file
              </button>
            ) : (
              <span className="text-muted">No file yet</span>
            )}
          </div>
        </div>

        {canVerify ? (
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2 self-center">
            {doc && isDocumentPendingAdminReview(doc.verificationStatus) ? (
              <>
                <button
                  type="button"
                  onClick={() => onApprove(doc.id)}
                  disabled={approvePending}
                  className="rounded border border-ready/30 bg-ready/10 px-2 py-1 text-xs font-medium text-ready hover:bg-ready/15 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => onDecline(doc.id)}
                  className="rounded border border-critical/30 bg-critical/5 px-2 py-1 text-xs font-medium text-critical hover:bg-critical/10"
                >
                  Decline
                </button>
              </>
            ) : null}
            {slot.status === 'missing' || slot.status === 'rejected' || slot.status === 'request_sent' ? (
              <button
                type="button"
                onClick={() => onRequest(slot.definitionKey)}
                disabled={requestPending}
                className="rounded border border-border px-2 py-1 text-xs font-medium text-command-700 hover:bg-command-50 disabled:opacity-50"
              >
                {requestPending ? 'Sending…' : slot.status === 'request_sent' ? 'Resend request' : 'Request from driver'}
              </button>
            ) : null}
            {!doc ? (
              <button
                type="button"
                onClick={() => onUploadForThem(slot.definitionKey)}
                className="rounded border border-border px-2 py-1 text-xs font-medium text-ink-soft hover:bg-page"
              >
                Upload for them
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
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
    queryKey: tKey(['driver-requirements', driver.id]),
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

  const { attentionSlots, verifiedSlots } = useMemo(() => {
    const attention: typeof coreSlots = []
    const verified: typeof coreSlots = []
    for (const slot of coreSlots) {
      if (slot.status === 'verified' || slot.status === 'expiring_soon') verified.push(slot)
      else attention.push(slot)
    }
    return { attentionSlots: attention, verifiedSlots: verified }
  }, [coreSlots])

  const pendingReviewCount = documents.filter(isAwaitingReview).length
  const supplementaryPendingReviewCount = supplementaryDocuments.filter(isAwaitingReview).length

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: tKey(['driver-profile', driver.id]) })
    queryClient.invalidateQueries({ queryKey: tKey(['driver-profiles']) })
    queryClient.invalidateQueries({ queryKey: tKey(['driver-directory-summary']) })
    queryClient.invalidateQueries({ queryKey: tKey(['drivers']) })
    queryClient.invalidateQueries({ queryKey: tKey(['driver-requirements', driver.id]) })
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
    onSuccess: (profile) => {
      queryClient.setQueryData(['driver-profile', driver.id], profile)
      setRequestFeedback('Document approved — driver compliance updated.')
      invalidate()
    },
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
    onSuccess: (profile) => {
      queryClient.setQueryData(['driver-profile', driver.id], profile)
      invalidate()
      setRejectDocId(null)
      setRejectReason('')
      setRequestResubmitOnReject(true)
      setRequestFeedback('Document declined — driver can upload again from the app.')
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
    // Open synchronously on click — async fetch then window.open() is blocked by most browsers.
    const tab = window.open('about:blank', '_blank', 'noopener,noreferrer')
    if (!tab) {
      window.alert('Allow pop-ups for Command to open driver documents, or try again.')
      return
    }
    try {
      tab.document.title = 'Opening document…'
      tab.document.body.innerHTML =
        '<p style="font-family:system-ui,sans-serif;padding:1.25rem;color:#334155">Opening document…</p>'
      const payload = await api.getDriverDocumentDownloadUrl(driver.id, documentId)
      tab.location.replace(payload.url)
    } catch (err) {
      tab.close()
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
        <p className="mb-3 text-xs text-muted">
          Each required document appears once below — even when nothing is uploaded yet. Approve evidence when it is
          valid, or request a clear photo (including expiry date) from the driver.
        </p>

        {requestFeedback ? (
          <p className="mb-3 rounded-lg border border-ready/25 bg-ready/5 px-3 py-2 text-sm text-ready">
            {requestFeedback}
          </p>
        ) : null}

        {actionError ? (
          <p className="mb-3 rounded-lg border border-critical/30 bg-critical/5 px-3 py-2 text-sm text-critical">
            {actionError}
          </p>
        ) : null}

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Needs attention" value={attentionSlots.length} tone={attentionSlots.length ? 'critical' : 'neutral'} />
          <StatTile label="Awaiting review" value={pendingReviewCount} tone={pendingReviewCount ? 'attention' : 'neutral'} />
          <StatTile label="Verified" value={verifiedSlots.length} tone="ready" />
          <StatTile label="Required total" value={coreSlots.length} tone="neutral" />
        </div>

        {attentionSlots.length > 0 ? (
          <div className="mb-5">
            <h3 className="mb-2 text-sm font-semibold text-ink">Needs your attention</h3>
            <div className="space-y-2">
              {attentionSlots.map((slot) => (
                <RequirementCard
                  key={slot.definitionKey}
                  slot={slot}
                  canVerify={canVerify}
                  onOpenDocument={openDocument}
                  onApprove={(documentId) => verify.mutate(documentId)}
                  approvePending={verify.isPending}
                  onDecline={(documentId) => {
                    setRejectDocId(documentId)
                    setRejectReason('')
                    setRequestResubmitOnReject(true)
                  }}
                  onRequest={(definitionKey) => {
                    setRequestFeedback(null)
                    requestMissing.mutate(definitionKey)
                  }}
                  requestPending={requestMissing.isPending}
                  onUploadForThem={(definitionKey) => {
                    setRequirementType(definitionKey)
                    setShowUpload(true)
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {verifiedSlots.length > 0 ? (
          <div className="mb-5">
            <h3 className="mb-2 text-sm font-semibold text-ink">Verified</h3>
            <div className="space-y-2">
              {verifiedSlots.map((slot) => (
                <RequirementCard
                  key={slot.definitionKey}
                  slot={slot}
                  canVerify={canVerify}
                  onOpenDocument={openDocument}
                  onApprove={(documentId) => verify.mutate(documentId)}
                  approvePending={verify.isPending}
                  onDecline={(documentId) => {
                    setRejectDocId(documentId)
                    setRejectReason('')
                    setRequestResubmitOnReject(true)
                  }}
                  onRequest={(definitionKey) => {
                    setRequestFeedback(null)
                    requestMissing.mutate(definitionKey)
                  }}
                  requestPending={requestMissing.isPending}
                  onUploadForThem={(definitionKey) => {
                    setRequirementType(definitionKey)
                    setShowUpload(true)
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {showUpload && (
          <div className="mb-4 grid gap-3 rounded-lg border border-border bg-page p-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="text-ink-soft">Requirement type</span>
              <select
                value={requirementType}
                onChange={(e) => setRequirementType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5"
              >
                {REQUIREMENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.type} value={o.type}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Reference number</span>
              <input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Expiry date</span>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5"
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
          <details className="group rounded-lg border border-border" open={supplementaryPendingReviewCount > 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-ink">
              <span className="flex items-center gap-2">
                Additional uploads
                <span className="rounded-full bg-page px-1.5 py-0.5 text-xs font-medium text-muted">
                  {supplementaryDocuments.length}
                </span>
              </span>
              <span className="text-xs font-normal text-muted transition group-open:hidden">Show</span>
              <span className="hidden text-xs font-normal text-muted transition group-open:inline">Hide</span>
            </summary>
            <div className="border-t border-border px-3 pb-3 pt-2">
              <p className="mb-2 text-xs text-muted">
                Extra photos and non-core evidence — not shown in the required list above.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted">
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
                      <tr key={doc.id} className="border-b border-border/60 last:border-b-0">
                        <td className="py-2.5 pr-4 font-medium text-ink">{doc.label}</td>
                        <td className="py-2.5 pr-4 text-ink-soft">
                          {formatDocumentSubmittedAt(doc.createdAt ?? doc.updatedAt)}
                        </td>
                        <td className="py-2.5 pr-4 text-ink-soft">{sourceLabel(doc.sourceApp)}</td>
                        <td className="py-2.5 pr-4">
                          <span className={expiryTone(doc.expiryDate) === 'expired' ? 'text-critical' : 'text-ink-soft'}>
                            {formatDocumentExpiry(doc.expiryDate)}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <StatusPill status={doc.verificationStatus} />
                          {doc.rejectionReason && <p className="mt-1 text-xs text-critical">{doc.rejectionReason}</p>}
                        </td>
                        <td className="py-2.5 pr-4 text-ink-soft">
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
                              <span className="text-xs text-muted">No file attached</span>
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
                                    className="text-xs font-medium text-ready hover:underline"
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
                                    className="text-xs font-medium text-critical hover:underline"
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
              </div>
            </div>
          </details>
        ) : null}

        {rejectDocId && (
          <div className="mt-4 rounded-lg border border-critical/25 bg-critical/5 p-3">
            <label className="block text-sm">
              <span className="text-critical">Reason for decline (shown to driver)</span>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                placeholder="e.g. Expiry date not visible — upload a clear photo of the full card."
                className="mt-1 w-full rounded-lg border border-critical/25 px-3 py-1.5"
              />
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-critical">
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
                className="rounded-lg bg-critical px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                Confirm decline
              </button>
              <button type="button" onClick={() => setRejectDocId(null)} className="text-xs text-ink-soft">
                Cancel
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      {driver.documentVersions.length > 0 && (
        <SectionCard title="Document history">
          <p className="mb-2 text-xs text-muted">Previous evidence is never overwritten.</p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted">
                <th className="pb-2 pr-4">Requirement</th>
                <th className="pb-2 pr-4">Replaced</th>
                <th className="pb-2 pr-4">By</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {driver.documentVersions.map((v) => (
                <tr key={v.id} className="border-b border-border/60 last:border-b-0">
                  <td className="py-2 pr-4">{v.label}</td>
                  <td className="py-2 pr-4 text-ink-soft">{formatDate(v.replacedAt.slice(0, 10))}</td>
                  <td className="py-2 pr-4 text-ink-soft">{v.replacedBy}</td>
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
