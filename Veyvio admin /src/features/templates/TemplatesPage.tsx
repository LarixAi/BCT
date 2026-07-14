import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'

export function TemplatesPage() {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['message-templates'],
    queryFn: () => api.getMessageTemplates(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Templates</h1>
        <p className="text-sm text-slate-600">Reusable message templates for operations, safety and fleet</p>
      </div>

      <SectionCard title="Message templates" description={`${templates.length} templates`}>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <ul className="space-y-4">
            {templates.map((t) => (
              <li key={t.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-slate-900">{t.name}</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
                    {t.category}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-700">{t.subject}</p>
                <p className="mt-2 text-sm text-slate-600">{t.body}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
