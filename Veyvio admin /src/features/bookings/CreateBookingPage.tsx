import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BookingDraft, BookingType } from '@/lib/bookings/types'
import { hasBlockingErrors } from '@/lib/bookings/validation'
import { api } from '@/lib/api/client'
import { BookingStepper, BookingSummaryPanel } from './components/BookingWizardUi'
import { JourneyStructureStep } from './steps/JourneyStructureStep'
import { CustomerStep } from './steps/CustomerStep'
import { PassengersStep } from './steps/PassengersStep'
import { JourneyStep } from './steps/JourneyStep'
import { ScheduleStep } from './steps/ScheduleStep'
import { RequirementsStep } from './steps/RequirementsStep'
import { PricingStep } from './steps/PricingStep'
import { ReviewStep } from './steps/ReviewStep'
import { draftSaveStatusLabel, useBookingDraftAutosave } from './useBookingDraftAutosave'
import { inferBookingCustomer } from '@/lib/bookings/resolve-booking-customer'
import { tKey } from '@/lib/tenant/tenant-query-scope'


function stepContinueError(step: number, draft: BookingDraft): string | null {
  if (step === 2 && !draft.customerId) return 'Select a customer before continuing.'
  if (step === 3 && draft.passengers.length === 0) return 'Add at least one passenger before continuing.'
  return null
}

