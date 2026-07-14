import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import type { StaffDirectoryRow } from '@/lib/staff/types'

export function StaffFormerTab({ former }: { former: StaffDirectoryRow[] }) {
  return (
    <SectionCard title="Former staff" description="Records preserved for audit and operational history">
      {former.length === 0 ? (
        <p className="text-sm text-slate-500">No former staff records.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
              <th className="pb-2 pr-3 font-medium">Name</th>
              <th className="pb-2 pr-3 font-medium">Last role</th>
              <th className="pb-2 font-medium">Depot</th>
            </tr>
          </thead>
          <tbody>
            {former.map((row) => (
              <tr key={row.staffId} className="border-b border-slate-50">
                <td className="py-2.5 pr-3">
                  <Link to={`/staff/${row.staffId}`} className="font-medium text-command-600 hover:underline">
                    {row.firstName} {row.lastName}
                  </Link>
                </td>
                <td className="py-2.5 pr-3">{row.jobTitle}</td>
                <td className="py-2.5">{row.primaryDepotName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  )
}
