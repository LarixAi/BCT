import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { admin } from './supabase.ts'
import type { RequestContext } from './supabase.ts'

type Row = Record<string, unknown>

export function tenantTable(context: RequestContext, table: string) {
  return admin.from(table).select('*').eq('company_id', context.companyId)
}

export function tenantSelect(context: RequestContext, table: string, select = '*') {
  return admin.from(table).select(select).eq('company_id', context.companyId)
}

export async function tenantRecord(
  context: RequestContext,
  table: string,
  recordId: string,
  select = '*',
): Promise<Row | null> {
  const { data, error } = await admin
    .from(table)
    .select(select)
    .eq('id', recordId)
    .eq('company_id', context.companyId)
    .maybeSingle()
  if (error) throw error
  return (data as Row | null) ?? null
}

export function tenantInsert(context: RequestContext, table: string, row: Row) {
  return admin.from(table).insert({ ...row, company_id: context.companyId })
}

export function tenantUpdate(
  context: RequestContext,
  table: string,
  recordId: string,
  patch: Row,
) {
  return admin
    .from(table)
    .update(patch)
    .eq('id', recordId)
    .eq('company_id', context.companyId)
}

export function tenantDelete(context: RequestContext, table: string, recordId: string) {
  return admin.from(table).delete().eq('id', recordId).eq('company_id', context.companyId)
}

export async function assertRunIdsInCompany(
  context: RequestContext,
  runIds: string[],
): Promise<void> {
  const ids = [...new Set(runIds.filter(Boolean))]
  if (!ids.length) return
  const { data, error } = await admin
    .from('runs')
    .select('id')
    .eq('company_id', context.companyId)
    .in('id', ids)
  if (error) throw error
  if ((data ?? []).length !== ids.length) {
    throw new Error('One or more runs are not in this company')
  }
}
