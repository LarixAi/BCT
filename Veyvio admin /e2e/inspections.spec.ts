import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Inspections control centre', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('hub shows attention cards and register', async ({ page }) => {
    await page.goto('/inspections')
    await expect(page.getByRole('heading', { name: 'Inspections', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Due today/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Overdue/i }).first()).toBeVisible()
    await expect(page.getByText('Inspection register')).toBeVisible()
    await expect(page.getByRole('link', { name: 'CD34 EFG' }).first()).toBeVisible()
  })

  test('overdue filter and saved view', async ({ page }) => {
    await page.goto('/inspections?filter=overdue')
    await expect(page.getByRole('button', { name: 'Overdue', exact: true }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'CD34 EFG' }).first()).toBeVisible()
  })

  test('opens Safety Inspection detail with checklist and WO link', async ({ page }) => {
    await page.goto('/inspections/insp-pmi-overdue')
    await expect(page.getByRole('heading', { name: 'CD34 EFG' })).toBeVisible()
    await expect(page.getByText('Safety Inspection (PMI)').first()).toBeVisible()
    await expect(page.getByText('Inspection checklist')).toBeVisible()
    await expect(page.getByText('Linked maintenance work orders')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Brake system repair' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Sign-off' })).toBeVisible()
  })

  test('calendar tab lists booked inspections', async ({ page }) => {
    await page.goto('/inspections?tab=calendar')
    await expect(page.getByText('Inspection calendar')).toBeVisible()
    await expect(page.getByRole('link', { name: 'AB12 CDE' }).first()).toBeVisible()
  })

  test('awaiting repair tab links to maintenance', async ({ page }) => {
    await page.goto('/inspections?tab=awaiting-repair')
    await expect(page.getByText('Awaiting rectification')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Brake system repair' })).toBeVisible()
  })

  test('overdue attention card filters register', async ({ page }) => {
    await page.goto('/inspections')
    await page.getByRole('button', { name: /^Overdue/i }).first().click()
    await expect(page).toHaveURL(/filter=overdue/)
    await expect(page.getByRole('link', { name: 'CD34 EFG' }).first()).toBeVisible()
  })

  test('vehicle detail shows formal inspections panel', async ({ page }) => {
    await page.goto('/vehicles/veh-4?tab=checks')
    await expect(page.getByText('Formal inspections')).toBeVisible()
    await expect(page.getByText('Next PMI')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open inspections centre →' })).toBeVisible()
  })
})
