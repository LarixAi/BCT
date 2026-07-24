import { CreateBookingPage } from './CreateBookingPage'

/** All new bookings open the unified wizard — journey is step 1, not a separate type picker. */
export function BookingNewEntry() {
  return <CreateBookingPage />
}
