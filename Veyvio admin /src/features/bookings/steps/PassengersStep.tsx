import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import type { BookingDraft } from '@/lib/bookings/types'
import { api } from '@/lib/api/client'
import { enrichPassenger } from '@/lib/bookings/passenger'

export function PassengersStep({
  draft,
  onChange,
}: {
  draft: BookingDraft
  onChange: (patch: Partial<BookingDraft>) => void
}) {
  const { data: passengers = [] } = useQuery({
    queryKey: ['passengers'],
    queryFn: () => api.getPassengers(),
  })

  function togglePassenger(id: string) {
    const exists = draft.passengers.find((p) => p.passengerId === id)
    if (exists) {
      onChange({ passengers: draft.passengers.filter((p) => p.passengerId !== id) })
      return
    }
    const record = passengers.find((p) => p.id === id)
    if (!record) return
    onChange({ passengers: [...draft.passengers, enrichPassenger(record)] })
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Add passengers" description="Operational summaries only — full profiles stay restricted">
        <ul className="divide-y divide-slate-100">
          {passengers.map((p) => {
            const selected = draft.passengers.find((x) => x.passengerId === p.id)
            return (
              <li key={p.id} className="py-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={!!selected}
                    onChange={() => togglePassenger(p.id)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {p.firstName} {p.lastName}
                    </p>
                    {selected ? (
                      <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">
                        <p className="text-xs font-semibold uppercase text-slate-500">Requirements</p>
                        <ul className="mt-1 list-inside list-disc text-slate-700">
                          {selected.requirements.map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">{p.routeName ?? p.customerName}</p>
                    )}
                  </div>
                </label>
              </li>
            )
          })}
        </ul>
      </SectionCard>
    </div>
  )
}
