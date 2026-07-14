import { SectionCard } from '@/components/ui'
import { StatusPill, formatDate } from '@/components/ui/status'
import type { DriverProfile } from '@/lib/drivers/types'

export function DriverTrainingTab({ driver }: { driver: DriverProfile }) {
  return (
    <SectionCard title="Training and competency">
      <p className="mb-3 text-xs text-slate-500">
        Requirements are generated from role, vehicle categories, contracts and work permissions.
      </p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
            <th className="pb-2 pr-4">Training</th>
            <th className="pb-2 pr-4">Required for</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2 pr-4">Completed</th>
            <th className="pb-2">Expires</th>
          </tr>
        </thead>
        <tbody>
          {driver.trainingRequirements.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-4 text-slate-500">
                No training requirements for this driver profile.
              </td>
            </tr>
          ) : (
            driver.trainingRequirements.map((t) => (
              <tr key={t.id} className="border-b border-slate-50">
                <td className="py-2.5 pr-4 font-medium">{t.label}</td>
                <td className="py-2.5 pr-4 text-slate-600">{t.requiredFor}</td>
                <td className="py-2.5 pr-4">
                  <StatusPill status={t.status} />
                </td>
                <td className="py-2.5 pr-4 text-slate-600">{formatDate(t.completedAt?.slice(0, 10))}</td>
                <td className="py-2.5 text-slate-600">{formatDate(t.expiresAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </SectionCard>
  )
}
