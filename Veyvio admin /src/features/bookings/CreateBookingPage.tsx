import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BOOKING_TYPE_OPTIONS } from '@/lib/bookings/constants'
import type { BookingDraft, BookingType } from '@/lib/bookings/types'
import { hasBlockingErrors } from '@/lib/bookings/validation'
import { api } from '@/lib/api/client'
import { BookingStepper, BookingSummaryPanel } from './components/BookingWizardUi'
import { CustomerStep } from './steps/CustomerStep'
import { PassengersStep } from './steps/PassengersStep'
import { JourneyStep } from './steps/JourneyStep'
import { RequirementsStep } from './steps/RequirementsStep'
import { ScheduleStep } from './steps/ScheduleStep'
import { PricingStep } from './steps/PricingStep'
import { DispatchStep } from './steps/DispatchStep'
import { ReviewStep } from './steps/ReviewStep'

export function CreateBookingPage() {
  const [searchParams] = useSearchParams()
  const typeParam = searchParams.get('type') as BookingType | null
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

  const [selectedType, setSelectedType] = useState<BookingType | null>(typeParam)
  const [draft, setDraft] = useState<BookingDraft | null>(null)
  const [error, setError] = useState('')
  const [initializing, setInitializing] = useState(hasEntryParam || !!typeParam)

  const initDraft = useMutation({
    mutationFn: (type: BookingType) => api.createBookingDraft(type),
    onSuccess: (d) => {
      setDraft(d)
      setSelectedType(d.bookingType)
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
          setSelectedType(d.bookingType)
          return
        }
        if (returnFromParam) {
          const d = await api.createReturnBooking(returnFromParam, tripParam ?? '')
          setDraft(d)
          setSelectedType(d.bookingType)
          return
        }
        if (draftIdParam) {
          const d = await api.getBookingDraft(draftIdParam)
          setDraft(d)
          setSelectedType(d.bookingType)
          return
        }
        if (customerParam || passengerParam) {
          const d = await api.createBookingDraft(typeParam ?? 'one_way', {
            customerId: customerParam ?? undefined,
            passengerId: passengerParam ?? undefined,
          })
          setDraft(d)
          setSelectedType(d.bookingType)
          return
        }
        if (typeParam) {
          initDraft.mutate(typeParam)
          return
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load booking draft')
      } finally {
        if (!typeParam || customerParam || passengerParam || duplicateParam || returnFromParam || draftIdParam) {
          setInitializing(false)
        }
      }
    }

    if (hasEntryParam || typeParam) {
      loadDraft()
    }
  }, [draftIdParam, typeParam, customerParam, passengerParam, duplicateParam, returnFromParam, tripParam, draft, hasEntryParam])

  const { data: validation = [] } = useQuery({
    queryKey: ['booking-validation', draft],
    queryFn: () => api.validateBookingDraft(draft!),
    enabled: !!draft,
  })

  const saveDraft = useMutation({
    mutationFn: (d: BookingDraft) => api.saveBookingDraft(d),
    onSuccess: (d) => {
      setDraft(d)
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })

  const confirm = useMutation({
    mutationFn: (opts: { asQuotation?: boolean }) => api.confirmBookingDraft(draft!, opts),
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['duties'] })
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
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['duties'] })
      setDraft(returnDraft)
      setSelectedType(returnDraft.bookingType)
      navigate(`/bookings/new?draft=${returnDraft.id}`)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not confirm booking'),
  })

  function patch(p: Partial<BookingDraft>) {
    if (!draft) return
    setDraft({ ...draft, ...p })
  }

  function goStep(step: number) {
    if (!draft) return
    setDraft({ ...draft, currentStep: step })
  }

  async function handleNext() {
    if (!draft) return
    setError('')
    if (draft.currentStep === 7) {
      const saved = await saveDraft.mutateAsync({ ...draft, currentStep: 8 })
      setDraft(saved)
      return
    }
    if (draft.currentStep < 8) {
      const saved = await saveDraft.mutateAsync({ ...draft, currentStep: draft.currentStep + 1 })
      setDraft(saved)
    }
  }

  function handleBack() {
    if (!draft || draft.currentStep <= 1) return
    setDraft({ ...draft, currentStep: draft.currentStep - 1 })
  }

  if (!selectedType && !hasEntryParam) {
    return <BookingTypeSelect onSelect={(type) => initDraft.mutate(type)} />
  }

  if (!draft || initializing) {
    return <p className="p-6 text-sm text-muted">Preparing booking…</p>
  }

  const step = draft.currentStep
  const canConfirm = !hasBlockingErrors(validation)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/bookings" className="text-sm font-medium text-command-600 hover:underline">
            ← Back to bookings
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Create booking</h1>
          <p className="text-sm text-ink-soft">
            Booking → Trips → Stops — dispatch decides how to deliver it
          </p>
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
          {step === 1 && <CustomerStep draft={draft} onChange={patch} />}
          {step === 2 && <PassengersStep draft={draft} onChange={patch} />}
          {step === 3 && <JourneyStep draft={draft} onChange={patch} />}
          {step === 4 && <RequirementsStep draft={draft} onChange={patch} />}
          {step === 5 && <ScheduleStep draft={draft} onChange={patch} />}
          {step === 6 && <PricingStep draft={draft} onChange={patch} />}
          {step === 7 && <DispatchStep draft={draft} onChange={patch} />}
          {step === 8 && <ReviewStep draft={draft} validation={validation} />}

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

function BookingTypeSelect({ onSelect }: { onSelect: (type: BookingType) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <Link to="/bookings" className="text-sm font-medium text-command-600 hover:underline">
          ← Back to bookings
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Create booking</h1>
        <p className="text-sm text-ink-soft">What type of transport are you booking?</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BOOKING_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className="rounded-xl border border-border bg-surface p-4 text-left transition hover:border-command-400 hover:shadow-sm"
          >
            <p className="font-semibold text-ink">{opt.label}</p>
            <p className="mt-1 text-sm text-ink-soft">{opt.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
