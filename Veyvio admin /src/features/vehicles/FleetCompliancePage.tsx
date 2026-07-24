import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { expiryTone, formatDate } from '@/components/ui/status'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function FleetCompliancePage() {
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: tKey(['vehicle-profiles']),
    queryFn: () => api.getVehicleProfiles(),
  })

  const items = vehicles.flatMap((v) => {
    const entries = [
      { vehicle: v, label: 'MOT', date: v.motExpiry },
      { vehicle: v, label: 'Insurance', date: v.insuranceExpiry },
      { vehicle: v, label: 'Tax', date: v.taxExpiry },
      { vehicle: v, label: 'Tachograph', date: v.tachographCalibrationExpiry },
    ].filter((e) => e.date)
    return entries
  }).sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())

  return (
    <div className="space-y-6">
      <div>
        <Link to="/vehicles" className="text-sm font-medium text-command-600 hover:underline">← Back to vehicles</Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Compliance calendar</h1>
        <p className="text-sm text-ink-soft">Fleet-wide certificate and test expiry timeline</p>
      </div>

      <SectionCard title="Upcoming expiries">
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted">
                <th className="pb-2 pr-4">Vehicle</th>
                <th className="pb-2 pr-4">Requirement</th>
                <th className="pb-2 pr-4">Expiry</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const tone = expiryTone(item.date)
                return (
                  <tr key={`${item.vehicle.id}-${item.label}-${i}`} className="border-b border-border/60">
                    <td className="py-2 pr-4">
                      <Link to={`/vehicles/${item.vehicle.id}`} className="font-medium text-command-600 hover:underline">
                        {item.vehicle.registrationNumber}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{item.label}</td>
                    <td className={`py-2 pr-4 ${tone === 'expired' ? 'text-red-700' : tone === 'warning' ? 'text-amber-700' : ''}`}>
                      {formatDate(item.date)}
                    </td>
                    <td className="py-2 capitalize">{tone ?? 'valid'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  )
}
