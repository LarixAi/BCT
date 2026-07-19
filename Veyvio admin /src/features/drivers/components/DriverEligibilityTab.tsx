import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { RESTRICTION_TYPE_OPTIONS } from '@/lib/drivers/compliance'
import { isAggregateOnboardingFailure } from '@/lib/drivers/activation-requirements'
import { formatDate } from '@/components/ui/status'
import type { DriverProfile } from '@/lib/drivers/types'
import { api } from '@/lib/api/client'
import { ActivationResolutionCentre } from './ActivationResolutionCentre'

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
    queryClient.invalidateQueries({ queryKey: ['driver-profile', driver.id] })
    queryClient.invalidateQueries({ queryKey: ['driver-profiles'] })
    queryClient.invalidateQueries({ queryKey: ['driver-eligibility-exceptions'] })
  }

  const activate = useMutation({
    mutationFn: () => api.activateDriver(driver.id, {}, actorName),
    onSuccess: invalidate,
  })

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
                  <p className="text-slate-700">{o.reason}</p>
                  <p className="mt-1 text-xs text-slate-500">
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
          <div className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="block text-sm">
              <span className="text-slate-600">Restriction type</span>
              <select
                value={restrictionType}
                onChange={(e) => setRestrictionType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
              >
                {RESTRICTION_TYPE_OPTIONS.map((o) => (
                  <option key={o.type} value={o.type}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Reason</span>
              <textarea
                value={restrictionReason}
                onChange={(e) => setRestrictionReason(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
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
          <p className="text-sm text-slate-500">No active restrictions.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {driver.restrictions
              .filter((r) => r.status === 'active')
              .map((r) => (
                <li key={r.id} className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{r.label}</p>
                      <p className="text-slate-700">{r.reason}</p>
                      <p className="mt-1 text-xs text-slate-500">Since {formatDate(r.startDate)}</p>
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
          <p className="mb-2 text-xs text-slate-500">
            Rare, time-limited override for a specific check. Does not change the underlying compliance record.
          </p>
          {showOverride && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-slate-600">Check code</span>
                  <input
                    value={overrideCode}
                    onChange={(e) => setOverrideCode(e.target.value)}
                    placeholder="e.g. licence_expired"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-600">Label</span>
                  <input
                    value={overrideLabel}
                    onChange={(e) => setOverrideLabel(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="text-slate-600">Reason</span>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Expires at</span>
                <input
                  type="datetime-local"
                  value={overrideExpires}
                  onChange={(e) => setOverrideExpires(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
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
