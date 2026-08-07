import { describe, expect, it } from 'vitest'
import type { FinanceRole } from '../server/finance-api'
import { financePagesForRole, financeRoleCanAccessPage } from './page-access'

const roles: FinanceRole[] = [
  'finance_director',
  'finance_admin',
  'finance_manager',
  'finance_officer',
  'cost_approver',
  'payroll_cost_reviewer',
  'auditor',
  'board_reader',
]

describe('finance page access', () => {
  it('allows every active finance role to reach the overview', () => {
    for (const role of roles) expect(financeRoleCanAccessPage(role, 'overview')).toBe(true)
  })

  it('restricts integration and people settings to finance administrators', () => {
    for (const role of roles) {
      const isAdmin = role === 'finance_admin' || role === 'finance_director'
      expect(financeRoleCanAccessPage(role, 'settings_integrations')).toBe(isAdmin)
      expect(financeRoleCanAccessPage(role, 'settings_people')).toBe(isAdmin)
    }
  })

  it('gives board readers only board-relevant read pages', () => {
    expect(financePagesForRole('board_reader')).toEqual([
      'overview',
      'budgets',
      'breakdown',
      'quarterly',
      'reports',
      'governance',
    ])
    expect(financeRoleCanAccessPage('board_reader', 'costs')).toBe(false)
    expect(financeRoleCanAccessPage('board_reader', 'imports')).toBe(false)
  })

  it('keeps payroll reviewers out of unrelated cost and administration pages', () => {
    expect(financeRoleCanAccessPage('payroll_cost_reviewer', 'wages')).toBe(true)
    expect(financeRoleCanAccessPage('payroll_cost_reviewer', 'reviews')).toBe(true)
    expect(financeRoleCanAccessPage('payroll_cost_reviewer', 'bank')).toBe(false)
    expect(financeRoleCanAccessPage('payroll_cost_reviewer', 'settings_people')).toBe(false)
  })

  it('allows auditors to evidence pages but not mutation-focused administration', () => {
    expect(financeRoleCanAccessPage('auditor', 'audit')).toBe(true)
    expect(financeRoleCanAccessPage('auditor', 'accounting_exports')).toBe(true)
    expect(financeRoleCanAccessPage('auditor', 'imports')).toBe(false)
    expect(financeRoleCanAccessPage('auditor', 'settings_integrations')).toBe(false)
  })
})
