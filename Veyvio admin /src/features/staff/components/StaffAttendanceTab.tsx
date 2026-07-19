import { PersonAttendancePanel } from '@/features/attendance/PersonAttendancePanel'
import type { StaffProfile } from '@/lib/staff/types'

export function StaffAttendanceTab({ staff }: { staff: StaffProfile }) {
  const name = `${staff.firstName} ${staff.lastName}`.trim()
  return (
    <PersonAttendancePanel
      personId={staff.id}
      personName={name}
      profileHref={`/staff/${staff.id}`}
    />
  )
}
