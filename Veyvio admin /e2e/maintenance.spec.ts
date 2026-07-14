import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Maintenance hub', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('overview shows summary cards and priority board', async ({ page }) => {
    await page.goto('/maintenance')
    await expect(page.getByRole('heading', { name: 'Maintenance', exact: true })).toBeVisible()
    await expect(page.getByText('Fleet availability')).toBeVisible()
    await expect(page.getByText('Maintenance priority board')).toBeVisible()
    await expect(page.getByRole('link', { name: 'CD34 EFG' }).first()).toBeVisible()
  })

  test('work orders tab lists fleet work orders', async ({ page }) => {
    await page.goto('/maintenance?tab=work-orders')
    await expect(page.getByText('Brake system repair')).toBeVisible()
    await expect(page.getByText('CD34 EFG')).toBeVisible()
  })

  test('defects tab shows shared defect register', async ({ page }) => {
    await page.goto('/maintenance?tab=defects')
    await expect(page.getByText('Defect register')).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Brake pedal', exact: true })).toBeVisible()
  })

  test('links open vehicle maintenance tab', async ({ page }) => {
    await page.goto('/maintenance')
    await page.getByRole('link', { name: 'CD34 EFG' }).first().click()
    await expect(page).toHaveURL(/tab=Maintenance/)
    await page.getByRole('button', { name: 'Maintenance', exact: true }).click()
    await expect(page.getByText('Work orders')).toBeVisible()
  })

  test('downtime tab shows analytics', async ({ page }) => {
    await page.goto('/maintenance?tab=downtime')
    await expect(page.getByText('Downtime timeline')).toBeVisible()
    await expect(page.getByText('Vehicles on downtime')).toBeVisible()
  })

  test('suppliers tab lists catalogue', async ({ page }) => {
    await page.goto('/maintenance?tab=suppliers')
    await expect(page.getByText('Approved suppliers')).toBeVisible()
    await expect(page.getByText('Fleet Workshop')).toBeVisible()
    await expect(page.getByText('Parts catalogue')).toBeVisible()
  })

  test('costs tab shows intelligence', async ({ page }) => {
    await page.goto('/maintenance?tab=costs')
    await expect(page.getByText('Planned maintenance')).toBeVisible()
    await expect(page.getByText('Cost per mile')).toBeVisible()
  })

  test('work order pipeline manage transitions', async ({ page }) => {
    await page.goto('/maintenance?tab=work-orders')
    await page.getByRole('button', { name: 'Manage' }).first().click()
    await expect(page.getByText('Diagnosis / notes')).toBeVisible()
  })

  test('defect triage for pending defect', async ({ page }) => {
    await page.goto('/maintenance?tab=defects')
    await page.getByRole('button', { name: 'Triage' }).first().click()
    await expect(page.getByText('Triage decision')).toBeVisible()
    await page.getByRole('button', { name: 'Confirm triage' }).click()
    await expect(page.getByText('work order linked').first()).toBeVisible({ timeout: 5000 })
  })
})
