import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import type { StaffHubData } from '@/lib/staff/types'
import { api } from '@/lib/api/client'

export function StaffTeamsTab({ hub }: { hub: StaffHubData }) {
  const { data: profiles = [] } = useQuery({
    queryKey: ['staff-profiles'],
    queryFn: () => api.getStaffProfiles(),
  })

  return (
    <div className="space-y-4">
      <SectionCard title="Teams and departments" description="Organisational structure with team rosters">
        <div className="space-y-4">
          {hub.departments
            .filter((d) => d.staffCount > 0)
            .map((dept) => {
              const members = profiles.filter((p) => p.departmentId === dept.id && p.employmentStatus === 'active')
              return (
                <div key={dept.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{dept.name}</p>
                      {dept.headName && <p className="text-xs text-slate-500">Head: {dept.headName}</p>}
                    </div>
                    <span className="text-sm text-slate-600">{dept.staffCount} staff</span>
                  </div>
                  {dept.teams.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500">Teams: {dept.teams.join(' · ')}</p>
                  )}
                  <ul className="mt-3 space-y-1 text-sm">
                    {members.map((m) => (
                      <li key={m.id} className="flex flex-wrap justify-between gap-2 rounded border border-slate-100 px-2 py-1.5">
                        <Link to={`/staff/${m.id}`} className="font-medium text-command-600 hover:underline">
                          {m.firstName} {m.lastName}
                        </Link>
                        <span className="text-slate-600">{m.jobTitle}{m.team ? ` · ${m.team}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
        </div>
      </SectionCard>
    </div>
  )
}
