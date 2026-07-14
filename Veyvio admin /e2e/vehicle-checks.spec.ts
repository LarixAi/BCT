import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Vehicle checks', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('hub shows summary cards and overview', async ({ page }) => {
    await page.goto('/vehicle-checks')
    await expect(page.getByRole('heading', { name: 'Vehicle Checks' })).toBeVisible()
    await expect(page.getByText('Vehicles ready')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Operational overview' })).toBeVisible()
    await expect(page.getByText('CD34 EFG')).toBeVisible()
  })

  test('live checks tab shows in-progress checks', async ({ page }) => {
    await page.goto('/vehicle-checks?tab=live')
    await expect(page.getByRole('heading', { name: 'Live checks' })).toBeVisible()
    await expect(page.getByText('KL78 MNO')).toBeVisible()
  })

  test('action required tab shows failed checks', async ({ page }) => {
    await page.goto('/vehicle-checks?tab=action')
    await expect(page.getByRole('heading', { name: 'Action required' })).toBeVisible()
    await expect(page.getByText('CD34 EFG')).toBeVisible()
  })

  test('overdue tab shows missing checks', async ({ page }) => {
    await page.goto('/vehicle-checks?tab=overdue')
    await expect(page.getByRole('heading', { name: 'Missed and overdue' })).toBeVisible()
    await expect(page.getByText('ST12 UVW')).toBeVisible()
  })

  test('can open check detail page', async ({ page }) => {
    await page.goto('/vehicle-checks/chk-4')
    await expect(page.getByRole('heading', { name: 'CD34 EFG' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Check timeline' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Evidence' })).toBeVisible()
  })

  test('can start admin check', async ({ page }) => {
    await page.goto('/vehicle-checks')
    await page.getByRole('button', { name: 'Start admin check' }).click()
    await page.getByRole('button', { name: 'Start check' }).click()
    await expect(page.getByRole('heading', { name: 'Operational overview' })).toBeVisible()
  })

  test('status deep link filters overdue', async ({ page }) => {
    await page.goto('/vehicle-checks?status=missed')
    await expect(page.getByText('ST12 UVW')).toBeVisible()
  })

  test('check detail shows operational impact for failed check', async ({ page }) => {
    await page.goto('/vehicle-checks/chk-4')
    await expect(page.getByRole('heading', { name: 'Assigned work impact' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Select replacement vehicle' })).toBeVisible()
  })

  test('templates tab shows template catalogue', async ({ page }) => {
    await page.goto('/vehicle-checks?tab=templates')
    await expect(page.getByRole('heading', { name: 'Check templates' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Driver pre-use walkaround', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Compliance intelligence' })).toBeVisible()
  })

  test('can authorise conditional release on advisory check', async ({ page }) => {
    await page.goto('/vehicle-checks/chk-2')
    await page.getByRole('button', { name: 'Authorise conditional release' }).click()
    await page.getByRole('textbox').first().fill('Mirror repair scheduled')
    await page.getByRole('button', { name: 'Authorise' }).click()
    await expect(page.getByRole('heading', { name: 'Conditional release authorised' })).toBeVisible()
  })
})
