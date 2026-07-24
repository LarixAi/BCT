import { useEffect, useRef, useState } from 'react'
import type { BookingDraft } from '@/lib/bookings/types'

export type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useBookingDraftAutosave(
  draft: BookingDraft | null,
  saveDraft: (draft: BookingDraft) => Promise<BookingDraft>,
) {
  const [status, setStatus] = useState<DraftSaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')
  const saveRef = useRef(saveDraft)
  saveRef.current = saveDraft

  useEffect(() => {
    if (!draft?.id) return

    const snapshot = JSON.stringify(draft)
    if (snapshot === lastSavedRef.current) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setStatus('saving')
      saveRef
        .current(draft)
        .then((saved) => {
          lastSavedRef.current = JSON.stringify(saved)
          setStatus('saved')
        })
        .catch(() => setStatus('error'))
    }, 2000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [draft])

  return status
}

export function draftSaveStatusLabel(status: DraftSaveStatus): string {
  switch (status) {
    case 'saving':
      return 'Saving draft…'
    case 'saved':
      return 'Draft saved'
    case 'error':
      return 'Could not save draft'
    default:
      return ''
  }
}
