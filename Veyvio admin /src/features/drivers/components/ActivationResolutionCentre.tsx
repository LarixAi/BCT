import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import {
  REQUIREMENT_STATUS_LABEL,
  buildActivationResolution,
  hydrateRequirementStore,
  isAggregateOnboardingFailure,
  markRequirementLocalStatus,
  type ActivationRequirement,
  type RequirementChannel,
  type RequirementStatus,
} from '@/lib/drivers/activation-requirements'
import type {
  AssignDriverTrainingInput,
  DriverProfile,
  RejectDriverRequirementInput,
} from '@/lib/drivers/types'
import { AppInvitePanel } from './AppInvitePanel'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/cn'

const STATUS_TONE: Partial<Record<RequirementStatus, string>> = {
  missing: 'bg-slate-100 text-slate-700',
  request_sent: 'bg-sky-100 text-sky-950',
  opened: 'bg-indigo-100 text-indigo-950',
  submitted: 'bg-amber-100 text-amber-950',
  under_review: 'bg-amber-100 text-amber-950',
  approved: 'bg-emerald-100 text-emerald-900',
  completed: 'bg-emerald-100 text-emerald-900',
  rejected: 'bg-red-100 text-red-900',
  expired: 'bg-red-100 text-red-900',
  expiring_soon: 'bg-amber-100 text-amber-950',
  training_assigned: 'bg-violet-100 text-violet-950',
  in_progress: 'bg-violet-100 text-violet-950',
  waived: 'bg-slate-100 text-slate-600',
  not_applicable: 'bg-slate-100 text-slate-600',
}

