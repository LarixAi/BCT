import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Transfer and operational trips', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('operational trips list shows sample trip', async ({ page }) => {
    await page.goto('/trips')
    await expect(page.getByRole('heading', { name: 'Trips' })).toBeVisible()
    await expect(page.getByText('TRP-1041')).toBeVisible()
  })

  test('trip detail shows jobs and manage assignment', async ({ page }) => {
    await page.goto('/ops-trips/trip-1041')
    await expect(page.getByRole('heading', { name: 'TRP-1041' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Manage assignment' })).toBeVisible()
    await page.getByRole('button', { name: 'Passengers' }).click()
    await expect(page.getByText('Emily Watson')).toBeVisible()
    await page.getByRole('button', { name: 'Overview' }).click()
    await page.getByRole('button', { name: 'Manage assignment' }).click()
    await expect(page.getByText('What to transfer')).toBeVisible()
  })

  test('run detail links to operational trip', async ({ page }) => {
    await page.goto('/runs/duty-1?tab=trips')
    await expect(page.getByRole('link', { name: 'TRP-1041', exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'TRP-1041', exact: true }).click()
    await expect(page).toHaveURL('/trips/trip-1041')
  })

  test('reports include transfer section', async ({ page }) => {
    await page.goto('/reports')
    await expect(page.getByText('Transfer operations')).toBeVisible()
  })

  test('dispatch manage assignment opens transfer workflow', async ({ page }) => {
    await page.goto('/dispatch')
    await expect(page.getByText('Oakwood School AM').first()).toBeVisible()
    await page.getByRole('button', { name: 'Manage assignment' }).first().click()
    await expect(page.getByText('What to transfer')).toBeVisible({ timeout: 10_000 })
  })

  test('can move onboard passenger via manage assignment', async ({ page }) => {
    await page.goto('/ops-trips/trip-1041')
    await page.getByRole('button', { name: 'Manage assignment' }).click()
    await expect(page.getByText('What to transfer')).toBeVisible()

    await page.getByRole('radio', { name: /Selected jobs/ }).check()
    await page.getByRole('checkbox', { name: /Emily Watson/ }).check()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByText('Current operational position')).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByText('Ranked candidates')).toBeVisible()
    await page.getByRole('button', { name: /Michael Patel/ }).click()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByText('Pre-transfer validation')).toBeVisible()
    const override = page.getByLabel(/Manager override/)
    if (await override.isVisible()) await override.check()
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByPlaceholder(/lay-by/).fill('Oakwood Primary lay-by')
    await page.getByPlaceholder(/Duty manager/).fill('Larone Laing')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByText('Before', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { name: 'Confirm transfer' })).toBeVisible()
    await expect(page.getByText(/Handover/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Confirm transfer' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirm transfer' })).toBeEnabled()
  })
})
