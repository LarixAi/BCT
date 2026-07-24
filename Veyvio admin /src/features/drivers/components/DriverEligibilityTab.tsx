import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { formatDate } from '@/components/ui/status'
import { RESTRICTION_TYPE_OPTIONS, countDocumentsPendingAdminReview } from '@/lib/drivers/compliance'
import {
  buildActivationResolution,
  isAggregateOnboardingFailure,
} from '@/lib/drivers/activation-requirements'
import type { DriverProfile } from '@/lib/drivers/types'
import { api } from '@/lib/api/client'
import { ActivationResolutionCentre } from './ActivationResolutionCentre'
import { EligibilityPanel } from './EligibilityPanel'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function DriverEligibilityTab({
  driver,
  actorName,
  canManage,
}: {
  driver: DriverProfile
  actorName: string
  canManage: boolean
}) {
  const queryClient = useQueryClient()
  const [showRestriction, setShowRestriction] = useState(false)
  const [showOverride, setShowOverride] = useState(false)
  const [restrictionType, setRestrictionType] = useState(RESTRICTION_TYPE_OPTIONS[0]!.type)
  const [restrictionReason, setRestrictionReason] = useState('')
  const [overrideCode, setOverrideCode] = useState('')
  const [overrideLabel, setOverrideLabel] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideExpires, setOverrideExpires] = useState('')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: tKey(['driver-profile', driver.id]) })
    queryClient.invalidateQueries({ queryKey: tKey(['driver-profiles']) })
    queryClient.invalidateQueries({ queryKey: tKey(['driver-eligibility-exceptions']) })
  }

  const activate = useMutation({
    mutationFn: () => api.activateDriver(driver.id, {}, actorName),
    onSuccess: invalidate,
  })

  const resolution = useMemo(() => buildActivationResolution(driver), [driver])
  const docsPending = countDocumentsPendingAdminReview(driver.documents)
  const appOnline =
    driver.operationalStatus === 'eligible' || driver.operationalStatus === 'restricted'
  const dispatchReady = driver.eligibility.canAssign || driver.eligibility.canStartTrip

  const blockingReasons = useMemo(() => {
    const items: { label: string; href?: string }[] = []
    for (const reason of resolution.activateBlockedReasons) {
      const lower = reason.toLowerCase()
      items.push({
        label: reason,
        href: lower.includes('document')
          ? `/drivers/${driver.id}?tab=Compliance`
          : lower.includes('training')
            ? `/drivers/${driver.id}?tab=Training`
            : undefined,
      })
    }
    for (const failure of driver.eligibility.failures) {
      if (isAggregateOnboardingFailure(failure.code)) continue
      if (items.some((i) => i.label === failure.message)) continue
      items.push({
        label: failure.message,
        href: failure.category === 'compliance'
          ? failure.code.startsWith('training_') || failure.code === 'training_not_started'
            ? `/drivers/${driver.id}?tab=Training`
            : `/drivers/${driver.id}?tab=Compliance`
          : undefined,
      })
    }
    if (docsPending > 0 && !items.some((i) => i.href?.includes('Compliance'))) {
      items.push({
        label: `${docsPending} document${docsPending === 1 ? '' : 's'} awaiting review on Compliance`,
        href: `/drivers/${driver.id}?tab=Compliance`,
      })
    }
    return items
  }, [driver, docsPending, resolution.activateBlockedReasons])

  const otherChecks = driver.eligibility.failures
    .concat(driver.eligibility.warnings)
    .filter((item) => !isAggregateOnboardingFailure(item.code))

  const addRestriction = useMutation({
    mutationFn: () => {
      const opt = RESTRICTION_TYPE_OPTIONS.find((o) => o.type === restrictionType)!
      return api.addDriverRestriction(
        driver.id,
        { type: restrictionType, label: opt.label, reason: restrictionReason },
        actorName,
      )
    },
    onSuccess: () => {
      invalidate()
      setShowRestriction(false)
      setRestrictionReason('')
    },
  })

  const liftRestriction = useMutation({
    mutationFn: (restrictionId: string) =>
      api.liftDriverRestriction(driver.id, restrictionId, 'Restriction reviewed and lifted', actorName),
    onSuccess: invalidate,
  })

  const grantOverride = useMutation({
    mutationFn: () =>
      api.grantDriverEligibilityOverride(
        driver.id,
        {
          checkCode: overrideCode,
          label: overrideLabel,
          reason: overrideReason,
          expiresAt: new Date(overrideExpires).toISOString(),
        },
        actorName,
      ),
    onSuccess: () => {
      invalidate()
      setShowOverride(false)
      setOverrideCode('')
      setOverrideLabel('')
      setOverrideReason('')
      setOverrideExpires('')
    },
  })

  return (
    <div className="space-y-4">
      <SectionCard
        title="Can this driver go online?"
        description="Answers whether the Driver app unlocks ops, and what still blocks dispatch."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <EligibilityPanel
            eligibility={driver.eligibility}
            onboardingPhase={['draft', 'onboarding', 'pending_compliance'].includes(
              driver.operationalStatus,
            )}
            documentsPendingReview={docsPending}
          />
          <div className="rounded-xl border border-border bg-surface p-4 text-sm">
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Driver app (go online)
                </dt>
                <dd className="mt-1 font-medium text-ink">
                  {appOnline
                    ? 'Unlocked — driver can use the live ops shell'
                    : 'Locked — still in onboarding / pending activation'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Dispatch / take work
                </dt>
                <dd className="mt-1 font-medium text-ink">
                  {dispatchReady ? 'Ready for assignment' : 'Blocked until requirements clear'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Operational status
                </dt>
                <dd className="mt-1 font-medium capitalize text-ink">
                  {driver.operationalStatus.replace(/_/g, ' ')}
                </dd>
              </div>
            </dl>

            {blockingReasons.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Why it is blocked
                </p>
                <ul className="mt-2 space-y-1.5">
                  {blockingReasons.map((item) => (
                    <li key={item.label} className="rounded-lg bg-red-50 px-3 py-2 text-red-900">
                      {item.href ? (
                        <Link to={item.href} className="font-medium underline-offset-2 hover:underline">
                          {item.label}
                        </Link>
                      ) : (
                        item.label
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">
                No blockers — driver can go online and take eligible work.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to={`/drivers/${driver.id}?tab=Compliance`}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-muted"
              >
                Open Compliance
              </Link>
              <Link
                to={`/drivers/${driver.id}?tab=Training`}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-muted"
              >
                Open Training
              </Link>
            </div>
          </div>
        </div>
      </SectionCard>

      <ActivationResolutionCentre
        driver={driver}
        actorName={actorName}
        canManage={canManage}
        mode="profile"
        activating={activate.isPending}
        onActivate={() => activate.mutate()}
      />

      <SectionCard title="Other eligibility checks">
        <ul className="space-y-2 text-sm">
          {otherChecks.map((item) => (
            <li
              key={item.code}
              className={`rounded-lg px-3 py-2 ${
                item.severity === 'block' ? 'bg-red-50 text-red-900' : 'bg-amber-50 text-amber-900'
              }`}
            >
              {item.message}
            </li>
          ))}
          {otherChecks.length === 0 && (
            <li className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">
              No additional eligibility blocks outside activation requirements.
            </li>
          )}
        </ul>
      </SectionCard>

      {driver.eligibilityOverrides.length > 0 && (
        <SectionCard title="Active overrides">
          <ul className="space-y-2 text-sm">
            {driver.eligibilityOverrides
              .filter((o) => o.status === 'active')
              .map((o) => (
                <li key={o.id} className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2">
                  <p className="font-medium">{o.label}</p>
                  <p className="text-ink-soft">{o.reason}</p>
                  <p className="mt-1 text-xs text-muted">
                    Expires {formatDate(o.expiresAt.slice(0, 10))} · Approved by {o.approvedBy}
                  </p>
                </li>
              ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard
        title="Restrictions"
        action={
          canManage && (
            <button
              type="button"
              onClick={() => setShowRestriction((v) => !v)}
              className="text-xs font-medium text-command-600 hover:underline"
            >
              {showRestriction ? 'Cancel' : 'Add restriction'}
            </button>
          )
        }
      >
        {showRestriction && (
          <div className="mb-4 space-y-3 rounded-lg border border-border bg-surface-muted p-3">
            <label className="block text-sm">
              <span className="text-ink-soft">Restriction type</span>
              <select
                value={restrictionType}
                onChange={(e) => setRestrictionType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              >
                {RESTRICTION_TYPE_OPTIONS.map((o) => (
                  <option key={o.type} value={o.type}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Reason</span>
              <textarea
                value={restrictionReason}
                onChange={(e) => setRestrictionReason(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              />
            </label>
            <button
              type="button"
              onClick={() => addRestriction.mutate()}
              disabled={!restrictionReason.trim() || addRestriction.isPending}
              className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Apply restriction
            </button>
          </div>
        )}

        {driver.restrictions.filter((r) => r.status === 'active').length === 0 ? (
          <p className="text-sm text-muted">No active restrictions.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {driver.restrictions
              .filter((r) => r.status === 'active')
              .map((r) => (
                <li key={r.id} className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{r.label}</p>
                      <p className="text-ink-soft">{r.reason}</p>
                      <p className="mt-1 text-xs text-muted">Since {formatDate(r.startDate)}</p>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => liftRestriction.mutate(r.id)}
                        className="text-xs font-medium text-command-600 hover:underline"
                      >
                        Lift
                      </button>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        )}
      </SectionCard>

      {canManage && (
        <SectionCard
          title="Controlled eligibility override"
          action={
            <button
              type="button"
              onClick={() => setShowOverride((v) => !v)}
              className="text-xs font-medium text-command-600 hover:underline"
            >
              {showOverride ? 'Cancel' : 'Grant override'}
            </button>
          }
        >
          <p className="mb-2 text-xs text-muted">
            Rare, time-limited override for a specific check. Does not change the underlying compliance record.
          </p>
          {showOverride && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-ink-soft">Check code</span>
                  <input
                    value={overrideCode}
                    onChange={(e) => setOverrideCode(e.target.value)}
                    placeholder="e.g. licence_expired"
                    className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-ink-soft">Label</span>
                  <input
                    value={overrideLabel}
                    onChange={(e) => setOverrideLabel(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="text-ink-soft">Reason</span>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
                />
              </label>
              <label className="block text-sm">
                <span className="text-ink-soft">Expires at</span>
                <input
                  type="datetime-local"
                  value={overrideExpires}
                  onChange={(e) => setOverrideExpires(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
                />
              </label>
              <button
                type="button"
                onClick={() => grantOverride.mutate()}
                disabled={
                  !overrideCode || !overrideLabel || !overrideReason || !overrideExpires || grantOverride.isPending
                }
                className="rounded-lg bg-purple-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Grant override
              </button>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  )
}
