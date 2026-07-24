import type { CustomerRecord, PassengerRecord } from '@/lib/api/types'
import type { BookingDraft } from './types'

export function inferBookingCustomer(
  draft: Pick<BookingDraft, 'customerId' | 'passengers'>,
  passengerCatalog: PassengerRecord[],
  customers: CustomerRecord[],
): Partial<BookingDraft> | null {
  if (draft.customerId) return null

  const selectedIds = new Set(draft.passengers.map((p) => p.passengerId))
  const selectedRecords = passengerCatalog.filter((p) => selectedIds.has(p.id))
  if (selectedRecords.length === 0) return null

  const customerIds = new Set(
    selectedRecords.map((p) => p.customerId).filter((id): id is string => Boolean(id)),
  )
  if (customerIds.size === 1) {
    const id = [...customerIds][0]!
    const customer = customers.find((c) => c.id === id)
    return { customerId: id, customerName: customer?.name ?? null }
  }

  const names = new Set(
    selectedRecords.map((p) => p.customerName?.trim()).filter((name): name is string => Boolean(name)),
  )
  if (names.size === 1) {
    const name = [...names][0]!
    const customer = customers.find((c) => c.name.localeCompare(name, undefined, { sensitivity: 'accent' }) === 0)
    if (customer) return { customerId: customer.id, customerName: customer.name }
  }

  return null
}
