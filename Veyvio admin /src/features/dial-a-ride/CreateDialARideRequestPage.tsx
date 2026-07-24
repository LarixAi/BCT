import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DialARideStepper } from './components/DialARideWizardUi'
import { MemberStep } from './steps/MemberStep'
import { DarJourneyStep } from './steps/DarJourneyStep'
import { DarScheduleStep } from './steps/DarScheduleStep'
import { DarRequirementsStep } from './steps/DarRequirementsStep'
import { ServiceChecksStep } from './steps/ServiceChecksStep'
import { DarReviewStep } from './steps/DarReviewStep'
import type { DialARideRequest } from '@/lib/dial-a-ride/types'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function CreateDialARideRequestPage() {
  const [searchParams] = useSearchParams()
  const memberParam = searchParams.get('member')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [request, setRequest] = useState<DialARideRequest | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (request) return
    api
      .createDialARideRequestDraft(memberParam ?? undefined)
      .then(setRequest)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not start request'))
  }, [request, memberParam])

  const { data: member } = useQuery({
    queryKey: tKey(['dial-a-ride-member', request?.memberId]),
    queryFn: () => api.getDialARideMember(request!.memberId),
    enabled: !!request?.memberId && request.memberId.length > 0,
  })

  const save = useMutation({
    mutationFn: (r: DialARideRequest) => api.saveDialARideRequest(r),
    onSuccess: (r) => setRequest(r),
  })

  const accept = useMutation({
    mutationFn: () =>
      api.acceptDialARideRequest(request!.id, {
        overrideReason: request!.overrideReason ?? undefined,
      }),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: tKey(['dial-a-ride-requests']) })
      queryClient.invalidateQueries({ queryKey: tKey(['operational-trips']) })
      navigate(`/dial-a-ride/requests/${r.id}`)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not accept request'),
  })

  function patch(p: Partial<DialARideRequest>) {
    if (!request) return
    setRequest({ ...request, ...p })
  }

  async function handleNext() {
    if (!request) return
    setError('')
    const saved = await save.mutateAsync({ ...request, currentStep: Math.min(request.currentStep + 1, 6) })
    setRequest(saved)
  }

  function handleBack() {
    if (!request || request.currentStep <= 1) return
    setRequest({ ...request, currentStep: request.currentStep - 1 })
  }

  if (!request) {
    return <p className="p-6 text-sm text-muted">{error || 'Preparing request…'}</p>
  }

  const step = request.currentStep

  return (
    <div className="space-y-4">
      <div>
        <Link to="/dial-a-ride" className="text-sm font-medium text-command-600 hover:underline">
          ← Back to Dial-a-Ride
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink">New Dial-a-Ride request</h1>
        <p className="text-sm text-ink-soft">Member request — jobs are created when accepted</p>
      </div>

      <DialARideStepper currentStep={step} onStepClick={(s) => s <= step && patch({ currentStep: s })} />

      {step === 1 && <MemberStep request={request} onChange={patch} />}
      {step === 2 && <DarJourneyStep request={request} onChange={patch} />}
      {step === 3 && <DarScheduleStep request={request} onChange={patch} />}
      {step === 4 && <DarRequirementsStep request={request} onChange={patch} />}
      {step === 5 && <ServiceChecksStep request={request} onChange={patch} />}
      {step === 6 && <DarReviewStep request={request} member={member} onChange={patch} />}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {step > 1 && (
          <button type="button" onClick={handleBack} className="rounded-lg border border-border px-4 py-2 text-sm font-medium">
            Back
          </button>
        )}
        {step < 6 && (
          <button type="button" onClick={handleNext} className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700">
            Continue
          </button>
        )}
        {step === 6 && (
          <>
            <button
              type="button"
              onClick={() => save.mutate(request)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
            >
              Save request
            </button>
            <button
              type="button"
              onClick={() => accept.mutate()}
              disabled={accept.isPending || !request.memberId}
              className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
            >
              Accept and create jobs
            </button>
          </>
        )}
      </div>
    </div>
  )
}
