import { describe, expect, it } from 'vitest'
import { inferBookingCustomer } from './resolve-booking-customer'

describe('inferBookingCustomer', () => {
  const customers = [
    { id: 'cust-real-1', name: 'Metro Schools', status: 'active' },
    { id: 'cust-real-2', name: 'Riverside Care', status: 'active' },
  ]

  const passengers = [
    { id: 'pax-a', firstName: 'Amelia', lastName: 'Clarke', customerId: 'cust-real-1', customerName: 'Metro Schools' },
    { id: 'pax-b', firstName: 'Noah', lastName: 'Patel', customerId: 'cust-real-1', customerName: 'Metro Schools' },
    { id: 'pax-c', firstName: 'George', lastName: 'Lee', customerId: 'cust-real-2', customerName: 'Riverside Care' },
  ]

  it('returns null when customer already set', () => {
    expect(
      inferBookingCustomer(
        { customerId: 'cust-real-1', passengers: [{ passengerId: 'pax-a', firstName: 'A', lastName: 'B', requirements: [] }] },
        passengers,
        customers,
      ),
    ).toBeNull()
  })

  it('infers customer from shared passenger customerId', () => {
    expect(
      inferBookingCustomer(
        {
          customerId: null,
          passengers: [
            { passengerId: 'pax-a', firstName: 'Amelia', lastName: 'Clarke', requirements: [] },
            { passengerId: 'pax-b', firstName: 'Noah', lastName: 'Patel', requirements: [] },
          ],
        },
        passengers,
        customers,
      ),
    ).toEqual({ customerId: 'cust-real-1', customerName: 'Metro Schools' })
  })

  it('infers customer from shared passenger customerName when id missing', () => {
    expect(
      inferBookingCustomer(
        {
          customerId: null,
          passengers: [{ passengerId: 'pax-c', firstName: 'George', lastName: 'Lee', requirements: [] }],
        },
        [{ id: 'pax-c', firstName: 'George', lastName: 'Lee', customerName: 'Riverside Care' }],
        customers,
      ),
    ).toEqual({ customerId: 'cust-real-2', customerName: 'Riverside Care' })
  })
})
