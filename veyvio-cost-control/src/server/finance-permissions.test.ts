import { describe, expect, it } from 'vitest'
import {
  assertFinancePermission,
  financeActionsForRole,
  financeRoleAllows,
} from './finance-permissions'

describe('server-side finance permissions', () => {
  it('keeps board readers read-only', () => {
    expect(financeRoleAllows('board_reader', 'workspace:read')).toBe(true)
    expect(financeRoleAllows('board_reader', 'cost:approve')).toBe(false)
    expect(financeRoleAllows('board_reader', 'integration:manage')).toBe(false)
  })

  it('keeps auditors out of operational writes', () => {
    expect(financeRoleAllows('auditor', 'audit:export')).toBe(true)
    expect(financeRoleAllows('auditor', 'cost:import')).toBe(false)
    expect(financeRoleAllows('auditor', 'quarter:lock')).toBe(false)
  })

  it('reserves integration administration for finance admins', () => {
    expect(financeRoleAllows('finance_admin', 'integration:manage')).toBe(true)
    expect(financeRoleAllows('finance_manager', 'integration:manage')).toBe(false)
  })

  it('throws on an unauthorised server action', () => {
    expect(() =>
      assertFinancePermission('payroll_cost_reviewer', 'cost:approve'),
    ).toThrow(/not permitted/i)
    expect(() =>
      assertFinancePermission('payroll_cost_reviewer', 'payroll_cost:review'),
    ).not.toThrow()
  })

  it('returns immutable role capabilities for session/bootstrap responses', () => {
    const actions = financeActionsForRole('cost_approver')
    expect(actions).toEqual([
      'workspace:read',
      'cost:approve',
      'cost:reallocate',
    ])
  })
})

