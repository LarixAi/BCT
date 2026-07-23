import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'
import type { TransferNotificationStatus } from '@/lib/transfers/types'

const STATUS_LABEL: Record<TransferNotificationStatus['status'], string> = {
  pending: 'Pending',
  sent: 'Sent',
  delivered: 'Delivered',
  opened: 'Opened',
  acknowledged: 'Acknowledged',
  rejected: 'Rejected',
  failed: 'Failed',
  offline: 'Driver offline',
}

const CHANNEL_LABEL: Record<TransferNotificationStatus['channel'], string> = {
  driver_original: 'Original driver',
  driver_receiving: 'Receiving driver',
  passenger: 'Passenger / parent',
  customer: 'Customer',
  operations: 'Operations',
}

export function TransferNotificationPanel({ tripId }: { tripId: string }) {
  const { data: transfers = [] } = useQuery({
    queryKey: ['transfer-history', tripId],
    queryFn: () => api.getTransferHistory(tripId),
  })

  const latest = transfers[0]
  if (!latest?.notifications.length) return null

  return (
    <SectionCard title="Driver notification tracking" description="Delivery and acknowledgement status">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase text-muted">
            <th className="pb-2 pr-3 font-medium">Recipient</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {latest.notifications.map((n) => (
            <tr key={n.channel} className="border-b border-border/60 last:border-0">
              <td className="py-2 pr-3">{CHANNEL_LABEL[n.channel]}</td>
              <td className="py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    n.status === 'acknowledged'
                      ? 'bg-emerald-100 text-emerald-800'
                      : n.status === 'failed' || n.status === 'rejected' || n.status === 'offline'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-surface-muted text-ink-soft'
                  }`}
                >
                  {STATUS_LABEL[n.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  )
}
