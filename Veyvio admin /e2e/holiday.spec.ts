import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Holiday & time off', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('driver Time off tab shows balance and employment settings', async ({ page }) => {
    await page.goto('/drivers/drv-1')
    await expect(page.getByRole('heading', { name: 'Jane Smith' })).toBeVisible()
    await page.getByRole('button', { name: 'Time off', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'Holiday balance' })).toBeVisible()
    await expect(page.getByText('Loading holiday balance…')).toBeHidden({ timeout: 15_000 })
    await expect(page.getByText('Remaining', { exact: true })).toBeVisible()
    await expect(page.getByText('Entitlement', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Employment & holiday settings' })).toBeVisible()
    await expect(page.getByText('Calculation method', { exact: true })).toBeVisible()
    await expect(page.getByText('Working weekdays', { exact: true })).toBeVisible()
    await expect(page.getByText('School holiday week with family')).toBeVisible()
  })

  test('Time Off queue approve flow updates leave status', async ({ page }) => {
    await page.goto('/time-off')
    await expect(page.getByRole('heading', { name: 'Time off' })).toBeVisible()
    await expect(page.getByText(/awaiting approval/i).first()).toBeVisible()

    await page.getByRole('button', { name: /Jane Smith/i }).click()
    await expect(page.getByText('School holiday week with family')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Suggest /i })).toBeVisible()

    await page.getByRole('button', { name: 'Approve', exact: true }).click()
    await expect(page.getByText('Approved', { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Time Off queue surfaces approved leave and cover block copy', async ({ page }) => {
    await page.goto('/time-off')
    await page.getByRole('button', { name: /Michael Green/i }).click()
    await expect(page.getByText('Approved annual leave')).toBeVisible()
    await expect(page.getByText('Approved', { exact: true }).first()).toBeVisible()

    await page.goto('/schedule')
    await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible()
    // Cover candidates include a hard-blocked approved-leave driver
    await expect(page.getByRole('link', { name: /Time [Oo]ff/i }).first()).toBeVisible()
  })
})
