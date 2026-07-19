import { createContext, useContext, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { ACCOUNT_STATUS_LABELS, OPERATIONAL_STATUS_LABELS } from '@/lib/drivers/constants'
import { canManageDriverAccess } from '@/lib/drivers/permissions'
import { useDriverOnboardingActions } from './hooks/useDriverOnboardingActions'
import { useDriverOnboardingData } from './hooks/useDriverOnboardingData'
import { useDriverOnboardingForm } from './hooks/useDriverOnboardingForm'
import { useDriverOnboardingNavigation } from './hooks/useDriverOnboardingNavigation'

function useDriverOnboardingState() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const { user } = useAuth()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canManage = canManageDriverAccess(user?.permissions ?? [])

  const { driver, driverLoading, depots } = useDriverOnboardingData(id)
  const { step, stepIdx, goStep, back } = useDriverOnboardingNavigation(driver?.onboardingStep)
  const { form, patchForm } = useDriverOnboardingForm(driver, depots[0]?.id)
  const actions = useDriverOnboardingActions({
    driverId: id,
    isNew,
    form,
    actorName,
    goStep,
  })

  const statusLine = driver
    ? `Operational: ${OPERATIONAL_STATUS_LABELS[driver.operationalStatus]} · Account: ${ACCOUNT_STATUS_LABELS[driver.account.accountStatus]}`
    : null

  return {
    id,
    isNew,
    driver,
    driverLoading,
    depots,
    form,
    patchForm,
    step,
    stepIdx,
    actorName,
    canManage,
    statusLine,
    back: () => back(id),
    continue: () => actions.continueFrom(step),
    saveDraft: actions.saveDraft,
    upload: actions.uploadDoc.mutate,
    activate: () => {
      actions.setError('')
      actions.activate.mutate()
    },
    pending: actions.pending,
    uploadPending: actions.uploadDoc.isPending,
    activatePending: actions.activate.isPending,
    error: actions.error,
    eligibility: driver?.eligibility,
  }
}

export type DriverOnboardingContextValue = ReturnType<typeof useDriverOnboardingState>

const DriverOnboardingContext = createContext<DriverOnboardingContextValue | null>(null)

export function DriverOnboardingProvider({ children }: { children: ReactNode }) {
  const value = useDriverOnboardingState()
  return (
    <DriverOnboardingContext.Provider value={value}>{children}</DriverOnboardingContext.Provider>
  )
}

export function useDriverOnboarding() {
  const ctx = useContext(DriverOnboardingContext)
  if (!ctx) throw new Error('useDriverOnboarding must be used within DriverOnboardingProvider')
  return ctx
}
