import type { ExceptionCategory, ExceptionSuggestedAction, OperationalException } from '@/lib/types'

const BY_TYPE: Record<string, ExceptionSuggestedAction[]> = {
  vehicle_vor: [
    {
      id: 'vor-1',
      title: 'Find replacement vehicle',
      detail: 'Locate a compliant available vehicle near the depot and reassign remaining trips.',
      href: '/vehicles?status=available',
    },
    {
      id: 'vor-2',
      title: 'Notify Dispatch',
      detail: 'Alert controllers so affected runs are held or re-planned.',
      href: '/dispatch',
    },
  ],
  driver_licence_expired: [
    {
      id: 'lic-1',
      title: 'Block further assignments',
      detail: 'Prevent new duties until licence evidence is updated.',
      href: '/drivers',
    },
    {
      id: 'lic-2',
      title: 'Notify Compliance Manager',
      detail: 'Escalate for licence renewal and eligibility review.',
      href: '/compliance-rules',
    },
    {
      id: 'lic-3',
      title: 'Offer replacement drivers',
      detail: 'Surface compliant drivers free within the next duty window.',
      href: '/dispatch',
    },
  ],
  passenger_not_collected: [
    {
      id: 'pnc-1',
      title: 'Call passenger / carer',
      detail: 'Confirm location and whether collection is still required.',
    },
    {
      id: 'pnc-2',
      title: 'Call driver',
      detail: 'Confirm wait time, exact stop, and whether passenger was seen.',
    },
    {
      id: 'pnc-3',
      title: 'Reassign or divert',
      detail: 'If still required, send nearest compliant vehicle.',
      href: '/live-operations',
    },
  ],
  run_no_driver: [
    {
      id: 'rnd-1',
      title: 'Assign compliant driver',
      detail: 'Match an eligible free driver before departure.',
      href: '/dispatch',
    },
  ],
  run_no_vehicle: [
    {
      id: 'rnv-1',
      title: 'Allocate release-ready vehicle',
      detail: 'Prefer vehicles with clear release decision and completed checks.',
      href: '/vehicles?status=available',
    },
  ],
  escort_missing: [
    {
      id: 'esc-1',
      title: 'Hold boarding',
      detail: 'Do not board until escort is confirmed present.',
    },
    {
      id: 'esc-2',
      title: 'Contact booking owner',
      detail: 'Confirm escort arrangements with customer services.',
      href: '/bookings',
    },
  ],
}

const BY_CATEGORY: Record<ExceptionCategory, ExceptionSuggestedAction[]> = {
  driver: [
    {
      id: 'cat-drv',
      title: 'Contact driver',
      detail: 'Confirm status and ETA, then update the run board.',
      href: '/messages',
    },
  ],
  vehicle: [
    {
      id: 'cat-veh',
      title: 'Assess vehicle availability',
      detail: 'Decide VOR, restricted, or return to service with evidence.',
      href: '/vehicles',
    },
  ],
  journey: [
    {
      id: 'cat-jny',
      title: 'Stabilise the journey',
      detail: 'Protect passenger outcome first, then update Live Operations.',
      href: '/live-operations',
    },
  ],
  customer: [
    {
      id: 'cat-cus',
      title: 'Update the customer',
      detail: 'Acknowledge the issue and record the recovery plan.',
    },
  ],
  dispatch: [
    {
      id: 'cat-dsp',
      title: 'Fix the allocation',
      detail: 'Resolve driver/vehicle/capacity conflict on the dispatch board.',
      href: '/dispatch',
    },
  ],
  compliance: [
    {
      id: 'cat-cmp',
      title: 'Contain compliance risk',
      detail: 'Block unsafe work and notify the compliance owner.',
      href: '/compliance-rules',
    },
  ],
  yard: [
    {
      id: 'cat-yard',
      title: 'Clear the yard blocker',
      detail: 'Complete the bay, keys, equipment, or inspection task.',
      href: '/yard',
    },
  ],
}

/** Attach rule-based suggested actions (not LLM). */
export function enrichExceptionSuggestions(ex: OperationalException): OperationalException {
  if (ex.suggestedActions && ex.suggestedActions.length > 0) return ex
  const fromType = ex.typeCode ? BY_TYPE[ex.typeCode] : undefined
  const actions = fromType ?? BY_CATEGORY[ex.category] ?? []
  return { ...ex, suggestedActions: actions }
}

export function suggestedActionsFor(ex: OperationalException): ExceptionSuggestedAction[] {
  return enrichExceptionSuggestions(ex).suggestedActions ?? []
}
