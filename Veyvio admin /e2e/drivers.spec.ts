import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Driver management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('directory shows summary cards and drivers', async ({ page }) => {
    await page.goto('/drivers')
    await expect(page.getByRole('heading', { name: 'Drivers' })).toBeVisible()
    await expect(page.getByText('Eligible today')).toBeVisible()
    await expect(page.getByText('DRV-0001')).toBeVisible()
    await expect(page.getByText('Jane Smith')).toBeVisible()
  })

  test('profile shows eligibility panel and tabs', async ({ page }) => {
    await page.goto('/drivers/drv-4')
    await expect(page.getByText('DRV-0004')).toBeVisible()
    await expect(page.getByText('Eligible for work')).toBeVisible()
    await expect(page.getByRole('paragraph').filter({ hasText: /^Not eligible$/ })).toBeVisible()
    await expect(page.getByText('licence expired', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Compliance', exact: true }).click()
    await expect(page.getByRole('cell', { name: 'Driving licence' })).toBeVisible()
  })

  test('can create a new driver', async ({ page }) => {
    await page.goto('/drivers/new')
    await page.getByLabel('First name').fill('Test')
    await page.getByLabel('Last name').fill('Driver')
    await page.getByRole('textbox', { name: 'Email' }).fill('test.driver@example.com')
    await page.getByRole('textbox', { name: 'Phone' }).fill('07700999111')
    await page.getByRole('button', { name: 'Create driver' }).click()
    await expect(page).toHaveURL(/\/drivers\/drv-/)
    await expect(page.getByRole('heading', { name: 'Test Driver' })).toBeVisible()
  })

  test('filter cards narrow the directory', async ({ page }) => {
    await page.goto('/drivers')
    await page.getByRole('button', { name: /Not eligible/ }).click()
    await expect(page.getByText('Robert Wilson')).toBeVisible()
  })

  test('exceptions include driver eligibility blocks', async ({ page }) => {
    await page.goto('/exceptions')
    await expect(page.getByText(/Driver not eligible/i).first()).toBeVisible()
    await expect(page.getByText('DRV-0004')).toBeVisible()
  })

  test('training tab shows requirements', async ({ page }) => {
    await page.goto('/drivers/drv-6')
    await page.getByRole('button', { name: 'Training', exact: true }).click()
    await expect(page.getByRole('cell', { name: 'Company induction' })).toBeVisible()
  })
})
