export type ReportCategoryId =
  | 'operations'
  | 'trips'
  | 'drivers'
  | 'vehicles'
  | 'yard'
  | 'maintenance'
  | 'safety'
  | 'passengers'
  | 'customers'
  | 'commercial'
  | 'communications'
  | 'audit'
  | 'custom'

export type ReportAvailability = 'live' | 'partial' | 'planned'

export interface ReportDefinition {
  id: string
  title: string
  description: string
  category: ReportCategoryId
  href: string
  availability: ReportAvailability
  /** Where managers land when drilling a KPI */
  actionHref?: string
}

export interface ReportAttentionItem {
  id: string
  label: string
  count: number
  href: string
  severity: 'critical' | 'warning' | 'info'
}

export interface DailyOperationsMetric {
  key: string
  label: string
  value: number
  href: string
  note?: string
  /** true when the metric is inferred / incomplete in the platform */
  gap?: boolean
}

export interface DailyOperationsSummary {
  period: { from: string; to: string }
  generatedAt: string
  depotLabel: string
  metrics: DailyOperationsMetric[]
  attention: ReportAttentionItem[]
  dataQuality: string[]
  sourceNotes: string[]
}

/** Shared shape for all Command management reports. */
export type ReportSummaryView = DailyOperationsSummary
export type ReportMetric = DailyOperationsMetric

export type StandardReportId =
  | 'exceptions'
  | 'on-time'
  | 'trip-completion'
  | 'driver-compliance'
  | 'working-time'
  | 'fleet-availability'
  | 'checks-defects'
  | 'vor-downtime'
  | 'maintenance-due'
  | 'incidents'
  | 'contract-performance'
  | 'yard-operations'
  | 'communications'
  | 'audit-activity'