function formatWhen(value: string | null): string {
  if (!value) return 'Not requested'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ActivationResolutionCentre({
  driver,
  actorName,
  canManage,
  onActivate,
  activating,
  mode = 'profile',
}: {
  driver: DriverProfile
  actorName: string
  canManage: boolean
  onActivate?: () => void
  activating?: boolean
  mode?: 'profile' | 'onboarding'
}) {
  const queryClient = useQueryClient()
  const [tick, setTick] = useState(0)

  const { data: persisted } = useQuery({
    queryKey: ['driver-requirements', driver.id],
    queryFn: () => api.listDriverRequirements(driver.id),
  })

  useEffect(() => {
    if (persisted?.requirements) {
      hydrateRequirementStore(driver.id, persisted.requirements)
      setTick((n) => n + 1)
    }
  }, [driver.id, persisted])

  const model = useMemo(() => {
    void tick
    return buildActivationResolution(driver)
  }, [driver, tick])

  const [requestOpen, setRequestOpen] = useState(false)
  const [resendOpen, setResendOpen] = useState(false)
  const [assignFor, setAssignFor] = useState<ActivationRequirement | null>(null)
  const [rejectFor, setRejectFor] = useState<ActivationRequirement | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])

  const missing = model.requirements.filter(
    (r) =>
      r.mandatory &&
      !['approved', 'completed', 'waived', 'not_applicable', 'expiring_soon'].includes(r.status),
  )

  const outstandingRequests = missing.filter((r) =>
    ['request_sent', 'opened'].includes(r.status),
  )

  const openRequestDrawer = (keys?: string[]) => {
    setSelectedKeys(keys ?? missing.map((r) => r.definitionKey))
    setRequestOpen(true)
    setMenuFor(null)
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['driver-profile', driver.id] })
    queryClient.invalidateQueries({ queryKey: ['driver-requirements', driver.id] })
    setTick((n) => n + 1)
  }

  const sendRequest = useMutation({
    mutationFn: async (input: {
      keys: string[]
      channels: RequirementChannel[]
      dueAt: string
      body: string
      mode?: 'request' | 'resend'
      minHoursSinceLastRequest?: number
    }) => {
      const result = await api.requestDriverRequirements(
        driver.id,
        {
          definitionKeys: input.keys,
          channels: input.channels,
          dueAt: input.dueAt,
          message: input.body,
          mode: input.mode ?? 'request',
          minHoursSinceLastRequest: input.minHoursSinceLastRequest,
        },
        actorName,
      )
      hydrateRequirementStore(driver.id, result.requirements)
      if (input.keys.includes('app_account') && canManage) {
        try {
          await api.createDriverAppAccount(
            driver.id,
            {
              channel:
                input.channels.includes('sms') && input.channels.includes('email')
                  ? 'both'
                  : input.channels.includes('sms')
                    ? 'sms'
                    : 'email',
              resend: true,
            },
            actorName,
          )
        } catch {
          // Request meta still recorded for non-invite items
        }
      }
      return result
    },
    onSuccess: (result) => {
      setRequestOpen(false)
      setResendOpen(false)
      const skipped =
        result.skipped.length > 0 ? ` Skipped ${result.skipped.length} recently requested.` : ''
      setMessage(`Request sent for ${result.count} item${result.count === 1 ? '' : 's'}.${skipped}`)
      refresh()
    },
  })

  const recordTraining = useMutation({
    mutationFn: (key: string) =>
      api.recordDriverTraining(
        driver.id,
        {
          trainingKey: key,
          completedAt: new Date().toISOString().slice(0, 10),
          trainer: actorName,
        },
        actorName,
      ),
    onSuccess: (_data, key) => {
      markRequirementLocalStatus(driver.id, key, 'completed')
      setMessage('Training recorded as complete.')
      refresh()
    },
  })

  const assignTraining = useMutation({
    mutationFn: (input: AssignDriverTrainingInput) =>
      api.assignDriverRequirementTraining(driver.id, input, actorName),
    onSuccess: (_data, input) => {
      markRequirementLocalStatus(driver.id, input.definitionKey, 'training_assigned')
      setAssignFor(null)
      setMessage('Training assigned.')
      refresh()
    },
  })

  const rejectRequirement = useMutation({
    mutationFn: (input: { key: string; body: RejectDriverRequirementInput }) =>
      api.rejectDriverRequirement(driver.id, input.key, input.body, actorName),
    onSuccess: (_data, input) => {
      markRequirementLocalStatus(driver.id, input.key, 'rejected')
      setRejectFor(null)
      setMessage('Evidence rejected — replacement requested from the driver.')
      refresh()
    },
  })

  const markStatus = useMutation({
    mutationFn: (input: { key: string; status: 'not_applicable' | 'waived' }) =>
      api.markDriverRequirementStatus(driver.id, input.key, input.status, actorName),
    onSuccess: (_data, input) => {
      markRequirementLocalStatus(driver.id, input.key, input.status)
      setMessage(
        input.status === 'waived' ? 'Waiver recorded.' : 'Marked not applicable.',
      )
      refresh()
    },
  })

  const visibleFailures = driver.eligibility.failures.filter(
    (f) => !isAggregateOnboardingFailure(f.code),
  )

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-950">
          {message}
        </div>
      )}

      {model.canActivate ? (
        <SectionCard
          title="Ready for activation"
          description="All mandatory account, document, qualification and training requirements have been approved."
        >
          <p className="text-sm text-slate-700">Activation will:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Enable the Driver App account</li>
            <li>Allow the driver to be assigned to eligible work</li>
            <li>Add the driver to dispatch availability</li>
            <li>Notify the driver that their account is active</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canManage || activating}
              onClick={onActivate}
              className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
            >
              {activating ? 'Activating…' : 'Activate driver'}
            </button>
            <button
              type="button"
              onClick={refresh}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Refresh eligibility
            </button>
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          title="Activation blocked"
          description="The driver cannot be activated or assigned until critical requirements are approved."
        >
          <p className="text-sm text-slate-800">
            <span className="font-semibold tabular-nums">{model.summary.incompleteRequirements}</span>{' '}
            requirements remain incomplete:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {model.summary.accountIncomplete && <li>1 account setup requirement</li>}
            {model.summary.trainingIncomplete > 0 && (
              <li>{model.summary.trainingIncomplete} mandatory training requirements</li>
            )}
            {model.summary.qualificationsMissing > 0 && (
              <li>{model.summary.qualificationsMissing} qualifications or certificates</li>
            )}
            {(model.summary.documentsMissing > 0 || model.summary.documentsUnderReview > 0) && (
              <li>
                {model.summary.documentsMissing + model.summary.documentsUnderReview} document
                requirements needing attention
              </li>
            )}
          </ul>
          {visibleFailures.filter((f) => f.severity === 'block').length > 0 && (
            <div className="mt-3 rounded-lg border border-red-100 bg-red-50/60 px-3 py-2 text-xs text-red-900">
              Additional blocks:{' '}
              {visibleFailures
                .filter((f) => f.severity === 'block')
                .map((f) => f.message)
                .join(' · ')}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canManage || missing.length === 0}
              onClick={() => openRequestDrawer()}
              className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
            >
              Request missing items
            </button>
            <Link
              to={`/drivers/${driver.id}?tab=Compliance`}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Upload on behalf
            </Link>
            <button
              type="button"
              onClick={refresh}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Refresh eligibility
            </button>
          </div>
        </SectionCard>
      )}

      <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <SummaryChip label="Account" value={model.accountStatusLabel} />
        <SummaryChip label="Onboarding" value={model.onboardingStatusLabel} />
        <SummaryChip label="Compliance" value={model.complianceStatusLabel} />
        <SummaryChip label="Dispatch" value={model.dispatchStatusLabel} />
      </div>

      {(model.summary.accountIncomplete ||
        ['invitation_pending', 'setup_incomplete', 'invitation_expired', 'draft'].includes(
          driver.account.accountStatus,
        ) ||
        driver.account.invitationStatus === 'sent') && (
        <AppInvitePanel driver={driver} actorName={actorName} canManage={canManage} />
      )}

      <SectionCard
        title="Activation requirements"
        description={`${model.summary.criticalBlockers} critical blocker · ${model.summary.incompleteRequirements} incomplete · ${model.summary.documentsApproved} documents approved`}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canManage || missing.length === 0}
              onClick={() => openRequestDrawer()}
              className="rounded-lg border border-command-200 bg-command-50 px-3 py-1.5 text-xs font-medium text-command-800 disabled:opacity-50"
            >
              Request all missing items
            </button>
            <button
              type="button"
              disabled={!canManage || outstandingRequests.length === 0}
              onClick={() => {
                setSelectedKeys(outstandingRequests.map((r) => r.definitionKey))
                setResendOpen(true)
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-800 disabled:opacity-50"
            >
              Resend incomplete
            </button>
          </div>
        }
      >
        <div className="mb-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <SummaryChip
            label="Documents"
            value={`${model.summary.documentsApproved} approved · ${model.summary.documentsUnderReview} under review · ${model.summary.documentsMissing} missing`}
          />
          <SummaryChip
            label="Training"
            value={`${model.summary.trainingComplete} complete · ${model.summary.trainingIncomplete} missing`}
          />
          <SummaryChip
            label="Qualifications"
            value={`${model.summary.qualificationsApproved} approved · ${model.summary.qualificationsMissing} missing`}
          />
          <SummaryChip
            label="App account"
            value={model.summary.accountIncomplete ? 'Setup incomplete' : model.accountStatusLabel}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Requirement</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Last request</th>
                <th className="px-3 py-2 font-semibold">Responsible</th>
                <th className="px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {model.requirements.map((row) => (
                <RequirementRow
                  key={row.id}
                  row={row}
                  menuOpen={menuFor === row.id}
                  onToggleMenu={() => setMenuFor((id) => (id === row.id ? null : row.id))}
                  onPrimary={() => {
                    if (
                      row.primaryAction === 'Request' ||
                      row.primaryAction === 'Resend' ||
                      row.primaryAction === 'Request replacement' ||
                      row.primaryAction === 'Send reminder' ||
                      row.primaryAction === 'Request renewal'
                    ) {
                      openRequestDrawer([row.definitionKey])
                      return
                    }
                    if (row.primaryAction === 'Assign') {
                      setAssignFor(row)
                      return
                    }
                    if (row.primaryAction === 'View progress') {
                      setMessage(`${row.name}: training in progress. Use Record completed training when finished.`)
                      return
                    }
                    if (row.primaryAction === 'Review' || row.primaryAction === 'View') {
                      window.location.assign(`/drivers/${driver.id}?tab=Compliance`)
                    }
                  }}
                  onMenuAction={(action) => {
                    setMenuFor(null)
                    if (action === 'request' || action === 'resend') {
                      openRequestDrawer([row.definitionKey])
                    } else if (action === 'assign') {
                      setAssignFor(row)
                    } else if (action === 'record') {
                      recordTraining.mutate(row.definitionKey)
                    } else if (action === 'reject') {
                      setRejectFor(row)
                    } else if (action === 'na') {
                      markStatus.mutate({ key: row.definitionKey, status: 'not_applicable' })
                    } else if (action === 'waive') {
                      markStatus.mutate({ key: row.definitionKey, status: 'waived' })
                    } else if (action === 'upload') {
                      window.location.assign(`/drivers/${driver.id}?tab=Compliance`)
                    }
                  }}
                  canManage={canManage}
                />
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Activation summary">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Row label="Account setup" value={model.summary.accountIncomplete ? 'Incomplete' : 'Complete'} />
          <Row label="Documents" value={`${model.summary.documentsApproved} approved`} />
          <Row label="Mandatory training" value={`${model.summary.trainingIncomplete} incomplete`} />
          <Row label="Qualifications" value={`${model.summary.qualificationsMissing} incomplete`} />
          <Row label="Eligibility" value={model.complianceStatusLabel} />
          <Row label="Dispatch access" value={model.dispatchStatusLabel} />
        </dl>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canManage || missing.length === 0}
              onClick={() => openRequestDrawer()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Request all missing items
            </button>
            {mode === 'onboarding' && (
              <Link
                to={`/drivers/${driver.id}`}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
              >
                Open driver profile
              </Link>
            )}
          </div>
          <button
            type="button"
            disabled={!canManage || !model.canActivate || activating}
            title={
              model.canActivate
                ? 'Activate driver for dispatch'
                : `Unavailable because:\n${model.activateBlockedReasons.map((r) => `• ${r}`).join('\n')}`
            }
            onClick={onActivate}
            className="rounded-lg bg-midnight px-4 py-2 text-sm font-semibold text-white hover:bg-command-700 disabled:opacity-50"
          >
            {activating
              ? 'Activating…'
              : model.canActivate
                ? 'Activate driver'
                : 'Activate driver — unavailable'}
          </button>
        </div>
        {!model.canActivate && (
          <p className="mt-2 text-xs text-slate-500">
            Unavailable because: {model.activateBlockedReasons.join(' · ')}
          </p>
        )}
      </SectionCard>

      {requestOpen && (
        <RequestMissingDrawer
          driver={driver}
          options={missing}
          selectedKeys={selectedKeys}
          onChangeSelected={setSelectedKeys}
          pending={sendRequest.isPending}
          onClose={() => setRequestOpen(false)}
          onSend={(payload) => sendRequest.mutate(payload)}
        />
      )}

      {resendOpen && (
        <BulkResendDrawer
          options={outstandingRequests}
          selectedKeys={selectedKeys}
          onChangeSelected={setSelectedKeys}
          pending={sendRequest.isPending}
          onClose={() => setResendOpen(false)}
          onSend={(payload) =>
            sendRequest.mutate({
              keys: payload.keys,
              channels: ['in_app', 'email'],
              dueAt: payload.dueAt,
              body: 'Reminder: please complete the outstanding onboarding requirements.',
              mode: 'resend',
              minHoursSinceLastRequest: payload.minHours,
            })
          }
        />
      )}

      {assignFor && (
        <AssignTrainingDrawer
          requirement={assignFor}
          actorName={actorName}
          pending={assignTraining.isPending}
          onClose={() => setAssignFor(null)}
          onAssign={(input) => assignTraining.mutate(input)}
        />
      )}

      {rejectFor && (
        <RejectRequirementDrawer
          requirement={rejectFor}
          pending={rejectRequirement.isPending}
          onClose={() => setRejectFor(null)}
          onReject={(body) =>
            rejectRequirement.mutate({ key: rejectFor.definitionKey, body })
          }
        />
      )}
    </div>
  )
}

