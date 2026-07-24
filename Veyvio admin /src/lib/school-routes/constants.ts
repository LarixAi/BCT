export const SCHOOL_ROUTE_STEPS = [
  { id: 1, key: 'school', label: 'School' },
  { id: 2, key: 'term', label: 'Term' },
  { id: 3, key: 'direction', label: 'Direction' },
  { id: 4, key: 'pupils', label: 'Pupils' },
  { id: 5, key: 'stops', label: 'Stops' },
  { id: 6, key: 'crew', label: 'Crew' },
  { id: 7, key: 'safeguarding', label: 'Safeguarding' },
  { id: 8, key: 'review', label: 'Review' },
] as const

export const SCHOOL_ROUTE_TABS = [
  { id: 'routes', label: 'Routes' },
  { id: 'today', label: 'Today' },
  { id: 'pupils', label: 'Pupils' },
  { id: 'schools', label: 'Schools' },
  { id: 'terms', label: 'Terms' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'exceptions', label: 'Exceptions' },
] as const

export const WEEKDAYS = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
] as const

export const ROLLING_GENERATION_WEEKS = 8
