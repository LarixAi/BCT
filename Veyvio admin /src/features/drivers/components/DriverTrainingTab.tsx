import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, formatDate } from '@/components/ui/status'
import {
  buildDriverTrainingRequirements,
  defaultTrainingExpiry,
  getTrainingCatalogDef,
  summariseDriverTraining,
  type TrainingRequirementWithCategory,
} from '@/lib/drivers/training'
import { hydrateRequirementStore, getRequirementRequestMeta, markRequirementLocalStatus } from '@/lib/drivers/activation-requirements'
import type { DriverProfile } from '@/lib/drivers/types'
import { api } from '@/lib/api/client'

function SummaryCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'neutral' | 'ready' | 'attention' | 'critical'
}) {
  const toneClass =
    tone === 'ready'
      ? 'border-ready/30 bg-ready/5 text-ready'
      : tone === 'attention'
        ? 'border-attention/30 bg-attention/5 text-attention'
        : tone === 'critical'
          ? 'border-critical/30 bg-critical/5 text-critical'
          : 'border-slate-200 bg-white text-slate-900'

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {hint ? <p className="mt-0.5 text-xs opacity-80">{hint}</p> : null}
    </div>
  )
}

export function DriverTrainingTab({
  driver,
  actorName,
  canEdit,
}: {
  driver: DriverProfile
  actorName: string
  canEdit: boolean
}) {
  const queryClient = useQueryClient()
  const { data: persisted } = useQuery({
    queryKey: ['driver-requirements', driver.id],
    queryFn: () => api.listDriverRequirements(driver.id),
  })

  useEffect(() => {
    if (persisted?.requirements) {
      hydrateRequirementStore(driver.id, persisted.requirements)
    }
  }, [driver.id, persisted])

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
  }, [driver, persisted])
  const summary = useMemo(() => summariseDriverTraining(requirements), [requirements])
  const mandatory = requirements.filter((r) => r.category === 'mandatory')
  const role = requirements.filter((r) => r.category === 'role')

  const [recordingKey, setRecordingKey] = useState<string | null>(null)
  const [completedAt, setCompletedAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [expiresAt, setExpiresAt] = useState('')
  const [trainer, setTrainer] = useState('')
  const [provider, setProvider] = useState('')
  const [certificateNumber, setCertificateNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [attachCertificate, setAttachCertificate] = useState(true)
  const [autoExpiry, setAutoExpiry] = useState(true)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['driver-profile', driver.id] })
    queryClient.invalidateQueries({ queryKey: ['driver-profiles'] })
    queryClient.invalidateQueries({ queryKey: ['driver-directory-summary'] })
    queryClient.invalidateQueries({ queryKey: ['driver-requirements', driver.id] })
  }

  const [assignKey, setAssignKey] = useState<string | null>(null)
  const [assignDeadline, setAssignDeadline] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })
  const [assignMessage, setAssignMessage] = useState<string | null>(null)

  const assign = useMutation({
    mutationFn: (trainingKey: string) =>
      api.assignDriverRequirementTraining(
        driver.id,
        {
          definitionKey: trainingKey,
          delivery: 'veyvio_module',
          trainer: actorName,
          deadline: assignDeadline,
          evidenceCompletion: true,
          evidenceAssessment: true,
          evidenceCertificate: Boolean(getTrainingCatalogDef(trainingKey)?.documentTypes?.length),
        },
        actorName,
      ),
    onSuccess: (_data, trainingKey) => {
      markRequirementLocalStatus(driver.id, trainingKey, 'training_assigned')
      setAssignKey(null)
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

  return (
    <div className="space-y-4">
      <SectionCard
        title="Is this driver fully trained?"
        description="Assign Veyvio modules to the driver app, then track progress, scores and certificates here."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Mandatory training"
            value={`${summary.mandatoryComplete} / ${summary.mandatoryTotal}`}
            hint={summary.fullyTrained ? 'Core courses in place' : 'Complete before assignment'}
            tone={summary.fullyTrained ? 'ready' : summary.mandatoryMissing > 0 ? 'critical' : 'attention'}
          />
          <SummaryCard
            label="Role-specific"
            value={`${summary.roleComplete} / ${summary.roleTotal}`}
            hint="From wheelchair, SEND, hospital, PSV permissions"
            tone={summary.roleTotal > 0 && summary.roleComplete < summary.roleTotal ? 'attention' : 'neutral'}
          />
          <SummaryCard
            label="Expiring soon"
            value={String(summary.expiringSoon)}
            hint="Within 90 days"
            tone={summary.expiringSoon > 0 ? 'attention' : 'neutral'}
          />
          <SummaryCard
            label="Training status"
            value={summary.fullyTrained ? 'Ready' : 'Not ready'}
            hint={
              summary.fullyTrained
                ? 'Mandatory catalogue complete'
                : `${summary.mandatoryMissing} mandatory course${summary.mandatoryMissing === 1 ? '' : 's'} outstanding`
            }
            tone={summary.fullyTrained ? 'ready' : 'critical'}
          />
        </div>
      </SectionCard>

      {assignMessage ? (
        <div
          className={`rounded-xl border px-4 py-2 text-sm ${
            assignMessage.startsWith('Could not')
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-950'
          }`}
        >
          {assignMessage}
        </div>
      ) : null}

      {assignKey ? (
        <SectionCard
          title={`Assign to driver: ${getTrainingCatalogDef(assignKey)?.label ?? assignKey}`}
          action={
            <button
              type="button"
              onClick={() => setAssignKey(null)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          }
        >
          <p className="mb-3 text-sm text-slate-600">
            Sends a Veyvio learning module to the Driver app Training centre and notifies the driver.
          </p>
          <label className="block text-sm">
            <span className="text-slate-600">Deadline</span>
            <input
              type="date"
              value={assignDeadline}
              onChange={(e) => setAssignDeadline(e.target.value)}
              className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-1.5"
            />
          </label>
          {assign.isError ? (
            <p className="mt-2 text-sm text-red-800">
              {assign.error instanceof Error ? assign.error.message : 'Assign failed'}
            </p>
          ) : null}
          <button
            type="button"
            disabled={assign.isPending || !canEdit}
            onClick={() => assign.mutate(assignKey)}
            className="mt-4 rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
          >
            {assign.isPending ? 'Assigning…' : 'Assign training to driver'}
          </button>
        </SectionCard>
      ) : null}

      {recordingKey && (
        <SectionCard
          title={`Record: ${getTrainingCatalogDef(recordingKey)?.label ?? recordingKey}`}
          action={
            <button
              type="button"
              onClick={() => setRecordingKey(null)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-600">Completed date</span>
              <input
                type="date"
                value={completedAt}
                onChange={(e) => {
                  const next = e.target.value
                  setCompletedAt(next)
                  if (autoExpiry) setExpiresAt(defaultTrainingExpiry(recordingKey, next) ?? '')
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Expiry date</span>
              <input
                type="date"
                value={expiresAt}
                disabled={autoExpiry}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 disabled:bg-slate-50"
              />
              <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
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
              <span className="text-slate-600">Trainer / assessor</span>
              <input
                value={trainer}
                onChange={(e) => setTrainer(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                placeholder="e.g. CTA assessor"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Provider</span>
              <input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                placeholder="e.g. Community Transport Association"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Certificate number</span>
              <input
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-slate-600">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
              />
            </label>
            {getTrainingCatalogDef(recordingKey)?.documentTypes?.length ? (
              <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
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

      <SectionCard title="Training and competency">
        <p className="mb-4 text-xs text-slate-500">
          Use <span className="font-medium text-slate-700">Assign</span> to push a module to the driver app. Progress and
          scores sync from Command when the driver works through lessons. Certificates appear when evidence is linked on
          Compliance.
        </p>
        <div className="space-y-6">
          <RequirementTable
            title="Mandatory induction & safety"
            rows={mandatory}
            driver={driver}
            canEdit={canEdit}
            busyKey={clear.isPending ? clear.variables : null}
            assignBusy={assign.isPending ? assign.variables : null}
            onAssign={(key) => {
              setAssignMessage(null)
              setAssignKey(key)
            }}
            onRecord={openRecord}
            onClear={(key) => clear.mutate(key)}
          />
          <RequirementTable
            title="Role-specific (from work permissions)"
            rows={role}
            driver={driver}
            canEdit={canEdit}
            busyKey={clear.isPending ? clear.variables : null}
            assignBusy={assign.isPending ? assign.variables : null}
            onAssign={(key) => {
              setAssignMessage(null)
              setAssignKey(key)
            }}
            onRecord={openRecord}
            onClear={(key) => clear.mutate(key)}
          />
        </div>
      </SectionCard>
    </div>
  )
}

function certificateForCourse(driver: DriverProfile, key: string) {
  const types = getTrainingCatalogDef(key)?.documentTypes ?? []
  if (!types.length) return null
  return (
    (driver.documents ?? []).find((d) => types.includes(d.requirementType)) ?? null
  )
}

function RequirementTable({
  title,
  rows,
  driver,
  canEdit,
  busyKey,
  assignBusy,
  onAssign,
  onRecord,
  onClear,
}: {
  title: string
  rows: TrainingRequirementWithCategory[]
  driver: DriverProfile
  canEdit: boolean
  busyKey: string | null | undefined
  assignBusy: string | null | undefined
  onAssign: (key: string) => void
  onRecord: (key: string) => void
  onClear: (key: string) => void
}) {
  if (rows.length === 0) return null
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
              <th className="pb-2 pr-4">Training</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Progress</th>
              <th className="pb-2 pr-4">Score</th>
              <th className="pb-2 pr-4">Certificate</th>
              <th className="pb-2 pr-4">Completed</th>
              {canEdit ? <th className="pb-2">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const cert = certificateForCourse(driver, t.key)
              const progress = Number(t.progressPercentage ?? 0)
              return (
                <tr key={t.id} className="border-b border-slate-50 align-top">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium">{t.label}</p>
                    <p className="text-xs text-slate-500">{t.requiredFor}</p>
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusPill status={t.status} />
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">
                    {t.status === 'missing' && progress <= 0 ? '—' : `${Math.max(0, Math.min(100, progress))}%`}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">
                    {t.assessmentScore != null ? `${t.assessmentScore}%` : '—'}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">
                    {cert ? (
                      <span className="text-xs">
                        {cert.label} · <StatusPill status={cert.verificationStatus} />
                      </span>
                    ) : getTrainingCatalogDef(t.key)?.documentTypes?.length ? (
                      <span className="text-xs text-slate-400">No certificate on Compliance</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">{formatDate(t.completedAt?.slice(0, 10))}</td>
                  {canEdit ? (
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-2">
                        {(t.status === 'missing' || t.status === 'expired' || t.status === 'failed') && (
                          <button
                            type="button"
                            disabled={assignBusy === t.key}
                            onClick={() => onAssign(t.key)}
                            className="text-xs font-medium text-command-600 hover:underline disabled:opacity-50"
                          >
                            Assign
                          </button>
                        )}
                        {(t.status === 'assigned' || t.status === 'in_progress') && (
                          <button
                            type="button"
                            disabled={assignBusy === t.key}
                            onClick={() => onAssign(t.key)}
                            className="text-xs font-medium text-command-600 hover:underline disabled:opacity-50"
                          >
                            Re-assign
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
                            className="text-xs font-medium text-slate-500 hover:underline disabled:opacity-50"
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
    </div>
  )
}
