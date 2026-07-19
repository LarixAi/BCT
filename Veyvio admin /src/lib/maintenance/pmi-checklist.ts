/** Digital PMI checklist — structured inspection items + evidence stubs (Phase 2a). */

export type PmiItemResult = 'unchecked' | 'pass' | 'fail' | 'advisory' | 'na'

export type PmiEvidenceKind = 'none' | 'note' | 'photo' | 'brake_print' | 'document'

export interface PmiChecklistTemplateItem {
  id: string
  section: string
  label: string
  required: boolean
  /** When true, a pass/fail must include brake performance evidence */
  requiresBrakeEvidence?: boolean
  helpText?: string
}

export interface PmiChecklistTemplate {
  id: string
  name: string
  vehicleCategories: string[]
  items: PmiChecklistTemplateItem[]
}

export interface PmiChecklistEvidence {
  kind: PmiEvidenceKind
  note: string | null
  /** Mock file name — real upload lands with file service later */
  fileName: string | null
  recordedAt: string | null
  recordedBy: string | null
}

export interface PmiChecklistItemResult {
  templateItemId: string
  result: PmiItemResult
  notes: string | null
  evidence: PmiChecklistEvidence
}

export interface PmiChecklistInstance {
  templateId: string
  templateName: string
  startedAt: string | null
  completedAt: string | null
  inspectorName: string | null
  items: PmiChecklistItemResult[]
}

export const COMPANY_PMI_TEMPLATE: PmiChecklistTemplate = {
  id: 'pmi-psv-minibus-v1',
  name: 'PSV / minibus safety inspection (PMI)',
  vehicleCategories: ['minibus', 'coach', 'accessible_minibus'],
  items: [
    { id: 'brakes-service', section: 'Brakes', label: 'Service brake performance', required: true, requiresBrakeEvidence: true, helpText: 'Attach brake performance print or roller readings' },
    { id: 'brakes-parking', section: 'Brakes', label: 'Parking brake performance', required: true, requiresBrakeEvidence: true },
    { id: 'brakes-lines', section: 'Brakes', label: 'Brake pipes, hoses and connections', required: true },
    { id: 'steering', section: 'Steering', label: 'Steering play and security', required: true },
    { id: 'tyres', section: 'Tyres & wheels', label: 'Tyre condition, pressure and tread depth', required: true },
    { id: 'wheel-nuts', section: 'Tyres & wheels', label: 'Wheel nut indicators / security', required: true },
    { id: 'lights', section: 'Lights & electrics', label: 'Lights, indicators and reflectors', required: true },
    { id: 'wipers', section: 'Lights & electrics', label: 'Wipers, washers and horn', required: true },
    { id: 'glass', section: 'Body & glazing', label: 'Windscreen and mirrors', required: true },
    { id: 'doors', section: 'Body & glazing', label: 'Passenger doors and emergency exits', required: true },
    { id: 'seats', section: 'Interior', label: 'Seats, seatbelts and floor condition', required: true },
    { id: 'fire', section: 'Safety equipment', label: 'Fire extinguisher and first aid kit', required: true },
    { id: 'exhaust', section: 'Other', label: 'Exhaust and fuel system security', required: false },
    { id: 'suspension', section: 'Other', label: 'Suspension and chassis condition', required: true },
  ],
}

export function emptyEvidence(): PmiChecklistEvidence {
  return { kind: 'none', note: null, fileName: null, recordedAt: null, recordedBy: null }
}

export function instantiatePmiChecklist(
  template: PmiChecklistTemplate = COMPANY_PMI_TEMPLATE,
  startedAt: string | null = null,
): PmiChecklistInstance {
  return {
    templateId: template.id,
    templateName: template.name,
    startedAt,
    completedAt: null,
    inspectorName: null,
    items: template.items.map((item) => ({
      templateItemId: item.id,
      result: 'unchecked',
      notes: null,
      evidence: emptyEvidence(),
    })),
  }
}

export function getTemplateItem(
  templateItemId: string,
  template: PmiChecklistTemplate = COMPANY_PMI_TEMPLATE,
): PmiChecklistTemplateItem | undefined {
  return template.items.find((i) => i.id === templateItemId)
}

