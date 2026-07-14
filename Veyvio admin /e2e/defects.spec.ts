import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Defects', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('hub shows summary cards and defect register', async ({ page }) => {
    await page.goto('/defects')
    await expect(page.getByRole('heading', { name: 'Defects' })).toBeVisible()
    await expect(page.getByText('Open defects')).toBeVisible()
    await expect(page.getByText('Safety-critical')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Defect register' })).toBeVisible()
    await expect(page.getByTestId('defects-register-table').getByRole('link', { name: 'CD34 EFG' }).first()).toBeVisible()
  })

  test('priority alert shows critical brake defect', async ({ page }) => {
    await page.goto('/defects')
    const alerts = page.getByTestId('priority-alerts')
    await expect(alerts.getByText('Immediate attention')).toBeVisible()
    await expect(alerts.getByText('CD34 EFG — Brake pedal spongy')).toBeVisible()
    await expect(alerts.getByRole('link', { name: 'Review defect' })).toBeVisible()
  })

  test('critical tab filters to safety-critical defects', async ({ page }) => {
    await page.goto('/defects?tab=critical')
    await expect(page.getByRole('heading', { name: 'Critical defects' })).toBeVisible()
    await expect(page.getByTestId('defects-register-table').getByRole('link', { name: 'CD34 EFG' }).first()).toBeVisible()
    await expect(page.getByTestId('defects-register-table').getByRole('link', { name: 'GH56 HIJ' })).not.toBeVisible()
  })

  test('awaiting triage tab shows unreviewed defects', async ({ page }) => {
    await page.goto('/defects?tab=awaiting_triage')
    await expect(page.getByRole('heading', { name: 'Awaiting triage' })).toBeVisible()
    await expect(page.getByTestId('defects-register-table').getByRole('link', { name: 'KL78 MNO' }).first()).toBeVisible()
  })

  test('can open defect detail page', async ({ page }) => {
    await page.goto('/defects/vdef-1')
    await expect(page.getByRole('heading', { name: 'DF-001' })).toBeVisible()
    await expect(page.getByText('CD34 EFG').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Evidence' })).toBeVisible()
  })

  test('defect detail shows operational impact for critical defect', async ({ page }) => {
    await page.goto('/defects/vdef-1')
    await expect(page.getByText('Vehicle assigned to School Run 114')).toBeVisible()
    await page.getByRole('button', { name: 'Operational impact' }).click()
    await expect(page.getByRole('heading', { name: 'Operational impact' }).nth(1)).toBeVisible()
  })

  test('can triage a pending defect', async ({ page }) => {
    await page.goto('/defects/vdef-5')
    await page.getByRole('button', { name: 'Triage defect' }).click()
    await page.getByRole('button', { name: 'Confirm triage' }).click()
    await expect(page.getByRole('button', { name: 'Triage defect' })).not.toBeVisible()
    await page.getByRole('button', { name: 'Assessment' }).click()
    await expect(page.getByText('Reviewed by')).toBeVisible()
  })

  test('verification tab shows awaiting sign-off', async ({ page }) => {
    await page.goto('/defects?tab=verification')
    await expect(page.getByRole('heading', { name: 'Awaiting verification' })).toBeVisible()
    await expect(page.getByTestId('defects-register-table').getByRole('link', { name: 'MN90 PQR' }).first()).toBeVisible()
  })

  test('can report a new defect', async ({ page }) => {
    await page.goto('/defects')
    await page.getByRole('button', { name: 'Report defect' }).click()
    await page.getByPlaceholder('e.g. Nearside mirror').fill('Test mirror')
    await page.getByPlaceholder('What is wrong?').fill('Cracked mirror housing from test')
    await page.getByRole('button', { name: 'Submit for triage' }).click()
    await expect(page.getByRole('heading', { name: 'Defect register' })).toBeVisible()
  })

  test('search filters defect list', async ({ page }) => {
    await page.goto('/defects')
    await page.getByPlaceholder('Search defects…').fill('CD34 EFG')
    await expect(page.getByTestId('defects-register-table').getByRole('link', { name: 'CD34 EFG' }).first()).toBeVisible()
    await expect(page.getByTestId('defects-register-table').getByRole('link', { name: 'GH56 HIJ' })).not.toBeVisible()
  })

  test('can verify repair and close defect', async ({ page }) => {
    await page.goto('/defects/vdef-8')
    await page.getByRole('button', { name: 'Verify repair' }).click()
    await page.getByRole('button', { name: 'Pass verification' }).click()
    await expect(page.getByRole('definition').filter({ hasText: 'pass' })).toBeVisible()
    await page.getByRole('button', { name: 'Overview' }).click()
    await expect(page.getByText('Permanently repaired')).toBeVisible()
  })

  test('can apply operational restriction', async ({ page }) => {
    await page.goto('/defects/vdef-5')
    await page.getByRole('button', { name: 'Restrictions' }).click()
    await page.getByRole('button', { name: 'Apply restriction' }).click()
    await expect(page.getByRole('listitem').getByText('Daylight operation only')).toBeVisible()
  })

  test('can record repair completion', async ({ page }) => {
    await page.goto('/defects/vdef-2')
    await page.getByRole('button', { name: 'Repair' }).click()
    await page.locator('textarea').first().fill('Mirror housing cracked')
    await page.locator('textarea').nth(1).fill('Replaced nearside mirror assembly')
    await page.getByRole('button', { name: 'Mark repair complete' }).click()
    await expect(page.getByText('awaiting independent verification', { exact: false })).toBeVisible()
  })

  test('rules tab shows SLA and automation settings', async ({ page }) => {
    await page.goto('/defects?tab=rules')
    await expect(page.getByRole('heading', { name: 'Service-level targets' })).toBeVisible()
    await expect(page.getByTestId('defect-sla-table')).toBeVisible()
    await expect(page.getByText('Critical vehicle-check response')).toBeVisible()
    await expect(page.getByText('Block dispatch on critical')).toBeVisible()
  })

  test('recurring tab shows component pattern intelligence', async ({ page }) => {
    await page.goto('/defects?tab=recurring')
    await expect(page.getByRole('heading', { name: 'Recurring defects' })).toBeVisible()
    const insights = page.getByTestId('recurring-insights')
    await expect(insights).toBeVisible()
    await expect(insights.getByText(/CD34 EFG — brake pedal/i)).toBeVisible()
  })

  test('register shows SLA column', async ({ page }) => {
    await page.goto('/defects')
    await expect(page.getByTestId('defects-register-table').getByRole('columnheader', { name: 'SLA' })).toBeVisible()
  })

  test('can upload evidence on defect detail', async ({ page }) => {
    await page.goto('/defects/vdef-1')
    await page.getByRole('button', { name: 'Evidence' }).click()
    await page.getByTestId('evidence-upload').getByPlaceholder('Description').fill('Brake pedal photo')
    await page.getByTestId('evidence-upload').getByRole('button', { name: 'Upload' }).click()
    await expect(page.getByText('Brake pedal photo')).toBeVisible()
  })

  test('can bulk assign non-critical defects', async ({ page }) => {
    await page.goto('/defects?tab=awaiting_triage')
    const table = page.getByTestId('defects-register-table')
    await table.getByRole('row').filter({ hasText: 'KL78 MNO' }).getByRole('checkbox').check()
    await expect(page.getByTestId('bulk-action-bar')).toBeVisible()
    await page.getByTestId('bulk-action-bar').getByRole('button', { name: 'Assign' }).click()
    await expect(page.getByTestId('bulk-action-bar')).not.toBeVisible()
  })

  test('overview shows operational analytics', async ({ page }) => {
    await page.goto('/defects')
    await expect(page.getByTestId('defects-analytics')).toBeVisible()
    await expect(page.getByText('Operational intelligence')).toBeVisible()
    await expect(page.getByText('By depot')).toBeVisible()
  })

  test('export button is available on hub', async ({ page }) => {
    await page.goto('/defects')
    await expect(page.getByTestId('defects-export-button')).toBeVisible()
  })

  test('defect detail shows source record and audit trail', async ({ page }) => {
    await page.goto('/defects/vdef-1')
    await expect(page.getByTestId('defect-source-record')).toBeVisible()
    await expect(page.getByTestId('defect-source-record').getByText('Vehicle check')).toBeVisible()
    await page.getByRole('button', { name: 'Audit' }).click()
    await expect(page.getByTestId('defect-audit-trail')).toBeVisible()
  })

  test('priority alert links to exceptions', async ({ page }) => {
    await page.goto('/defects')
    await expect(page.getByTestId('priority-alerts').getByRole('link', { name: 'View exception' })).toBeVisible()
  })

  test('report form includes safety assessment fields', async ({ page }) => {
    await page.goto('/defects')
    await page.getByRole('button', { name: 'Report defect' }).click()
    await expect(page.getByText('Safety assessment')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Submit and mark VOR' })).toBeVisible()
  })
})
