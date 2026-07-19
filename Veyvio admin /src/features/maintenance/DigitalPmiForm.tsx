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
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import type { MaintenanceWorkOrder, VehicleProfile } from '@/lib/vehicles/types'

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

export function DigitalPmiForm({
  vehicle,
  workOrder,
  onClose,
}: {
  vehicle: VehicleProfile
  workOrder: MaintenanceWorkOrder
  onClose?: () => void
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const checklist = workOrder.pmiChecklist
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
    queryClient.invalidateQueries({ queryKey: ['maintenance-hub'] })
    queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
    queryClient.invalidateQueries({ queryKey: ['vehicle-profile', vehicle.id] })
  }

  const saveItem = useMutation({
    mutationFn: (input: {
      templateItemId: string
      result?: PmiItemResult
      notes?: string | null
      evidenceKind?: PmiEvidenceKind
      evidenceNote?: string | null
      evidenceFileName?: string | null
      inspectorName?: string | null
    }) => api.updateVehiclePmiChecklistItem(vehicle.id, workOrder.id, input, actorName),
    onSuccess: invalidate,
  })

  const completeWo = useMutation({
    mutationFn: () =>
      api.updateVehicleWorkOrder(vehicle.id, workOrder.id, { status: 'completed' }, actorName),
    onSuccess: () => {
      invalidate()
      onClose?.()
    },
  })

  if (!checklist) {
    return (
      <SectionCard title="Digital PMI" description="Checklist not initialised on this work order">
        <p className="text-sm text-slate-600">Create or open a PMI work order to start the digital form.</p>
      </SectionCard>
    )
  }

  const activeTemplate = COMPANY_PMI_TEMPLATE.items.find((i) => i.id === activeId)
  const activeResult = checklist.items.find((i) => i.templateItemId === activeId)

  return (
    <SectionCard
      title={`Digital PMI — ${vehicle.registrationNumber}`}
      description={`${checklist.templateName} · WO ${workOrder.id}`}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <StatusPill status={complete ? 'pass' : workOrder.status} />
        <span className="tabular-nums text-slate-700">
          {progress.answered}/{progress.total} items · {progress.failed} fail · {progress.advisory} advisory
        </span>
        {onClose && (
          <button type="button" onClick={onClose} className="ml-auto text-xs font-medium text-slate-600 hover:underline">
            Close form
          </button>
        )}
      </div>

      <label className="mb-4 block max-w-md text-sm">
        <span className="text-slate-600">Inspector name</span>
        <input
          value={inspectorName}
          onChange={(e) => setInspectorName(e.target.value)}
          onBlur={() => {
            if (inspectorName !== checklist.inspectorName) {
              saveItem.mutate({
                templateItemId: activeId || COMPANY_PMI_TEMPLATE.items[0]!.id,
                inspectorName,
              })
            }
          }}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
        />
      </label>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <nav className="space-y-3 text-sm">
          {sections.map(([section, items]) => (
            <div key={section}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{section}</p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const row = checklist.items.find((i) => i.templateItemId === item.id)
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(item.id)}
                        className={`w-full rounded-md px-2 py-1.5 text-left ${
                          activeId === item.id ? 'bg-command-50 text-command-800 ring-1 ring-command-500' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className="block truncate">{item.label}</span>
                        <span className="text-[11px] text-slate-500">{row?.result ?? 'unchecked'}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {activeTemplate && activeResult && (
          <div className="space-y-3 rounded-xl border border-slate-200 p-4 text-sm">
            <div>
              <h3 className="font-semibold text-slate-900">{activeTemplate.label}</h3>
              {activeTemplate.helpText && <p className="mt-1 text-xs text-slate-500">{activeTemplate.helpText}</p>}
              {activeTemplate.required && <p className="mt-1 text-xs font-medium text-amber-800">Required</p>}
              {activeTemplate.requiresBrakeEvidence && (
                <p className="mt-1 text-xs font-medium text-red-800">Brake performance evidence required</p>
              )}
            </div>

            <fieldset>
              <legend className="text-xs font-medium text-slate-600">Result</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {RESULT_OPTIONS.filter((o) => o.id !== 'unchecked' || activeResult.result === 'unchecked').map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={saveItem.isPending}
                    onClick={() =>
                      saveItem.mutate({
                        templateItemId: activeTemplate.id,
                        result: opt.id,
                        inspectorName,
                      })
                    }
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      activeResult.result === opt.id
                        ? 'border-command-500 bg-command-50 text-command-800'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="text-xs text-slate-600">Item notes</span>
              <textarea
                defaultValue={activeResult.notes ?? ''}
                key={`${activeTemplate.id}-notes-${activeResult.notes}`}
                onBlur={(e) => {
                  const notes = e.target.value || null
                  if (notes !== activeResult.notes) {
                    saveItem.mutate({ templateItemId: activeTemplate.id, notes, inspectorName })
                  }
                }}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-slate-600">Evidence type</span>
                <select
                  value={activeResult.evidence.kind}
                  onChange={(e) =>
                    saveItem.mutate({
                      templateItemId: activeTemplate.id,
                      evidenceKind: e.target.value as PmiEvidenceKind,
                      inspectorName,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                >
                  {EVIDENCE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-600">Evidence file name (stub)</span>
                <input
                  defaultValue={activeResult.evidence.fileName ?? ''}
                  key={`${activeTemplate.id}-file-${activeResult.evidence.fileName}`}
                  placeholder="e.g. brake-print-2026-07-17.pdf"
                  onBlur={(e) => {
                    const fileName = e.target.value || null
                    if (fileName !== activeResult.evidence.fileName) {
                      saveItem.mutate({
                        templateItemId: activeTemplate.id,
                        evidenceFileName: fileName,
                        evidenceKind:
                          fileName && activeResult.evidence.kind === 'none'
                            ? activeTemplate.requiresBrakeEvidence
                              ? 'brake_print'
                              : 'document'
                            : undefined,
                        inspectorName,
                      })
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs text-slate-600">Evidence note</span>
              <input
                defaultValue={activeResult.evidence.note ?? ''}
                key={`${activeTemplate.id}-evnote-${activeResult.evidence.note}`}
                onBlur={(e) => {
                  const evidenceNote = e.target.value || null
                  if (evidenceNote !== activeResult.evidence.note) {
                    saveItem.mutate({
                      templateItemId: activeTemplate.id,
                      evidenceNote,
                      evidenceKind: evidenceNote && activeResult.evidence.kind === 'none' ? 'note' : undefined,
                      inspectorName,
                    })
                  }
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
              />
            </label>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
        {!complete && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p className="font-medium">Cannot complete PMI yet</p>
            <ul className="mt-1 list-inside list-disc text-xs">
              {blockers.slice(0, 5).map((b) => (
                <li key={b}>{b}</li>
              ))}
              {blockers.length > 5 && <li>+{blockers.length - 5} more</li>}
            </ul>
          </div>
        )}
        <button
          type="button"
          disabled={!complete || completeWo.isPending || workOrder.status === 'completed'}
          onClick={() => completeWo.mutate()}
          className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {workOrder.status === 'completed' ? 'PMI completed' : 'Mark PMI work order completed'}
        </button>
        {completeWo.isError && (
          <p className="text-sm text-red-700">
            {completeWo.error instanceof Error ? completeWo.error.message : 'Could not complete'}
          </p>
        )}
        {saveItem.isError && (
          <p className="text-sm text-red-700">
            {saveItem.error instanceof Error ? saveItem.error.message : 'Could not save item'}
          </p>
        )}
      </div>
    </SectionCard>
  )
}
