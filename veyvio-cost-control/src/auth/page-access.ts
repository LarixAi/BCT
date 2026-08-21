import type { FinanceRole } from '../server/finance-api'

export type FinancePage =
  | 'overview'
  | 'costs'
  | 'wages'
  | 'budgets'
  | 'bank'
  | 'reviews'
  | 'breakdown'
  | 'quarterly'
  | 'reports'
  | 'audit'
  | 'governance'
  | 'imports'
  | 'accounting_exports'
  | 'settings_general'
  | 'settings_financial'
  | 'settings_people'
  | 'settings_integrations'
  | 'settings_notifications'
  | 'settings_audit'

const FULL_ADMIN_PAGES = [
  'overview',
  'costs',
  'wages',
  'budgets',
  'bank',
  'reviews',
  'breakdown',
  'quarterly',
  'reports',
  'audit',
  'governance',
  'imports',
  'accounting_exports',
  'settings_general',
  'settings_financial',
  'settings_people',
  'settings_integrations',
  'settings_notifications',
  'settings_audit',
] as const satisfies readonly FinancePage[]

const MANAGER_PAGES = [
  'overview',
  'costs',
  'wages',
  'budgets',
  'bank',
  'reviews',
  'breakdown',
  'quarterly',
  'reports',
  'audit',
  'governance',
  'imports',
  'accounting_exports',
  'settings_general',
  'settings_financial',
  'settings_notifications',
] as const satisfies readonly FinancePage[]

const ROLE_PAGES: Readonly<Record<FinanceRole, readonly FinancePage[]>> = {
  finance_director: FULL_ADMIN_PAGES,
  finance_admin: FULL_ADMIN_PAGES,
  finance_manager: MANAGER_PAGES,
  finance_officer: MANAGER_PAGES,
  cost_approver: [
    'overview',
    'costs',
    'budgets',
    'reviews',
    'breakdown',
    'reports',
    'settings_notifications',
  ],
  payroll_cost_reviewer: [
    'overview',
    'wages',
    'reviews',
    'reports',
    'settings_notifications',
  ],
  auditor: [
    'overview',
    'costs',
    'wages',
    'budgets',
    'bank',
    'breakdown',
    'quarterly',
    'reports',
    'audit',
    'governance',
    'accounting_exports',
    'settings_audit',
  ],
  board_reader: [
    'overview',
    'budgets',
    'breakdown',
    'quarterly',
    'reports',
    'governance',
  ],
}

export function financeRoleCanAccessPage(role: FinanceRole, page: FinancePage): boolean {
  return ROLE_PAGES[role]?.includes(page) ?? false
}

export function financePagesForRole(role: FinanceRole): readonly FinancePage[] {
  return ROLE_PAGES[role] ?? []
}
