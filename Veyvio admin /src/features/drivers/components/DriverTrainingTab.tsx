import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, formatDate } from '@/components/ui/status'
import {
  TRAINING_SECTION_META,
  buildDriverTrainingRequirements,
  defaultTrainingExpiry,
  getTrainingCatalogDef,
  type DriverTrainingCategory,
  type TrainingRequirementWithCategory,
} from '@/lib/drivers/training'
import { evaluateTrainingEligibility } from '@/lib/drivers/training-eligibility'
import { hydrateRequirementStore, getRequirementRequestMeta, markRequirementLocalStatus } from '@/lib/drivers/activation-requirements'
import type { DriverProfile } from '@/lib/drivers/types'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


function defaultAssignDeadline(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

const SECTION_ORDER: DriverTrainingCategory[] = ['mandatory', 'vehicle', 'role', 'development']

function Metric({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-soft/80">{label}</p>
      <p className="mt-0.5 truncate text-base font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  )
}

function EligibilityHero({
  driver,
  requirements,
  canEdit,
  onViewCompliance,
  onAssignOutstanding,
}: {
  driver: DriverProfile
  requirements: TrainingRequirementWithCategory[]
  canEdit: boolean
  onViewCompliance?: () => void
  onAssignOutstanding: () => void
}) {
  const view = useMemo(
    () => evaluateTrainingEligibility(driver, requirements),
    [driver, requirements],
  )

  const shell =
    view.status === 'eligible'
      ? 'border-ready/30 bg-ready/5'
      : view.status === 'eligible_with_restrictions'
        ? 'border-attention/30 bg-attention/5'
        : 'border-critical/30 bg-critical/5'

  const statusTone =
    view.status === 'eligible'
      ? 'text-ready'
      : view.status === 'eligible_with_restrictions'
        ? 'text-attention'
        : 'text-critical'

  const statusDot =
    view.status === 'eligible'
      ? 'bg-ready'
      : view.status === 'eligible_with_restrictions'
        ? 'bg-attention'
        : 'bg-critical'

  return (
    <section className={`rounded-xl border p-4 sm:p-5 ${shell}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
        Driver eligibility
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${statusDot}`} aria-hidden />
        <h2 className={`text-xl font-semibold tracking-tight sm:text-2xl ${statusTone}`}>
          {view.headline}
        </h2>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{view.summaryLine}</p>

      <div className="mt-4 grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Compliance score" value={`${view.complianceScore}%`} />
        <Metric
          label="Mandatory training"
          value={`${view.mandatoryComplete} / ${view.mandatoryTotal} complete`}
        />
        <Metric
          label="Role training"
          value={
            view.roleTotal === 0
              ? 'None required'
              : `${view.roleComplete} / ${view.roleTotal} complete`
          }
        />
        <Metric label="Certificates" value={view.certificatesLabel} />
        <Metric
          label="Next expiry"
          value={view.nextExpiry ? view.nextExpiry.label : 'None upcoming'}
          hint={
            view.nextExpiry
              ? `Expires in ${view.nextExpiry.daysRemaining} day${view.nextExpiry.daysRemaining === 1 ? '' : 's'}`
              : undefined
          }
        />
      </div>

      {view.blockReasons.length > 0 ? (
        <div className="mt-4 rounded-lg border border-critical/20 bg-surface/70 px-3 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-critical">Reasons</p>
          <ul className="mt-1.5 space-y-1 text-sm text-ink">
            {view.blockReasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="text-critical" aria-hidden>
                  ✕
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {view.restrictionReasons.length > 0 ? (
        <div className="mt-3 rounded-lg border border-attention/20 bg-surface/70 px-3 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-attention">
            Restrictions
          </p>
          <ul className="mt-1.5 space-y-1 text-sm text-ink">
            {view.restrictionReasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="text-attention" aria-hidden>
                  !
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {onViewCompliance ? (
          <button
            type="button"
            onClick={onViewCompliance}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-muted"
          >
            View compliance
          </button>
        ) : null}
        {canEdit && (view.blockReasons.length > 0 || view.restrictionReasons.length > 0) ? (
          <button
            type="button"
            onClick={onAssignOutstanding}
            className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700"
          >
            Assign training
          </button>
        ) : null}
      </div>
    </section>
  )
}

function LegalComplianceSection({
  driver,
  onViewCompliance,
}: {
  driver: DriverProfile
  onViewCompliance?: () => void
}) {
  const view = useMemo(() => evaluateTrainingEligibility(driver), [driver])
  const slots = view.legal.slots

  return (
    <SectionCard
      title="Legal compliance"
      description="Level 3 — documents that affect eligibility. Renewals and history live on the Compliance tab."
      action={
        onViewCompliance ? (
          <button
            type="button"
            onClick={onViewCompliance}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-muted"
          >
            Open Compliance
          </button>
        ) : null
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="pb-2 pr-4">Document</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Expires</th>
              <th className="pb-2">Days remaining</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => {
              const expiry = slot.primary?.expiryDate ?? null
              const days =
                expiry != null
                  ? Math.ceil((new Date(expiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
                  : null
              return (
                <tr key={slot.definitionKey} className="border-b border-border/60">
                  <td className="py-2.5 pr-4 font-medium">{slot.label}</td>
                  <td className="py-2.5 pr-4">
                    <StatusPill status={slot.status} />
                  </td>
                  <td className="py-2.5 pr-4 text-ink-soft">{formatDate(expiry)}</td>
                  <td className="py-2.5 text-ink-soft">
                    {days == null ? '—' : days < 0 ? 'Expired' : String(days)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

export function DriverTrainingTab({
  driver,
  actorName,
  canEdit,
  onViewCompliance,
}: {
  driver: DriverProfile
  actorName: string
  canEdit: boolean
  onViewCompliance?: () => void
}) {
  const queryClient = useQueryClient()
  const { data: persisted } = useQuery({
    queryKey: tKey(['driver-requirements', driver.id]),
    queryFn: () => api.listDriverRequirements(driver.id),
  })

  useEffect(() => {
    if (persisted?.requirements) {
      hydrateRequirementStore(driver.id, persisted.requirements)
    }
  }, [driver.id, persisted])

  /** Bumps when local requirement overrides change so status pills refresh immediately. */
  const [reqTick, setReqTick] = useState(0)
  const feedbackRef = useRef<HTMLDivElement | null>(null)

  const requirements = useMemo(() => {
    const rows = buildDriverTrainingRequirements(driver)
    return rows.map((row) => {
      if (row.status !== 'missing') return row
      const override = getRequirementRequestMeta(driver.id, row.key).statusOverride
      if (override === 'training_assigned') return { ...row, status: 'assigned' as const }
      if (override === 'in_progress') return { ...row, status: 'in_progress' as const }
      if (override === 'approved' || override === 'completed') return { ...row, status: 'complete' as const }
      return row
    })
  }, [driver, persisted, reqTick])

  const byCategory = useMemo(() => {
    const map = new Map<DriverTrainingCategory, TrainingRequirementWithCategory[]>()
    for (const cat of SECTION_ORDER) map.set(cat, [])
    for (const row of requirements) {
      const list = map.get(row.category) ?? []
      list.push(row)
      map.set(row.category, list)
    }
    return map
  }, [requirements])

  const [recordingKey, setRecordingKey] = useState<string | null>(null)
  const [completedAt, setCompletedAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [expiresAt, setExpiresAt] = useState('')
  const [trainer, setTrainer] = useState('')
  const [provider, setProvider] = useState('')
  const [certificateNumber, setCertificateNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [attachCertificate, setAttachCertificate] = useState(true)
  const [autoExpiry, setAutoExpiry] = useState(true)
  const [focusOutstanding, setFocusOutstanding] = useState(false)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: tKey(['driver-profile', driver.id]) })
    queryClient.invalidateQueries({ queryKey: tKey(['driver-profiles']) })
    queryClient.invalidateQueries({ queryKey: tKey(['driver-directory-summary']) })
    queryClient.invalidateQueries({ queryKey: tKey(['driver-requirements', driver.id]) })
  }

  const [assignMessage, setAssignMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!assignMessage) return
    feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [assignMessage])

  const assign = useMutation({
    mutationFn: (trainingKey: string) =>
      api.assignDriverRequirementTraining(
        driver.id,
        {
          definitionKey: trainingKey,
          delivery: 'veyvio_module',
          trainer: actorName,
          deadline: defaultAssignDeadline(),
          evidenceCompletion: true,
          evidenceAssessment: true,
          evidenceCertificate: Boolean(getTrainingCatalogDef(trainingKey)?.documentTypes?.length),
        },
        actorName,
      ),
    onSuccess: (_data, trainingKey) => {
      markRequirementLocalStatus(driver.id, trainingKey, 'training_assigned')
      setReqTick((n) => n + 1)
      setAssignMessage(
        `${getTrainingCatalogDef(trainingKey)?.label ?? trainingKey} assigned — driver should see it in Training centre.`,
      )
      invalidate()
    },
    onError: (err) => {
      setAssignMessage(
        err instanceof Error ? `Could not assign: ${err.message}` : 'Could not assign training.',
      )
    },
  })

  const openRecord = (key: string) => {
    setRecordingKey(key)
    const today = new Date().toISOString().slice(0, 10)
    setCompletedAt(today)
    setAutoExpiry(true)
    setExpiresAt(defaultTrainingExpiry(key, today) ?? '')
    const existing = requirements.find((r) => r.key === key)
    setTrainer(existing?.trainer ?? '')
    setProvider('')
    setCertificateNumber('')
    setNotes('')
    setAttachCertificate(Boolean(getTrainingCatalogDef(key)?.documentTypes?.length))
  }

  const record = useMutation({
    mutationFn: () => {
      if (!recordingKey) throw new Error('Select a course')
      return api.recordDriverTraining(
        driver.id,
        {
          trainingKey: recordingKey,
          completedAt,
          expiresAt: autoExpiry ? undefined : expiresAt || null,
          trainer: trainer || null,
          provider: provider || null,
          certificateNumber: certificateNumber || null,
          notes: notes || null,
          attachCertificate,
        },
        actorName,
      )
    },
    onSuccess: () => {
      invalidate()
      setRecordingKey(null)
    },
  })

  const clear = useMutation({
    mutationFn: (trainingKey: string) =>
      api.recordDriverTraining(driver.id, { trainingKey, clear: true }, actorName),
    onSuccess: invalidate,
  })

  const assignOutstanding = () => {
    setFocusOutstanding(true)
    const firstGap = requirements.find(
      (r) =>
        r.category !== 'development' &&
        (r.status === 'missing' ||
          r.status === 'expired' ||
          r.status === 'failed' ||
          r.status === 'assigned' ||
          r.status === 'in_progress'),
    )
    if (firstGap && canEdit && !assign.isPending) {
      setAssignMessage(null)
      assign.mutate(firstGap.key)
    }
  }

  return (
    <div className="space-y-4">
      <EligibilityHero
        driver={driver}
        requirements={requirements}
        canEdit={canEdit}
        onViewCompliance={onViewCompliance}
        onAssignOutstanding={assignOutstanding}
      />

      {assignMessage ? (
        <div
          ref={feedbackRef}
          className={`rounded-xl border px-4 py-2 text-sm ${
            assignMessage.startsWith('Could not')
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-950'
          }`}
        >
          {assignMessage}
        </div>
      ) : null}

      {recordingKey && (
        <SectionCard
          title={`Record: ${getTrainingCatalogDef(recordingKey)?.label ?? recordingKey}`}
          action={
            <button
              type="button"
              onClick={() => setRecordingKey(null)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-muted"
            >
              Cancel
            </button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-soft">Completed date</span>
              <input
                type="date"
                value={completedAt}
                onChange={(e) => {
                  const next = e.target.value
                  setCompletedAt(next)
                  if (autoExpiry) setExpiresAt(defaultTrainingExpiry(recordingKey, next) ?? '')
                }}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Expiry date</span>
              <input
                type="date"
                value={expiresAt}
                disabled={autoExpiry}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 disabled:bg-surface-muted"
              />
              <label className="mt-1 flex items-center gap-2 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  checked={autoExpiry}
                  onChange={(e) => {
                    setAutoExpiry(e.target.checked)
                    if (e.target.checked) {
                      setExpiresAt(defaultTrainingExpiry(recordingKey, completedAt) ?? '')
                    }
                  }}
                />
                Use catalogue renewal period
              </label>
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Trainer / assessor</span>
              <input
                value={trainer}
                onChange={(e) => setTrainer(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
                placeholder="e.g. CTA assessor"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Provider</span>
              <input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
                placeholder="e.g. Community Transport Association"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Certificate number</span>
              <input
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-ink-soft">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              />
            </label>
            {getTrainingCatalogDef(recordingKey)?.documentTypes?.length ? (
              <label className="flex items-center gap-2 text-sm text-ink-soft sm:col-span-2">
                <input
                  type="checkbox"
                  checked={attachCertificate}
                  onChange={(e) => setAttachCertificate(e.target.checked)}
                />
                Also attach verified certificate evidence (feeds Compliance)
              </label>
            ) : null}
          </div>
          {record.isError ? (
            <p className="mt-3 text-sm text-red-800">
              {record.error instanceof Error ? record.error.message : 'Could not save training'}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={record.isPending || !completedAt}
              onClick={() => record.mutate()}
              className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-60"
            >
              {record.isPending ? 'Saving…' : 'Save training record'}
            </button>
          </div>
        </SectionCard>
      )}

      {SECTION_ORDER.map((category) => {
        const rows = byCategory.get(category) ?? []
        const meta = TRAINING_SECTION_META[category]
        const filtered =
          focusOutstanding && category !== 'development'
            ? rows.filter(
                (r) =>
                  r.status === 'missing' ||
                  r.status === 'expired' ||
                  r.status === 'failed' ||
                  r.status === 'assigned' ||
                  r.status === 'in_progress',
              )
            : rows
        return (
          <SectionCard
            key={category}
            title={`Level ${meta.level} · ${meta.title}`}
            description={meta.description}
            action={
              focusOutstanding && category !== 'development' ? (
                <button
                  type="button"
                  onClick={() => setFocusOutstanding(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-muted"
                >
                  Show all
                </button>
              ) : null
            }
          >
            <RequirementTable
              rows={filtered}
              driver={driver}
              canEdit={canEdit}
              busyKey={clear.isPending ? clear.variables : null}
              assignBusy={assign.isPending ? assign.variables : null}
              onAssign={(key) => {
                if (assign.isPending) return
                setAssignMessage(null)
                assign.mutate(key)
              }}
              onRecord={openRecord}
              onClear={(key) => clear.mutate(key)}
            />
          </SectionCard>
        )
      })}

      <LegalComplianceSection driver={driver} onViewCompliance={onViewCompliance} />
    </div>
  )
}

function certificateForCourse(driver: DriverProfile, key: string) {
  const types = getTrainingCatalogDef(key)?.documentTypes ?? []
  if (!types.length) return null
  return (driver.documents ?? []).find((d) => types.includes(d.requirementType)) ?? null
}

function effectLabel(category: DriverTrainingCategory): string {
  switch (category) {
    case 'mandatory':
      return 'Blocks duty'
    case 'vehicle':
      return 'Blocks vehicle'
    case 'role':
      return 'Restricts duties'
    case 'development':
      return 'Optional'
  }
}

function RequirementTable({
  rows,
  driver,
  canEdit,
  busyKey,
  assignBusy,
  onAssign,
  onRecord,
  onClear,
}: {
  rows: TrainingRequirementWithCategory[]
  driver: DriverProfile
  canEdit: boolean
  busyKey: string | null | undefined
  assignBusy: string | null | undefined
  onAssign: (key: string) => void
  onRecord: (key: string) => void
  onClear: (key: string) => void
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-ink-soft">Nothing in this section for this driver’s permissions.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase text-muted">
            <th className="pb-2 pr-4">Training</th>
            <th className="pb-2 pr-4">Effect</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2 pr-4">Progress</th>
            <th className="pb-2 pr-4">Certificate</th>
            <th className="pb-2 pr-4">Completed</th>
            {canEdit ? <th className="pb-2">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const cert = certificateForCourse(driver, t.key)
            const progress = Number(t.progressPercentage ?? 0)
            const def = getTrainingCatalogDef(t.key)
            return (
              <tr key={t.id} className="border-b border-border/60 align-top">
                <td className="py-2.5 pr-4">
                  <p className="font-medium">{t.label}</p>
                  <p className="text-xs text-muted">{t.requiredFor}</p>
                  {def?.description ? (
                    <p className="mt-1 text-xs text-ink-soft">{def.description}</p>
                  ) : null}
                  {def?.topics?.length ? (
                    <p className="mt-1 text-[11px] text-muted">
                      Covers: {def.topics.slice(0, 4).join(' · ')}
                      {def.topics.length > 4 ? '…' : ''}
                    </p>
                  ) : null}
                </td>
                <td className="py-2.5 pr-4">
                  <span className="text-xs text-ink-soft">{effectLabel(t.category)}</span>
                </td>
                <td className="py-2.5 pr-4">
                  <StatusPill status={t.status} />
                </td>
                <td className="py-2.5 pr-4 text-ink-soft">
                  {t.status === 'missing' && progress <= 0
                    ? '—'
                    : `${Math.max(0, Math.min(100, progress))}%`}
                  {t.assessmentScore != null ? (
                    <span className="block text-xs text-muted">Score {t.assessmentScore}%</span>
                  ) : null}
                </td>
                <td className="py-2.5 pr-4 text-ink-soft">
                  {cert ? (
                    <span className="text-xs">
                      {cert.label} · <StatusPill status={cert.verificationStatus} />
                    </span>
                  ) : getTrainingCatalogDef(t.key)?.documentTypes?.length ? (
                    <span className="text-xs text-muted">No certificate on Compliance</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-2.5 pr-4 text-ink-soft">{formatDate(t.completedAt?.slice(0, 10))}</td>
                {canEdit ? (
                  <td className="py-2.5">
                    <div className="flex flex-wrap gap-2">
                      {(t.status === 'missing' || t.status === 'expired' || t.status === 'failed') && (
                        <button
                          type="button"
                          disabled={Boolean(assignBusy)}
                          onClick={() => onAssign(t.key)}
                          className="text-xs font-medium text-command-600 hover:underline disabled:opacity-50"
                        >
                          {assignBusy === t.key ? 'Assigning…' : 'Assign'}
                        </button>
                      )}
                      {(t.status === 'assigned' || t.status === 'in_progress') && (
                        <button
                          type="button"
                          disabled={Boolean(assignBusy)}
                          onClick={() => onAssign(t.key)}
                          className="text-xs font-medium text-command-600 hover:underline disabled:opacity-50"
                        >
                          {assignBusy === t.key ? 'Assigning…' : 'Re-assign'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRecord(t.key)}
                        className="text-xs font-medium text-command-600 hover:underline"
                      >
                        {t.status === 'complete' || t.status === 'due_soon' ? 'Update' : 'Record complete'}
                      </button>
                      {t.status !== 'missing' ? (
                        <button
                          type="button"
                          disabled={busyKey === t.key}
                          onClick={() => onClear(t.key)}
                          className="text-xs font-medium text-muted hover:underline disabled:opacity-50"
                        >
                          Clear
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
    </div>
  )
}