export function CreateBookingPage() {
  const [searchParams] = useSearchParams()
  const journeyParam = searchParams.get('journey') as BookingType | null
  const typeParam = (searchParams.get('type') as BookingType | null) ?? journeyParam ?? 'one_way'
  const draftIdParam = searchParams.get('draft')
  const customerParam = searchParams.get('customer')
  const passengerParam = searchParams.get('passenger')
  const duplicateParam = searchParams.get('duplicate')
  const returnFromParam = searchParams.get('returnFrom')
  const tripParam = searchParams.get('trip')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const hasEntryParam =
    !!draftIdParam || !!customerParam || !!passengerParam || !!duplicateParam || !!returnFromParam

  const [draft, setDraft] = useState<BookingDraft | null>(null)
  const draftRef = useRef<BookingDraft | null>(null)
  const [error, setError] = useState('')
  const [initializing, setInitializing] = useState(true)

  const initDraft = useMutation({
    mutationFn: (type: BookingType) => api.createBookingDraft(type),
    onSuccess: (d) => {
      setDraft(d)
      setInitializing(false)
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : 'Could not create draft')
      setInitializing(false)
    },
  })

  useEffect(() => {
    if (draft) return

    async function loadDraft() {
      setInitializing(true)
      setError('')
      try {
        if (duplicateParam) {
          const d = await api.duplicateBooking(duplicateParam)
          setDraft(d)
          return
        }
        if (returnFromParam) {
          const d = await api.createReturnBooking(returnFromParam, tripParam ?? '')
          setDraft(d)
          return
        }
        if (draftIdParam) {
          const d = await api.getBookingDraft(draftIdParam)
          setDraft(d)
          return
        }
        if (customerParam || passengerParam) {
          const d = await api.createBookingDraft(typeParam ?? 'one_way', {
            customerId: customerParam ?? undefined,
            passengerId: passengerParam ?? undefined,
          })
          setDraft(d)
          return
        }
        initDraft.mutate(typeParam ?? 'one_way')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load booking draft')
        setInitializing(false)
      } finally {
        if (duplicateParam || returnFromParam || draftIdParam || customerParam || passengerParam) {
          setInitializing(false)
        }
      }
    }

    loadDraft()
  }, [
    draftIdParam,
    typeParam,
    customerParam,
    passengerParam,
    duplicateParam,
    returnFromParam,
    tripParam,
    draft,
    hasEntryParam,
    typeParam,
  ])

  const { data: validation = [] } = useQuery({
    queryKey: tKey(['booking-validation', draft]),
    queryFn: () => api.validateBookingDraft(draft!),
    enabled: !!draft,
  })

  const { data: passengerCatalog = [] } = useQuery({
    queryKey: tKey(['passengers']),
    queryFn: () => api.getPassengers(),
    enabled: !!draft,
  })

  const { data: customerCatalog = [] } = useQuery({
    queryKey: tKey(['customers']),
    queryFn: () => api.getCustomers(),
    enabled: !!draft,
  })

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    if (!draft || draft.customerId || draft.passengers.length === 0) return
    const inferred = inferBookingCustomer(draft, passengerCatalog, customerCatalog)
    if (!inferred) return
    setDraft((current) => (current ? { ...current, ...inferred } : current))
  }, [draft, passengerCatalog, customerCatalog])

  const saveDraft = useMutation({
    mutationFn: (d: BookingDraft) => api.saveBookingDraft(d),
    onSuccess: (d) => {
      setDraft(d)
      queryClient.invalidateQueries({ queryKey: tKey(['bookings']) })
    },
  })

  const persistDraft = useCallback((d: BookingDraft) => saveDraft.mutateAsync(d), [saveDraft])
  const autosaveStatus = useBookingDraftAutosave(draft, persistDraft)

  const confirm = useMutation({
    mutationFn: (opts: { asQuotation?: boolean }) => api.confirmBookingDraft(draft!, opts),
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: tKey(['bookings']) })
      queryClient.invalidateQueries({ queryKey: tKey(['duties']) })
      navigate(`/bookings/${record.id}`)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not confirm booking'),
  })

  const confirmWithReturn = useMutation({
    mutationFn: async () => {
      const record = await api.confirmBookingDraft(draft!, {})
      const returnDraft = await api.createReturnBooking(record.id, record.trips[0]?.id ?? '')
      return returnDraft
    },
    onSuccess: (returnDraft) => {
      queryClient.invalidateQueries({ queryKey: tKey(['bookings']) })
      queryClient.invalidateQueries({ queryKey: tKey(['duties']) })
      setDraft(returnDraft)
      navigate(`/bookings/new?draft=${returnDraft.id}`)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not confirm booking'),
  })

  function patch(p: Partial<BookingDraft>) {
    setDraft((current) => {
      if (!current) return current
      const next = { ...current, ...p }
      draftRef.current = next
      return next
    })
  }

  function goStep(step: number) {
    if (!draft) return
    setDraft({ ...draft, currentStep: step })
  }

  async function handleNext() {
    const current = draftRef.current
    if (!current) return
    setError('')
    const stepError = stepContinueError(current.currentStep, current)
    if (stepError) {
      setError(stepError)
      return
    }
    if (current.currentStep === 7) {
      const saved = await saveDraft.mutateAsync({ ...current, currentStep: 8 })
      setDraft(saved)
      draftRef.current = saved
      return
    }
    if (current.currentStep < 8) {
      const saved = await saveDraft.mutateAsync({ ...current, currentStep: current.currentStep + 1 })
      setDraft(saved)
      draftRef.current = saved
    }
  }

  function handleBack() {
    if (!draft || draft.currentStep <= 1) return
    setDraft({ ...draft, currentStep: draft.currentStep - 1 })
  }

  if (!draft || initializing) {
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm text-muted">Preparing booking…</p>
        {error && (
          <div className="max-w-lg space-y-3">
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
            <Link to="/bookings/new" className="text-sm font-medium text-command-600 hover:underline">
              ← Back to booking type
            </Link>
          </div>
        )}
      </div>
    )
  }

  const step = draft.currentStep
  const canConfirm = !hasBlockingErrors(validation)
  const autosaveLabel = draftSaveStatusLabel(autosaveStatus)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/bookings" className="text-sm font-medium text-command-600 hover:underline">
            ← Back to bookings
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Create booking</h1>
          <p className="text-sm text-ink-soft">
            Journey → Jobs → Trips — dispatch decides how to deliver it
          </p>
          {autosaveLabel && <p className="mt-1 text-xs text-muted">{autosaveLabel}</p>}
        </div>
        <button
          type="button"
          onClick={() => saveDraft.mutate(draft)}
          disabled={saveDraft.isPending}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-muted"
        >
          Save draft
        </button>
      </div>

      <BookingStepper currentStep={step} onStepClick={(s) => s <= step && goStep(s)} />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          {step === 1 && <JourneyStructureStep draft={draft} onChange={patch} />}
          {step === 2 && <CustomerStep draft={draft} onChange={patch} />}
          {step === 3 && <PassengersStep draft={draft} onChange={patch} />}
          {step === 4 && <JourneyStep draft={draft} onChange={patch} />}
          {step === 5 && <ScheduleStep draft={draft} onChange={patch} />}
          {step === 6 && <RequirementsStep draft={draft} onChange={patch} />}
          {step === 7 && <PricingStep draft={draft} onChange={patch} />}
          {step === 8 && <ReviewStep draft={draft} validation={validation} onChange={patch} />}

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {step > 1 && (
              <button type="button" onClick={handleBack} className="rounded-lg border border-border px-4 py-2 text-sm font-medium">
                Back
              </button>
            )}
            {step < 8 && (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700"
              >
                Continue
              </button>
            )}
            {step === 8 && (
              <>
                <button
                  type="button"
                  onClick={() => confirm.mutate({ asQuotation: true })}
                  disabled={confirm.isPending}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
                >
                  Create quote
                </button>
                <button
                  type="button"
                  onClick={() => confirm.mutate({})}
                  disabled={confirm.isPending || !canConfirm}
                  className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
                >
                  Confirm booking
                </button>
                {(draft.bookingType === 'return' || draft.bookingType === 'one_way') && (
                  <button
                    type="button"
                    onClick={() => confirmWithReturn.mutate()}
                    disabled={confirmWithReturn.isPending || !canConfirm}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    Confirm & create return
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <BookingSummaryPanel draft={draft} validation={validation} />
      </div>
    </div>
  )
}
