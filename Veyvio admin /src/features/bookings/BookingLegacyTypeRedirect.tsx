import { Navigate, useParams } from 'react-router-dom'
import { bookingTypeFromSlug } from '@/lib/bookings/booking-type-routes'

/** Legacy booking-type URLs redirect to the unified create booking wizard. */
export function BookingLegacyTypeRedirect() {
  const { bookingType } = useParams<{ bookingType: string }>()
  if (bookingType === 'urgent' || bookingType === 'emergency') {
    return <Navigate to="/bookings/new/urgent" replace />
  }
  const type = bookingTypeFromSlug(bookingType)
  if (!type) return <Navigate to="/bookings/new" replace />
  return <Navigate to={`/bookings/new?journey=${type}`} replace />
}
