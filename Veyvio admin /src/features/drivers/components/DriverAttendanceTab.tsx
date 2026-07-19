import { PersonAttendancePanel } from '@/features/attendance/PersonAttendancePanel'
import type { DriverProfile } from '@/lib/drivers/types'

export function DriverAttendanceTab({ driver }: { driver: DriverProfile }) {
  const name = `${driver.firstName} ${driver.lastName}`.trim()
  return (
    <PersonAttendancePanel
      personId={driver.id}
      personName={name}
      profileHref={`/drivers/${driver.id}`}
    />
  )
}
