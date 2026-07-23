import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import {
  COMPANY_PMI_TEMPLATE,
  checklistProgress,
  isPmiChecklistComplete,
  pmiChecklistCompletionBlockers,
  type PmiEvidenceKind,
  type PmiItemResult,
} from '@/lib/maintenance/pmi-checklist'
import type { InspectionRecord } from '@/lib/inspections/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

const RESULT_OPTIONS: { id: PmiItemResult; label: string }[] = [
  { id: 'pass', label: 'Pass' },
  { id: 'fail', label: 'Fail' },
  { id: 'advisory', label: 'Advisory' },
  { id: 'na', label: 'N/A' },
  { id: 'unchecked', label: 'Unchecked' },
]

const EVIDENCE_OPTIONS: { id: PmiEvidenceKind; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'note', label: 'Note only' },
  { id: 'photo', label: 'Photo' },
  { id: 'brake_print', label: 'Brake performance print' },
  { id: 'document', label: 'Document' },
]

export function InspectionChecklistPanel({ inspection }: { inspection: InspectionRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const checklist = inspection.checklist
  const [inspectorName, setInspectorName] = useState(checklist?.inspectorName ?? actorName)
  const [activeId, setActiveId] = useState(COMPANY_PMI_TEMPLATE.items[0]?.id ?? '')

  const progress = useMemo(() => checklistProgress(checklist), [checklist])
  const blockers = useMemo(() => pmiChecklistCompletionBlockers(checklist), [checklist])
  const complete = isPmiChecklistComplete(checklist)

  const sections = useMemo(() => {
    const map = new Map<string, typeof COMPANY_PMI_TEMPLATE.items>()
    for (const item of COMPANY_PMI_TEMPLATE.items) {
      const list = map.get(item.section) ?? []
      list.push(item)
      map.set(item.section, list)
    }
    return [...map.entries()]
  }, [])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inspection', inspection.id] })
    queryClient.invalidateQueries({ queryKey: ['inspections-hub'] })
  }

  const updateItem = useMutation({
    mutationFn: (input: {
      templateItemId: string
      result?: PmiItemResult
      notes?: string | null
      evidenceKind?: PmiEvidenceKind
      evidenceFileName?: string | null
      inspectorName?: string
    }) => api.updateInspectionChecklistItem(inspection.id, input, actorName),
    onSuccess: invalidate,
  })

  const completeChecklist = useMutation({
    mutationFn: () => api.completeInspectionChecklist(inspection.id),
    onSuccess: invalidate,
  })

  if (!checklist) {
    return (
      <SectionCard title="Inspection checklist" description="Safety Inspection (PMI) digital checklist">
        <p className="text-sm text-ink-soft">Start the inspection to open the company PMI checklist.</p>
      </SectionCard>
    )
  }

  const activeTemplate = COMPANY_PMI_TEMPLATE.items.find((i) => i.id === activeId)
  const activeResult = checklist.items.find((i) => i.templateItemId === activeId)

  return (
    <SectionCard
      title="Inspection checklist"
      description={`${COMPANY_PMI_TEMPLATE.name} · ${progress.answered}/${progress.total} recorded`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="text-sm">
          <span className="mr-2 text-ink-soft">Inspector</span>
          <input
            value={inspectorName}
            onChange={(e) => setInspectorName(e.target.value)}
            onBlur={() =>
              updateItem.mutate({
                templateItemId: activeId,
                inspectorName,
              })
            }
            className="rounded-lg border border-border px-2 py-1"
          />
        </label>
        <StatusPill status={complete ? 'compliant' : 'warning'} />
        <span className="text-xs text-muted">
          {progress.failed} fail · {progress.advisory} advisory
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <ul className="max-h-80 space-y-1 overflow-y-auto text-sm">
          {sections.map(([section, items]) => (
            <li key={section}>
              <p className="mb-1 text-xs font-semibold uppercase text-muted">{section}</p>
              <ul className="mb-2 space-y-0.5">
                {items.map((item) => {
                  const result = checklist.items.find((i) => i.templateItemId === item.id)?.result
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(item.id)}
                        className={`w-full rounded px-2 py-1 text-left ${
                          activeId === item.id ? 'bg-command-50 text-command-800' : 'hover:bg-surface-muted'
                        }`}
                      >
                        <span className="mr-1 text-[10px] uppercase text-muted">{result ?? '—'}</span>
                        {item.label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>

        {activeTemplate && activeResult && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <h3 className="font-medium text-ink">{activeTemplate.label}</h3>
            {activeTemplate.helpText && <p className="text-xs text-muted">{activeTemplate.helpText}</p>}
            <div className="flex flex-wrap gap-2">
              {RESULT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    updateItem.mutate({
                      templateItemId: activeTemplate.id,
                      result: opt.id,
                      inspectorName,
                    })
                  }
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    activeResult.result === opt.id
                      ? 'border-command-500 bg-command-50 text-command-800'
                      : 'border-border text-ink-soft'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-soft">Notes</span>
              <textarea
                defaultValue={activeResult.notes ?? ''}
                key={`${activeTemplate.id}-notes`}
                onBlur={(e) =>
                  updateItem.mutate({
                    templateItemId: activeTemplate.id,
                    notes: e.target.value || null,
                    inspectorName,
                  })
                }
                rows={2}
                className="w-full rounded-lg border border-border px-2 py-1"
              />
            </label>
            {activeTemplate.requiresBrakeEvidence && (
              <label className="block text-sm">
                <span className="mb-1 block text-ink-soft">Evidence</span>
                <select
                  value={activeResult.evidence.kind}
                  onChange={(e) =>
                    updateItem.mutate({
                      templateItemId: activeTemplate.id,
                      evidenceKind: e.target.value as PmiEvidenceKind,
                      evidenceFileName:
                        e.target.value === 'brake_print' || e.target.value === 'document' || e.target.value === 'photo'
                          ? `evidence-${activeTemplate.id}.pdf`
                          : null,
                      inspectorName,
                    })
                  }
                  className="w-full rounded-lg border border-border px-2 py-1"
                >
                  {EVIDENCE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
      </div>

      {blockers.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-800">
          {blockers.slice(0, 6).map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}

      {complete && inspection.status === 'in_progress' && (
        <button
          type="button"
          onClick={() => completeChecklist.mutate()}
          disabled={completeChecklist.isPending}
          className="mt-3 rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-60"
        >
          Mark checklist complete
        </button>
      )}
    </SectionCard>
  )
}
