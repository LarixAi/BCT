/**
 * Veyvio operational terminology — these terms are NOT interchangeable.
 * @see product spec: Booking → Journey → Job → Trip → Run → Duty
 */

export const VEYVIO_TERMS = {
  booking: {
    term: 'Booking',
    definition: 'The customer’s commercial transport request.',
    example: 'School asks for daily transport for 12 pupils',
  },
  journey: {
    term: 'Journey',
    definition: 'One passenger movement from origin to destination.',
    example: 'Home to school',
  },
  job: {
    term: 'Job',
    definition: 'A specific piece of operational work.',
    example: 'Pick up Sarah at 07:45 and take her to school',
  },
  trip: {
    term: 'Trip',
    definition: 'The driver-facing work package containing one or more jobs.',
    example: 'Driver completes three pickups and one school drop-off',
  },
  run: {
    term: 'Run',
    definition: 'A planned sequence of trips, normally connected to a route, contract, or shift.',
    example: 'Monday AM School Run',
  },
  duty: {
    term: 'Duty',
    definition: 'Everything assigned to a driver during their working period.',
    example: 'Vehicle check, AM run, break, PM run and depot return',
  },
} as const

/** UI/API label for DutyRecord — shown as "Run" in navigation */
export const DUTY_UI_LABEL = 'Run'

/** Route stop pages under /trips are operational stops, not commercial BookingTrips */
export const ROUTE_STOP_UI_LABEL = 'Stop'
