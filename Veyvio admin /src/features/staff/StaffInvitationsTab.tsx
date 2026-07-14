import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import type { StaffDirectoryRow } from '@/lib/staff/types'

export function StaffInvitationsTab({ invitations }: { invitations: StaffDirectoryRow[] }) {
  return (
    <SectionCard title="Pending invitations" description="Staff who have been added but have not activated their accounts">
      {invitations.length === 0 ? (
        <p className="text-sm text-slate-500">No pending invitations.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
              <th className="pb-2 pr-3 font-medium">Staff member</th>
              <th className="pb-2 pr-3 font-medium">Role</th>
              <th className="pb-2 pr-3 font-medium">Depot</th>
              <th className="pb-2 pr-3 font-medium">Invitation</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((row) => (
              <tr key={row.staffId} className="border-b border-slate-50">
                <td className="py-2.5 pr-3">
                  <Link to={`/staff/${row.staffId}?tab=Account`} className="font-medium text-command-600 hover:underline">
                    {row.firstName} {row.lastName}
                  </Link>
                </td>
                <td className="py-2.5 pr-3">{row.roleLabel}</td>
                <td className="py-2.5 pr-3">{row.primaryDepotName}</td>
                <td className="py-2.5 pr-3"><StatusPill status={row.invitationStatus} /></td>
                <td className="py-2.5">
                  <Link to={`/staff/${row.staffId}?tab=Account`} className="text-xs font-medium text-command-600 hover:underline">
                    Manage invitation
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  )
}
