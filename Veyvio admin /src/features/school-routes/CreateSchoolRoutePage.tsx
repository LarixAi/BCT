import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SchoolRouteStepper } from './components/SchoolRouteWizardUi'
import {
  CrewStep,
  DirectionStep,
  PupilsStep,
  SafeguardingStep,
  SchoolReviewStep,
  SchoolStep,
  StopsStep,
  TermStep,
} from './school-route-steps'
import { countJobsToGenerate } from '@/lib/school-routes/job-generation'
import type { SchoolRoute } from '@/lib/school-routes/types'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function CreateSchoolRoutePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [route, setRoute] = useState<SchoolRoute | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (route) return
    api.createSchoolRouteDraft().then(setRoute).catch((e) => setError(e instanceof Error ? e.message : 'Could not start route'))
  }, [route])

  const save = useMutation({
    mutationFn: (r: SchoolRoute) => api.saveSchoolRoute(r),
    onSuccess: (r) => setRoute(r),
  })

  const publish = useMutation({
    mutationFn: () => api.publishSchoolRoute(route!.id),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: tKey(['school-routes']) })
      queryClient.invalidateQueries({ queryKey: tKey(['operational-trips']) })
      navigate(`/school-routes/${r.id}`)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not publish route'),
  })

  function patch(p: Partial<SchoolRoute>) {
    if (!route) return
    setRoute({ ...route, ...p })
  }

  async function handleNext() {
    if (!route) return
    setError('')
    const saved = await save.mutateAsync({ ...route, currentStep: Math.min(route.currentStep + 1, 8) })
    setRoute(saved)
  }

  if (!route) {
    return <p className="p-6 text-sm text-muted">{error || 'Preparing school route…'}</p>
  }

  const step = route.currentStep
  const jobCount = countJobsToGenerate(route)

  return (
    <div className="space-y-4">
      <div>
        <Link to="/school-routes" className="text-sm font-medium text-command-600 hover:underline">← School Routes</Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Create school route</h1>
      </div>
      <SchoolRouteStepper currentStep={step} onStepClick={(s) => s <= step && patch({ currentStep: s })} />
      {step === 1 && <SchoolStep route={route} onChange={patch} />}
      {step === 2 && <TermStep route={route} onChange={patch} />}
      {step === 3 && <DirectionStep route={route} onChange={patch} />}
      {step === 4 && <PupilsStep route={route} onChange={patch} />}
      {step === 5 && <StopsStep route={route} onChange={patch} />}
      {step === 6 && <CrewStep route={route} onChange={patch} />}
      {step === 7 && <SafeguardingStep route={route} onChange={patch} />}
      {step === 8 && <SchoolReviewStep route={route} jobCount={jobCount} />}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {step > 1 && (
          <button type="button" onClick={() => patch({ currentStep: step - 1 })} className="rounded-lg border border-border px-4 py-2 text-sm font-medium">Back</button>
        )}
        {step < 8 && (
          <button type="button" onClick={handleNext} className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700">Continue</button>
        )}
        {step === 8 && (
          <>
            <button type="button" onClick={() => save.mutate(route)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium">Save draft</button>
            <button type="button" onClick={() => publish.mutate()} disabled={publish.isPending} className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50">
              Publish route
            </button>
          </>
        )}
      </div>
    </div>
  )
}
