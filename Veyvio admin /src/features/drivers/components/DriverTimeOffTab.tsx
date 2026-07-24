import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { LeaveApprovalWizard } from '@/features/attendance/LeaveApprovalWizard'
import { LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL } from '@/lib/attendance/constants'
import type { LeaveRequestRecord } from '@/lib/attendance/types'
import type { DriverProfile } from '@/lib/drivers/types'
import type { HolidayCalculationMethod } from '@/lib/holiday/types'
import { formatApproximateDays } from '@/lib/holiday/engine'
import { api } from '@/lib/api/client'
import { formatDate } from '@/components/ui/status'
import { tKey } from '@/lib/tenant/tenant-query-scope'


const WEEKDAY_OPTIONS = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 7, label: 'Sun' },
]

function formatDays(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '')
}

export function DriverTimeOffTab({
  driver,
  actorName,
  canManage,
}: {
  driver: DriverProfile
  actorName: string
  canManage: boolean
}) {
  const queryClient = useQueryClient()
  const [method, setMethod] = useState<HolidayCalculationMethod>('fixed_days')
  const [daysPerWeek, setDaysPerWeek] = useState('5')
  const [hoursPerWeek, setHoursPerWeek] = useState('40')
  const [entitlementWeeks, setEntitlementWeeks] = useState('5.6')
  const [workingWeekdays, setWorkingWeekdays] = useState<number[]>([1, 2, 3, 4, 5])
  const [bankHolidays, setBankHolidays] = useState(true)
  const [carryForwardDays, setCarryForwardDays] = useState('0')
  const [adjustDays, setAdjustDays] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [accrualHours, setAccrualHours] = useState('')
  const [wizardRequest, setWizardRequest] = useState<LeaveRequestRecord | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: tKey(['driver-holiday', driver.id]),
    queryFn: () => api.getDriverHoliday(driver.id),
  })

  const { data: leaveRows } = useQuery({
    queryKey: tKey(['leave-requests']),
    queryFn: () => api.getLeaveRequests(),
  })

  const driverLeave = (Array.isArray(leaveRows) ? leaveRows : []).filter(
    (r) => r.personId === driver.id,
  )

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: tKey(['driver-holiday', driver.id]) })
    queryClient.invalidateQueries({ queryKey: tKey(['leave-requests']) })
    queryClient.invalidateQueries({ queryKey: tKey(['attendance-hub']) })
  }

  useEffect(() => {
    if (!data?.profile) return
    setMethod((data.profile.calculationMethod as HolidayCalculationMethod) || 'fixed_days')
    setDaysPerWeek(String(data.profile.contractedDaysPerWeek ?? 5))
    setHoursPerWeek(String(data.profile.contractedHoursPerWeek ?? 40))
    setEntitlementWeeks(String(data.profile.entitlementWeeks ?? 5.6))
    setWorkingWeekdays(
      Array.isArray(data.profile.workingWeekdays) && data.profile.workingWeekdays.length
        ? data.profile.workingWeekdays
        : [1, 2, 3, 4, 5],
    )
    setBankHolidays(Boolean(data.profile.bankHolidaysIncluded))
    setCarryForwardDays(
      String(
        Math.round(
          (Number(data.profile.carriedForwardMinutes ?? 0) /
            Math.max(1, Number(data.profile.standardDayMinutes ?? 480))) *
            10,
        ) / 10,
      ),
    )
  }, [data?.profile])

  const saveProfile = useMutation({
    mutationFn: () =>
      api.updateDriverHolidayProfile(
        driver.id,
        {
          calculationMethod: method,
          contractedDaysPerWeek: Number(daysPerWeek),
          contractedHoursPerWeek: Number(hoursPerWeek),
          entitlementWeeks: Number(entitlementWeeks),
          workingWeekdays,
          bankHolidaysIncluded: bankHolidays,
          carriedForwardMinutes: Math.round(
            Number(carryForwardDays || 0) * Number(data?.standardDayMinutes ?? 480),
          ),
        },
        actorName,
      ),
    onSuccess: () => {
      setMessage('Holiday entitlement updated.')
      invalidate()
    },
    onError: (err) => {
      setMessage(err instanceof Error ? err.message : 'Could not save holiday profile.')
    },
  })

  const adjust = useMutation({
    mutationFn: () =>
      api.adjustDriverHoliday(
        driver.id,
        { days: Number(adjustDays), reason: adjustReason },
        actorName,
      ),
    onSuccess: () => {
      setAdjustDays('')
      setAdjustReason('')
      setMessage('Adjustment recorded on the holiday ledger.')
      invalidate()
    },
    onError: (err) => {
      setMessage(err instanceof Error ? err.message : 'Adjustment failed.')
    },
  })

  const accrue = useMutation({
    mutationFn: () =>
      api.accrueDriverHoliday(
        driver.id,
        { hoursWorked: Number(accrualHours), reason: 'Irregular hours accrual' },
        actorName,
      ),
    onSuccess: () => {
      setAccrualHours('')
      setMessage('Accrual posted (12.07% of hours worked).')
      invalidate()
    },
    onError: (err) => {
      setMessage(err instanceof Error ? err.message : 'Accrual failed.')
    },
  })

  const days = data?.days
  const showHours = data?.displayUnit === 'hours'
  const approx =
    data?.minutes?.entitlementTotal != null
      ? formatApproximateDays(data.minutes.entitlementTotal, data.standardDayMinutes || 480)
      : null

  const toggleWeekday = (id: number) => {
    setWorkingWeekdays((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id].sort((a, b) => a - b),
    )
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          {message}
        </p>
      ) : null}

      <SectionCard
        title="Holiday balance"
        description={data?.leaveYearLabel ?? 'Leave year entitlement for this driver'}
        action={
          <Link
            to="/time-off"
            className="text-xs font-medium text-command-700 hover:underline"
          >
            Open Time Off queue
          </Link>
        }
      >
        {isLoading ? (
          <p className="text-sm text-muted">Loading holiday balance…</p>
        ) : error ? (
          <p className="text-sm text-red-800">
            {error instanceof Error ? error.message : 'Could not load holiday balance'}
          </p>
        ) : days ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <BalanceStat
                label="Entitlement"
                value={
                  showHours
                    ? `${formatDays((data?.minutes.entitlementTotal ?? 0) / 60)} hrs`
                    : `${formatDays(days.entitlementTotal)} days`
                }
              />
              <BalanceStat
                label="Used"
                value={
                  showHours
                    ? `${formatDays((data?.minutes.taken ?? 0) / 60)} hrs`
                    : `${formatDays(days.taken)} days`
                }
              />
              <BalanceStat
                label="Approved future"
                value={`${formatDays(days.approvedFuture)} days`}
              />
              <BalanceStat label="Pending" value={`${formatDays(days.pending)} days`} />
              <BalanceStat
                label="Remaining"
                value={
                  showHours
                    ? `${formatDays((data?.minutes.remaining ?? 0) / 60)} hrs`
                    : `${formatDays(days.remaining)} days`
                }
                tone="ready"
              />
              <BalanceStat
                label="If pending approved"
                value={`${formatDays(days.remainingIfPendingApproved)} days`}
              />
            </div>
            {showHours && approx ? (
              <p className="mt-3 text-xs text-muted">{approx}</p>
            ) : null}
          </>
        ) : null}
      </SectionCard>

      <SectionCard title="Employment & holiday settings">
        <p className="mb-3 text-xs text-muted">
          Choose the calculation method for this contract. Working weekdays drive how many days a
          leave request deducts. Pending leave does not reduce the official remaining balance.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="text-ink-soft">Calculation method</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as HolidayCalculationMethod)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              disabled={!canManage}
            >
              <option value="fixed_days">Fixed days (working days × weeks)</option>
              <option value="fixed_hours">Fixed hours (hours × weeks)</option>
              <option value="irregular_hours">Irregular hours (12.07% accrual)</option>
              <option value="manual">Manual annual allowance</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">Contracted days per week</span>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="7"
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              disabled={!canManage}
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">Contracted hours per week</span>
            <input
              type="number"
              step="0.5"
              min="1"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              disabled={!canManage}
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">Entitlement weeks</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={entitlementWeeks}
              onChange={(e) => setEntitlementWeeks(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              disabled={!canManage}
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">Carry-forward (days)</span>
            <input
              type="number"
              step="0.5"
              min="0"
              value={carryForwardDays}
              onChange={(e) => setCarryForwardDays(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              disabled={!canManage}
            />
          </label>
          <div className="sm:col-span-2">
            <p className="text-sm text-ink-soft">Working weekdays</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map((d) => {
                const active = workingWeekdays.includes(d.id)
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={!canManage}
                    onClick={() => toggleWeekday(d.id)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                      active
                        ? 'border-command-500 bg-command-50 text-command-900'
                        : 'border-border text-ink-soft'
                    }`}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-soft sm:mt-2">
            <input
              type="checkbox"
              checked={bankHolidays}
              onChange={(e) => setBankHolidays(e.target.checked)}
              disabled={!canManage}
            />
            Bank holidays included in entitlement
          </label>
        </div>
        {canManage ? (
          <button
            type="button"
            disabled={saveProfile.isPending}
            onClick={() => {
              setMessage(null)
              saveProfile.mutate()
            }}
            className="mt-4 rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
          >
            {saveProfile.isPending ? 'Saving…' : 'Save holiday settings'}
          </button>
        ) : null}
      </SectionCard>

      {canManage ? (
        <SectionCard title="Add adjustment">
          <p className="mb-3 text-xs text-muted">
            Manual ledger adjustment (requires reason). Positive days increase the balance; negative
            days reduce it.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-soft">Days (+/−)</span>
              <input
                type="number"
                step="0.5"
                value={adjustDays}
                onChange={(e) => setAdjustDays(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-ink-soft">Reason</span>
              <input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
                placeholder="e.g. Historic leave correction"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={
              adjust.isPending || !adjustDays || !adjustReason.trim() || Number(adjustDays) === 0
            }
            onClick={() => {
              setMessage(null)
              adjust.mutate()
            }}
            className="mt-3 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted disabled:opacity-50"
          >
            {adjust.isPending ? 'Posting…' : 'Post adjustment'}
          </button>
        </SectionCard>
      ) : null}

      {canManage && method === 'irregular_hours' ? (
        <SectionCard title="Post irregular-hours accrual">
          <p className="mb-3 text-xs text-muted">
            Accrues holiday at 12.07% of hours worked in the period.
          </p>
          <label className="block text-sm">
            <span className="text-ink-soft">Hours worked</span>
            <input
              type="number"
              step="0.25"
              min="0.25"
              value={accrualHours}
              onChange={(e) => setAccrualHours(e.target.value)}
              className="mt-1 w-full max-w-xs rounded-lg border border-border px-3 py-1.5"
            />
          </label>
          <button
            type="button"
            disabled={accrue.isPending || !accrualHours || Number(accrualHours) <= 0}
            onClick={() => {
              setMessage(null)
              accrue.mutate()
            }}
            className="mt-3 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted disabled:opacity-50"
          >
            {accrue.isPending ? 'Posting…' : 'Post accrual'}
          </button>
        </SectionCard>
      ) : null}

      <SectionCard title="Leave requests" description="Approve or decline — annual leave updates the balance">
        {driverLeave.length === 0 ? (
          <p className="text-sm text-muted">No leave requests for this driver yet.</p>
        ) : (
          <ul className="space-y-3">
            {driverLeave.map((row) => {
              return (
                <li key={row.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {formatDate(row.startDate)} – {formatDate(row.endDate)}
                      </p>
                      <p className="text-xs text-muted">
                        {LEAVE_TYPE_LABEL[row.leaveType] ?? row.leaveType} ·{' '}
                        {LEAVE_STATUS_LABEL[row.status] ?? row.status}
                        {row.reference ? ` · ${row.reference}` : ''}
                      </p>
                      {row.reason ? <p className="mt-1 text-ink-soft">{row.reason}</p> : null}
                    </div>
                    {canManage && (row.status === 'pending' || row.status === 'moved') ? (
                      <button
                        type="button"
                        className="rounded-lg bg-command-600 px-3 py-1 text-xs font-medium text-white hover:bg-command-700"
                        onClick={() => setWizardRequest(row)}
                      >
                        Review request
                      </button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      {wizardRequest && (
        <LeaveApprovalWizard
          request={wizardRequest}
          actorName={actorName}
          onClose={() => setWizardRequest(null)}
          onComplete={() => {
            setWizardRequest(null)
            setMessage('Leave decision saved — balance updated.')
            invalidate()
          }}
        />
      )}
    </div>
  )
}

function BalanceStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'ready'
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        tone === 'ready' ? 'border-emerald-200 bg-emerald-50' : 'border-border bg-surface'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{value}</p>
    </div>
  )
}
