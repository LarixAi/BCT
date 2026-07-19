import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Depots headquarters', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('register shows depot cards and open workspace', async ({ page }) => {
    await page.goto('/depots')
    await expect(page.getByRole('heading', { name: 'Depots' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Add depot' })).toBeVisible()
    await expect(page.getByText('Wembley Depot')).toBeVisible()
    await page.getByRole('link', { name: 'Open' }).first().click()
    await expect(page).toHaveURL(/\/depots\/depot-/)
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible()
    await expect(page.getByText("Today's activity")).toBeVisible()
  })

  test('add depot wizard creates from identity step', async ({ page }) => {
    await page.goto('/depots/new')
    await expect(page.getByRole('heading', { name: 'Add depot' })).toBeVisible()
    await page.getByLabel('Depot name').fill('North Test Depot')
    await page.getByLabel('Depot code').fill('NTH99')
    await page.getByRole('button', { name: 'Create and continue' }).click()
    await expect(page).toHaveURL(/\/depots\/depot-.*\/onboarding\?step=operations/)
    await expect(page.getByText('Vehicle capacity')).toBeVisible()
  })
})
