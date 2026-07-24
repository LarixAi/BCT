import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bookingWizardPath } from '@/lib/bookings/booking-type-routes'
import type { BookingType } from '@/lib/bookings/types'
import { BookingTypeSelectPage } from './BookingTypeSelectPage'

export function BookingTypePage() {
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState<BookingType | null>(null)

  function handleContinue() {
    if (!selectedType) return
    navigate(bookingWizardPath(selectedType))
  }

  return (
    <BookingTypeSelectPage
      selectedType={selectedType}
      onSelect={setSelectedType}
      onContinue={handleContinue}
    />
  )
}
