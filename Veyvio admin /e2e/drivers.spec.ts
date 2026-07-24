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
    await expect(page.getByText('Not eligible for duty')).toBeVisible()
    await page.getByRole('button', { name: 'Compliance', exact: true }).click()
    await expect(page.getByText(/licence/i).first()).toBeVisible()
  })

  test('onboarding wizard: draft → invite → blocked activation', async ({ page }) => {
    await page.goto('/drivers/new')
    await expect(page.getByRole('heading', { name: 'Add driver' })).toBeVisible()
    await expect(page.getByText(/three separate decisions/i)).toBeVisible()

    await page.getByLabel('First name').fill('Wizard')
    await page.getByLabel('Last name').fill('Driver')
    await page.getByLabel('Work or personal email').fill('wizard.driver@example.com')
    await page.getByLabel('Mobile number').fill('07700999111')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page).toHaveURL(/\/drivers\/drv-.*\/onboarding/)
    await expect(page.getByText(/Operational:.*Onboarding/i)).toBeVisible()
    await expect(page.getByText(/Account:.*Draft/i)).toBeVisible()

    await page.getByLabel('Start date').fill('2026-08-01')
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByLabel('Driving licence number').fill('WIZARD123')
    await page.getByLabel('Licence expiry').fill('2020-01-01')
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByText(/Admins never see it/i)).toBeVisible()
    await page.getByRole('button', { name: 'Create app account' }).click()

    await expect(page.getByRole('heading', { name: 'Activation blocked' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /Activate driver — unavailable/i })).toBeDisabled()
  })

  test('onboarding wizard activates when eligible', async ({ page }) => {
    const future = '2028-12-31'
    await page.goto('/drivers/new')
    await page.getByLabel('First name').fill('Ready')
    await page.getByLabel('Last name').fill('Driver')
    await page.getByLabel('Work or personal email').fill('ready.driver@example.com')
    await page.getByLabel('Mobile number').fill('07700999222')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page).toHaveURL(/\/drivers\/drv-.*\/onboarding/)
    await page.getByLabel('Start date').fill('2026-07-01')
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByLabel('Driving licence number').fill('READY456')
    await page.getByLabel('Licence expiry').fill(future)
    await page.getByLabel('DQC / CPC expiry').fill(future)
    await page.getByLabel('DBS expiry / review').fill(future)
    await page.getByLabel('Medical expiry').fill(future)
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Create app account' }).click()

    await expect(page.getByRole('heading', { name: 'Activation requirements' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Send invite' }).click()
    await expect(page.getByRole('button', { name: 'Activate driver', exact: true })).toBeVisible()
  })

  test('filter cards narrow the directory', async ({ page }) => {
    await page.goto('/drivers')
    await page.getByRole('button', { name: /Not eligible/ }).click()
    await expect(page.getByText('Robert Wilson')).toBeVisible()
  })

  test('exceptions include driver eligibility blocks', async ({ page }) => {
    await page.goto('/exceptions')
    await expect(page.getByText(/Driver not eligible/i).first()).toBeVisible()
    await expect(page.getByText('Driver not eligible — Robert Wilson')).toBeVisible()
  })

  test('training tab shows requirements', async ({ page }) => {
    await page.goto('/drivers/drv-6')
    await page.getByRole('button', { name: 'Training', exact: true }).click()
    await expect(page.getByRole('cell', { name: 'Company induction' })).toBeVisible()
  })

  test('account route opens Access & Security tab', async ({ page }) => {
    await page.goto('/drivers/drv-1/account')
    await expect(page.getByRole('heading', { name: 'Driver app access' }).first()).toBeVisible()
    await expect(page.getByText(/never set or see passwords/i)).toBeVisible()
    await expect(page.getByText('Sessions and credentials')).toBeVisible()
  })
})
