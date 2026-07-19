import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, formatDate } from '@/components/ui/status'
import {
  buildDriverTrainingRequirements,
  defaultTrainingExpiry,
  getTrainingCatalogDef,
  summariseDriverTraining,
  type TrainingRequirementWithCategory,
} from '@/lib/drivers/training'
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
  const requirements = useMemo(() => buildDriverTrainingRequirements(driver), [driver])
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
  }

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
        description="Section 19/22 first selection — MiDAS-centred requirements from work permissions."
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
          Record completed courses with date, expiry and provider. Nothing is marked complete without a saved record or
          verified document.
        </p>
        <div className="space-y-6">
          <RequirementTable
            title="Mandatory induction & safety"
            rows={mandatory}
            canEdit={canEdit}
            busyKey={clear.isPending ? clear.variables : null}
            onRecord={openRecord}
            onClear={(key) => clear.mutate(key)}
          />
          <RequirementTable
            title="Role-specific (from work permissions)"
            rows={role}
            canEdit={canEdit}
            busyKey={clear.isPending ? clear.variables : null}
            onRecord={openRecord}
            onClear={(key) => clear.mutate(key)}
          />
        </div>
      </SectionCard>
    </div>
  )
}

function RequirementTable({
  title,
  rows,
  canEdit,
  busyKey,
  onRecord,
  onClear,
}: {
  title: string
  rows: TrainingRequirementWithCategory[]
  canEdit: boolean
  busyKey: string | null | undefined
  onRecord: (key: string) => void
  onClear: (key: string) => void
}) {
  if (rows.length === 0) return null
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
            <th className="pb-2 pr-4">Training</th>
            <th className="pb-2 pr-4">Required for</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2 pr-4">Completed</th>
            <th className="pb-2 pr-4">Expires</th>
            {canEdit ? <th className="pb-2">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-b border-slate-50">
              <td className="py-2.5 pr-4 font-medium">{t.label}</td>
              <td className="py-2.5 pr-4 text-slate-600">{t.requiredFor}</td>
              <td className="py-2.5 pr-4">
                <StatusPill status={t.status} />
              </td>
              <td className="py-2.5 pr-4 text-slate-600">{formatDate(t.completedAt?.slice(0, 10))}</td>
              <td className="py-2.5 pr-4 text-slate-600">{formatDate(t.expiresAt)}</td>
              {canEdit ? (
                <td className="py-2.5">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onRecord(t.key)}
                      className="text-xs font-medium text-command-600 hover:underline"
                    >
                      {t.status === 'missing' || t.status === 'expired' || t.status === 'failed'
                        ? 'Record'
                        : 'Update'}
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
