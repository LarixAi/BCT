import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api/client'
import type { OnboardingStepId } from '@/lib/drivers/types'
import {
  buildDriverDocumentUpload,
  mapOnboardingFormToCreateInput,
  mapOnboardingFormToDriverUpdate,
} from '../driver-onboarding-mappers'
import type { DocumentRequirement, DriverOnboardingForm } from '../driver-onboarding.types'
import { onboardingValidators } from '../driver-onboarding.validation'
import { syncDriverRestrictions } from '../lib/sync-driver-restrictions'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function useDriverOnboardingActions({
  driverId,
  isNew,
  form,
  actorName,
  goStep,
}: {
  driverId?: string
  isNew: boolean
  form: DriverOnboardingForm
  actorName: string
  goStep: (next: OnboardingStepId, driverId?: string) => void
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const createDraft = useMutation({
    mutationFn: async () => {
      const profile = await api.createDriver(mapOnboardingFormToCreateInput(form), actorName)
      await api.updateDriver(
        profile.id,
        { onboardingStep: 'employment', operationalStatus: 'onboarding', employmentStatus: 'onboarding' },
        actorName,
      )
      return profile
    },
    onSuccess: (profile) => {
      queryClient.invalidateQueries({ queryKey: tKey(['driver-profiles']) })
      navigate(`/drivers/${profile.id}/onboarding?step=employment`)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not save draft'),
  })

  const saveStep = useMutation({
    mutationFn: async (nextStep: OnboardingStepId) => {
      if (!driverId) throw new Error('Save the personal draft first')
      let profile = await api.updateDriver(
        driverId,
        mapOnboardingFormToDriverUpdate(form, nextStep),
        actorName,
      )
      profile = await syncDriverRestrictions({
        driverId,
        driver: profile,
        selectedRestrictionTypes: form.restrictionTypes,
        actorName,
      })
      return profile
    },
    onSuccess: (profile, nextStep) => {
      queryClient.setQueryData(['driver-profile', driverId], profile)
      goStep(nextStep, profile.id)
      setError('')
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not save step'),
  })

  const invite = useMutation({
    mutationFn: async () => {
      const profile = await api.createDriverAppAccount(
        driverId!,
        { channel: form.inviteChannel },
        actorName,
      )
      return api
        .updateDriver(
          driverId!,
          {
            onboardingStep: 'review',
            operationalStatus: 'pending_compliance',
            employmentStatus: 'onboarding',
          },
          actorName,
        )
        .catch(() => profile)
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(['driver-profile', driverId], profile)
      goStep('review', profile.id)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not create app account'),
  })

  const activate = useMutation({
    mutationFn: () => api.activateDriver(driverId!, {}, actorName),
    onSuccess: (profile) => {
      queryClient.invalidateQueries({ queryKey: tKey(['driver-profiles']) })
      navigate(`/drivers/${profile.id}`)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Activation blocked'),
  })

  const uploadDoc = useMutation({
    mutationFn: (req: DocumentRequirement) =>
      api.uploadDriverDocument(driverId!, buildDriverDocumentUpload(req, form), actorName),
    onSuccess: (profile) => queryClient.setQueryData(['driver-profile', driverId], profile),
    onError: (e) => setError(e instanceof Error ? e.message : 'Upload failed'),
  })

  const pending =
    createDraft.isPending || saveStep.isPending || invite.isPending || activate.isPending

  async function continueFrom(step: OnboardingStepId) {
    setError('')
    const validator = onboardingValidators[step]
    const validationError = validator?.(form) ?? null
    if (validationError) {
      setError(validationError)
      return
    }

    if (step === 'personal') {
      if (isNew) createDraft.mutate()
      else saveStep.mutate('employment')
      return
    }
    if (step === 'employment') {
      saveStep.mutate('documents')
      return
    }
    if (step === 'documents') {
      saveStep.mutate('capabilities')
      return
    }
    if (step === 'capabilities') {
      saveStep.mutate('account')
      return
    }
    if (step === 'account') {
      invite.mutate()
      return
    }
    if (step === 'review') {
      activate.mutate()
    }
  }

  function saveDraft() {
    setError('')
    const validationError = onboardingValidators.personal(form)
    if (validationError) {
      setError(validationError)
      return
    }
    createDraft.mutate()
  }

  return {
    error,
    setError,
    pending,
    createDraft,
    saveStep,
    invite,
    activate,
    uploadDoc,
    continueFrom,
    saveDraft,
  }
}
