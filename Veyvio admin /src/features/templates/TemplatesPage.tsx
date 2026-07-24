import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function TemplatesPage() {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: tKey(['message-templates']),
    queryFn: () => api.getMessageTemplates(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Templates</h1>
        <p className="text-sm text-ink-soft">Reusable message templates for operations, safety and fleet</p>
      </div>

      <SectionCard title="Message templates" description={`${templates.length} templates`}>
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <ul className="space-y-4">
            {templates.map((t) => (
              <li key={t.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-ink">{t.name}</h2>
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs capitalize text-ink-soft">
                    {t.category}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-ink-soft">{t.subject}</p>
                <p className="mt-2 text-sm text-ink-soft">{t.body}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