export function checklistProgress(instance: PmiChecklistInstance | null | undefined): {
  total: number
  answered: number
  failed: number
  advisory: number
} {
  if (!instance) return { total: 0, answered: 0, failed: 0, advisory: 0 }
  const answered = instance.items.filter((i) => i.result !== 'unchecked').length
  return {
    total: instance.items.length,
    answered,
    failed: instance.items.filter((i) => i.result === 'fail').length,
    advisory: instance.items.filter((i) => i.result === 'advisory').length,
  }
}

/** Shared brake-evidence rule used by WO completion, inspections sign-off, and evidence queue. */
export function validateBrakeEvidence(
  row: PmiChecklistItemResult | null | undefined,
  templateItem: PmiChecklistTemplateItem,
): string | null {
  if (!templateItem.requiresBrakeEvidence) return null
  if (!row) return `${templateItem.label} needs brake performance evidence (print or document)`
  if (row.result === 'unchecked' || row.result === 'na') {
    return `${templateItem.label} must be recorded with brake evidence`
  }
  if (!(row.result === 'pass' || row.result === 'fail' || row.result === 'advisory')) return null
  const kind = row.evidence?.kind
  const fileName = row.evidence?.fileName
  const ok =
    kind === 'brake_print' ||
    (kind === 'photo' && Boolean(fileName)) ||
    (kind === 'document' && Boolean(fileName))
  if (!ok) return `${templateItem.label} needs brake performance evidence (print or document)`
  return null
}

export function isBrakeEvidenceGap(message: string): boolean {
  return /brake/i.test(message)
}

/** Blockers that prevent marking a PMI work order completed. */
export function pmiChecklistCompletionBlockers(
  instance: PmiChecklistInstance | null | undefined,
  template: PmiChecklistTemplate = COMPANY_PMI_TEMPLATE,
): string[] {
  if (!instance) return ['Digital PMI checklist has not been started']
  const blockers: string[] = []

  for (const tmpl of template.items) {
    const row = instance.items.find((i) => i.templateItemId === tmpl.id)
    if (!row) {
      if (tmpl.required) blockers.push(`Missing checklist item: ${tmpl.label}`)
      continue
    }
    if (tmpl.requiresBrakeEvidence) {
      const brakeGap = validateBrakeEvidence(row, tmpl)
      if (brakeGap) blockers.push(brakeGap)
      continue
    }
    if (tmpl.required && (row.result === 'unchecked' || row.result === 'na')) {
      blockers.push(`${tmpl.label} must be recorded`)
    }
  }

  if (!instance.inspectorName?.trim()) {
    blockers.push('Inspector name is required')
  }

  return blockers
}

export function isPmiChecklistComplete(instance: PmiChecklistInstance | null | undefined): boolean {
  return pmiChecklistCompletionBlockers(instance).length === 0
}

export function updateChecklistItem(
  instance: PmiChecklistInstance,
  templateItemId: string,
  patch: Partial<Pick<PmiChecklistItemResult, 'result' | 'notes'>> & {
    evidence?: Partial<PmiChecklistEvidence>
    actorName?: string
  },
): PmiChecklistInstance {
  const now = new Date().toISOString()
  return {
    ...instance,
    startedAt: instance.startedAt ?? now,
    items: instance.items.map((item) => {
      if (item.templateItemId !== templateItemId) return item
      const evidencePatch = patch.evidence
        ? Object.fromEntries(Object.entries(patch.evidence).filter(([, v]) => v !== undefined))
        : null
      const evidence = evidencePatch
        ? {
            ...item.evidence,
            ...evidencePatch,
            recordedAt:
              evidencePatch.kind && evidencePatch.kind !== 'none' ? now : item.evidence.recordedAt,
            recordedBy: patch.actorName ?? item.evidence.recordedBy,
          }
        : item.evidence
      return {
        ...item,
        result: patch.result ?? item.result,
        notes: patch.notes !== undefined ? patch.notes : item.notes,
        evidence,
      }
    }),
  }
}

/** Gaps for compliance evidence queue. */
export function pmiChecklistEvidenceGaps(
  instance: PmiChecklistInstance | null | undefined,
  template: PmiChecklistTemplate = COMPANY_PMI_TEMPLATE,
): string[] {
  return pmiChecklistCompletionBlockers(instance, template)
}
