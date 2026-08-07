import type { FinanceRole } from './finance-api'

export type FinanceAction =
  | 'workspace:read'
  | 'cost:import'
  | 'cost:approve'
  | 'cost:reallocate'
  | 'payroll_cost:review'
  | 'integration:manage'
  | 'quarter:approve'
  | 'quarter:lock'
  | 'audit:export'

const ROLE_ACTIONS: Readonly<Record<FinanceRole, readonly FinanceAction[]>> = {
  finance_director: [
    'workspace:read',
    'cost:import',
    'cost:approve',
    'cost:reallocate',
    'payroll_cost:review',
    'integration:manage',
    'quarter:approve',
    'quarter:lock',
    'audit:export',
  ],
  finance_admin: [
    'workspace:read',
    'cost:import',
    'cost:approve',
    'cost:reallocate',
    'payroll_cost:review',
    'integration:manage',
    'quarter:approve',
    'quarter:lock',
    'audit:export',
  ],
  finance_manager: [
    'workspace:read',
    'cost:import',
    'cost:approve',
    'cost:reallocate',
    'payroll_cost:review',
    'quarter:approve',
    'quarter:lock',
    'audit:export',
  ],
  finance_officer: [
    'workspace:read',
    'cost:import',
    'cost:approve',
    'cost:reallocate',
    'payroll_cost:review',
    'quarter:approve',
    'audit:export',
  ],
  cost_approver: [
    'workspace:read',
    'cost:approve',
    'cost:reallocate',
  ],
  payroll_cost_reviewer: [
    'workspace:read',
    'payroll_cost:review',
  ],
  auditor: [
    'workspace:read',
    'audit:export',
  ],
  board_reader: ['workspace:read'],
}

export function financeRoleAllows(
  role: FinanceRole,
  action: FinanceAction,
): boolean {
  return ROLE_ACTIONS[role]?.includes(action) ?? false
}

export function assertFinancePermission(
  role: FinanceRole,
  action: FinanceAction,
): void {
  if (!financeRoleAllows(role, action)) {
    throw new Error(`Finance role ${role} is not permitted to perform ${action}`)
  }
}

export function financeActionsForRole(role: FinanceRole): readonly FinanceAction[] {
  return ROLE_ACTIONS[role] ?? []
}