function RequirementRow({
  row,
  menuOpen,
  onToggleMenu,
  onPrimary,
  onMenuAction,
  canManage,
}: {
  row: ActivationRequirement
  menuOpen: boolean
  onToggleMenu: () => void
  onPrimary: () => void
  onMenuAction: (action: string) => void
  canManage: boolean
}) {
  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="px-3 py-2">
        <p className="font-medium text-slate-900">{row.name}</p>
        <p className="text-xs text-slate-500">{row.evidenceHint}</p>
      </td>
      <td className="px-3 py-2 capitalize text-slate-600">
        {row.type.replace(/_/g, ' ')}
      </td>
      <td className="px-3 py-2">
        <span
          className={cn(
            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
            STATUS_TONE[row.status] ?? 'bg-slate-100 text-slate-700',
          )}
        >
          {REQUIREMENT_STATUS_LABEL[row.status]}
        </span>
      </td>
      <td className="px-3 py-2 text-xs text-slate-600">
        <p>{formatWhen(row.lastRequestedAt)}</p>
        {row.lastRequestedChannels.length > 0 && (
          <p className="text-slate-400">{row.lastRequestedChannels.join(', ')}</p>
        )}
      </td>
      <td className="px-3 py-2 text-slate-600">{row.responsibleLabel}</td>
      <td className="relative px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canManage}
            onClick={onPrimary}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {row.primaryAction}
          </button>
          <button
            type="button"
            disabled={!canManage}
            onClick={onToggleMenu}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
            aria-label="More actions"
          >
            ⋯
          </button>
        </div>
        {menuOpen && (
          <div className="absolute right-3 z-20 mt-1 w-52 rounded-xl border border-slate-200 bg-white py-1 text-xs shadow-lg">
            {[
              ['request', 'Request from driver'],
              ['resend', 'Resend request'],
              ['upload', 'Upload on behalf'],
              ['assign', 'Assign internal training'],
              ['record', 'Record completed training'],
              ['reject', 'Reject submission'],
              ['na', 'Mark not applicable'],
              ['waive', 'Request waiver'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="block w-full px-3 py-1.5 text-left hover:bg-slate-50"
                onClick={() => onMenuAction(id)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </td>
    </tr>
  )
}

function RequestMissingDrawer({
  driver,
  options,
  selectedKeys,
  onChangeSelected,
  pending,
  onClose,
  onSend,
}: {
  driver: DriverProfile
  options: ActivationRequirement[]
  selectedKeys: string[]
  onChangeSelected: (keys: string[]) => void
  pending: boolean
  onClose: () => void
  onSend: (input: {
    keys: string[]
    channels: RequirementChannel[]
    dueAt: string
    body: string
  }) => void
}) {
  const defaultDue = new Date()
  defaultDue.setDate(defaultDue.getDate() + 7)
  const [channels, setChannels] = useState<RequirementChannel[]>(['in_app', 'email'])
  const [dueAt, setDueAt] = useState(defaultDue.toISOString().slice(0, 10))
  const [body, setBody] = useState(
    'Please complete or upload the following requirements before your driver account can be activated.',
  )
  const [reminders, setReminders] = useState({ after2: true, before24: true, escalate: true })

  const toggleKey = (key: string) => {
    onChangeSelected(
      selectedKeys.includes(key) ? selectedKeys.filter((k) => k !== key) : [...selectedKeys, key],
    )
  }

  const toggleChannel = (ch: RequirementChannel) => {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]))
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30 p-0 sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto rounded-none bg-white shadow-xl sm:rounded-2xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Request missing onboarding items</h2>
          <p className="mt-1 text-sm text-slate-600">
            {driver.firstName} {driver.lastName}
            {driver.email ? ` · ${driver.email}` : ''}
          </p>
          <p className="text-xs text-slate-500">
            Driver app account: {driver.account.accountStatus.replace(/_/g, ' ')}
          </p>
        </div>

        <div className="flex-1 space-y-5 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Items to request</p>
            <ul className="mt-2 space-y-1.5">
              {options.map((item) => (
                <label key={item.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(item.definitionKey)}
                    onChange={() => toggleKey(item.definitionKey)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium text-slate-900">{item.name}</span>
                    <span className="block text-xs capitalize text-slate-500">
                      {item.type.replace(/_/g, ' ')} · {REQUIREMENT_STATUS_LABEL[item.status]}
                    </span>
                  </span>
                </label>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">Delivery method</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {(
                [
                  ['in_app', 'Driver app'],
                  ['email', 'Email'],
                  ['sms', 'SMS'],
                ] as const
              ).map(([id, label]) => (
                <label key={id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={channels.includes(id)}
                    onChange={() => toggleChannel(id)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <label className="block text-sm">
            <span className="font-semibold text-slate-900">Due date</span>
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>

          <div>
            <p className="text-sm font-semibold text-slate-900">Reminder schedule</p>
            <div className="mt-2 space-y-1.5 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={reminders.after2}
                  onChange={(e) => setReminders((r) => ({ ...r, after2: e.target.checked }))}
                />
                Remind after 2 days
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={reminders.before24}
                  onChange={(e) => setReminders((r) => ({ ...r, before24: e.target.checked }))}
                />
                Remind 24 hours before deadline
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={reminders.escalate}
                  onChange={(e) => setReminders((r) => ({ ...r, escalate: e.target.checked }))}
                />
                Escalate when overdue
              </label>
            </div>
          </div>

          <label className="block text-sm">
            <span className="font-semibold text-slate-900">Message</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || selectedKeys.length === 0 || channels.length === 0}
            onClick={() =>
              onSend({
                keys: selectedKeys,
                channels,
                dueAt,
                body,
              })
            }
            className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
          >
            {pending ? 'Sending…' : 'Send request'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-800">{value}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}

function BulkResendDrawer({
  options,
  selectedKeys,
  onChangeSelected,
  pending,
  onClose,
  onSend,
}: {
  options: ActivationRequirement[]
  selectedKeys: string[]
  onChangeSelected: (keys: string[]) => void
  pending: boolean
  onClose: () => void
  onSend: (input: { keys: string[]; dueAt: string; minHours: number }) => void
}) {
  const defaultDue = new Date()
  defaultDue.setDate(defaultDue.getDate() + 7)
  const [dueAt, setDueAt] = useState(defaultDue.toISOString().slice(0, 10))
  const [minHours, setMinHours] = useState(24)

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30 p-0 sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto rounded-none bg-white shadow-xl sm:rounded-2xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Resend incomplete requests</h2>
          <p className="mt-1 text-sm text-slate-600">
            {options.length} of the incomplete requirements already have outstanding requests.
          </p>
        </div>
        <div className="flex-1 space-y-4 px-5 py-4">
          <ul className="space-y-1.5">
            {options.map((item) => (
              <label key={item.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedKeys.includes(item.definitionKey)}
                  onChange={() =>
                    onChangeSelected(
                      selectedKeys.includes(item.definitionKey)
                        ? selectedKeys.filter((k) => k !== item.definitionKey)
                        : [...selectedKeys, item.definitionKey],
                    )
                  }
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">{item.name}</span>
                  <span className="block text-xs text-slate-500">
                    Last request {formatWhen(item.lastRequestedAt)}
                  </span>
                </span>
              </label>
            ))}
          </ul>
          <label className="block text-sm">
            <span className="font-semibold">Do not resend items requested within</span>
            <select
              value={minHours}
              onChange={(e) => setMinHours(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value={0}>No cooldown</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
              <option value={72}>72 hours</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Due date</span>
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || selectedKeys.length === 0}
            onClick={() => onSend({ keys: selectedKeys, dueAt, minHours })}
            className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? 'Sending…' : 'Send reminders'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AssignTrainingDrawer({
  requirement,
  actorName,
  pending,
  onClose,
  onAssign,
}: {
  requirement: ActivationRequirement
  actorName: string
  pending: boolean
  onClose: () => void
  onAssign: (input: AssignDriverTrainingInput) => void
}) {
  const defaultDue = new Date()
  defaultDue.setDate(defaultDue.getDate() + 7)
  const [delivery, setDelivery] =
    useState<AssignDriverTrainingInput['delivery']>('veyvio_module')
  const [trainer, setTrainer] = useState(actorName)
  const [deadline, setDeadline] = useState(defaultDue.toISOString().slice(0, 10))
  const [evidence, setEvidence] = useState({
    completion: true,
    assessment: true,
    certificate: false,
  })

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30 p-0 sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto rounded-none bg-white shadow-xl sm:rounded-2xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Assign training</h2>
          <p className="mt-1 text-sm text-slate-600">{requirement.name}</p>
        </div>
        <div className="flex-1 space-y-4 px-5 py-4 text-sm">
          <fieldset>
            <legend className="font-semibold">Delivery</legend>
            <div className="mt-2 space-y-1.5">
              {(
                [
                  ['veyvio_module', 'Veyvio learning module'],
                  ['in_person', 'In-person session'],
                  ['external', 'External provider'],
                  ['manager_signoff', 'Manager sign-off'],
                ] as const
              ).map(([id, label]) => (
                <label key={id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="delivery"
                    checked={delivery === id}
                    onChange={() => setDelivery(id)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="font-semibold">Trainer</span>
            <input
              value={trainer}
              onChange={(e) => setTrainer(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="font-semibold">Deadline</span>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <div>
            <p className="font-semibold">Required evidence</p>
            <div className="mt-2 space-y-1.5">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={evidence.completion}
                  onChange={(e) => setEvidence((v) => ({ ...v, completion: e.target.checked }))}
                />
                Completion record
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={evidence.assessment}
                  onChange={(e) => setEvidence((v) => ({ ...v, assessment: e.target.checked }))}
                />
                Assessment result
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={evidence.certificate}
                  onChange={(e) => setEvidence((v) => ({ ...v, certificate: e.target.checked }))}
                />
                Uploaded certificate
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || !trainer.trim()}
            onClick={() =>
              onAssign({
                definitionKey: requirement.definitionKey,
                delivery,
                trainer: trainer.trim(),
                deadline,
                evidenceCompletion: evidence.completion,
                evidenceAssessment: evidence.assessment,
                evidenceCertificate: evidence.certificate,
              })
            }
            className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? 'Assigning…' : 'Assign training'}
          </button>
        </div>
      </div>
    </div>
  )
}

const REJECT_REASONS: { code: RejectDriverRequirementInput['reasonCode']; label: string }[] = [
  { code: 'unreadable', label: 'Image is unreadable' },
  { code: 'expired', label: 'Certificate has expired' },
  { code: 'name_mismatch', label: 'Driver name does not match' },
  { code: 'incorrect_document', label: 'Incorrect document' },
  { code: 'pages_missing', label: 'Required pages are missing' },
  { code: 'other', label: 'Other' },
]

function RejectRequirementDrawer({
  requirement,
  pending,
  onClose,
  onReject,
}: {
  requirement: ActivationRequirement
  pending: boolean
  onClose: () => void
  onReject: (input: RejectDriverRequirementInput) => void
}) {
  const defaultDue = new Date()
  defaultDue.setDate(defaultDue.getDate() + 5)
  const [reasonCode, setReasonCode] =
    useState<RejectDriverRequirementInput['reasonCode']>('unreadable')
  const [instructions, setInstructions] = useState(
    'Please upload a clear image showing the full certificate, including the issue and expiry dates.',
  )
  const [deadline, setDeadline] = useState(defaultDue.toISOString().slice(0, 10))

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30 p-0 sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto rounded-none bg-white shadow-xl sm:rounded-2xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Reject {requirement.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            This reopens the requirement and asks the driver for a replacement.
          </p>
        </div>
        <div className="flex-1 space-y-4 px-5 py-4 text-sm">
          <fieldset>
            <legend className="font-semibold">Reason</legend>
            <div className="mt-2 space-y-1.5">
              {REJECT_REASONS.map((r) => (
                <label key={r.code} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="reject-reason"
                    checked={reasonCode === r.code}
                    onChange={() => setReasonCode(r.code)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="font-semibold">Instructions to driver</span>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="font-semibold">Deadline</span>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || !instructions.trim()}
            onClick={() =>
              onReject({
                reasonCode,
                instructions: instructions.trim(),
                deadline,
              })
            }
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? 'Rejecting…' : 'Reject and request replacement'}
          </button>
        </div>
      </div>
    </div>
  )
}
