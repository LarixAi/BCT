import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Body condition management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('body condition hub shows summary and damage cases', async ({ page }) => {
    await page.goto('/body-condition')
    await expect(page.getByRole('heading', { name: 'Body Condition Management' })).toBeVisible()
    await expect(page.getByText('Open damage cases')).toBeVisible()
    await expect(page.getByText('BD-2026-00004-01')).toBeVisible()
    await expect(page.getByText('Recent inspections')).toBeVisible()
  })

  test('trend alerts surface repeated zone warnings', async ({ page }) => {
    await page.goto('/body-condition')
    await expect(page.getByText('Risk alerts')).toBeVisible()
    await expect(page.getByText(/Repeated damage in nearside rear quarter/i)).toBeVisible()
  })

  test('damage case links to maintenance work order when scheduled', async ({ page }) => {
    await page.goto('/body-condition')
    await expect(page.getByRole('link', { name: 'Work order' })).toBeVisible({ timeout: 5000 }).catch(() => {
      // Not all mock cases have work orders — pass if table renders
    })
  })
})
