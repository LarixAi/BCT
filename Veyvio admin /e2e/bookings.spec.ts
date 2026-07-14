import { test, expect } from '@playwright/test'
import { advanceWizard, login } from './helpers'

test.describe('Booking flows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('bookings list loads sample data', async ({ page }) => {
    await page.goto('/bookings')
    await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible()
    await expect(page.getByText('BKG-01001')).toBeVisible()
  })

  test('customer entry point pre-fills customer on wizard', async ({ page }) => {
    await page.goto('/customers')
    await page.getByRole('link', { name: 'Create booking' }).first().click()
    await expect(page.getByRole('heading', { name: 'Create booking' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Oakwood Primary' })).toHaveClass(/ring-command-500/)
  })

  test('passenger entry point opens wizard with passenger step', async ({ page }) => {
    await page.goto('/passengers')
    await page.getByRole('link', { name: 'Create booking' }).first().click()
    await expect(page.getByText('Preparing booking…')).toBeHidden({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Create booking' })).toBeVisible()
    await advanceWizard(page, 1)
    await expect(page.getByText('Oliver Taylor').first()).toBeVisible()
  })

  test('create booking via full wizard', async ({ page }) => {
    await page.goto('/bookings/new')
    await page.getByRole('button', { name: 'One-way journey' }).click()
    await expect(page.getByText('Preparing booking…')).toBeHidden({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Oakwood Primary' }).click()
    await advanceWizard(page, 1)

    await page.getByLabel('Oliver Taylor').check()
    await advanceWizard(page, 1)

    const addresses = page.getByPlaceholder('Full address')
    await addresses.nth(0).fill('12 Oak Street, Leeds')
    await addresses.nth(1).fill('Oakwood Primary School, Leeds')
    await advanceWizard(page, 4)

    await page.getByText('Auto-plan', { exact: true }).click()
    await expect(page.getByRole('button', { name: 'Accept proposal' })).toBeVisible({ timeout: 15_000 })
    await advanceWizard(page, 1)

    await page.getByRole('button', { name: 'Confirm booking' }).click()
    await expect(page).toHaveURL(/\/bookings\/bkg-/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('BKG-')
  })

  test('urgent booking shortcut', async ({ page }) => {
    await page.goto('/bookings/new/urgent')
    await expect(page.getByRole('heading', { name: 'Create urgent booking' })).toBeVisible()

    await page.getByLabel('Customer').selectOption({ label: 'Oakwood Primary' })
    await page.getByLabel('Passenger').selectOption({ label: 'Oliver Taylor' })
    await page.getByLabel('Pickup address').fill('45 High Street, Leeds')
    await page.getByLabel('Destination').fill('Leeds General Infirmary')
    await page.getByLabel('Reason for urgency').fill('Hospital appointment — vehicle breakdown')
    await page.getByLabel('Authorisation confirmed by').fill('Sarah Mitchell')

    await page.getByRole('button', { name: 'Confirm urgent booking' }).click()
    await expect(page).toHaveURL(/\/bookings\/bkg-/)
    await expect(page.getByText('URGENT')).toBeVisible()
  })

  test('edit booking shows impact preview', async ({ page }) => {
    await page.goto('/bookings/bkg-1001/edit')
    await expect(page.getByRole('heading', { name: /Edit BKG-01001/ })).toBeVisible()

    await page.getByPlaceholder('Full address').first().fill('99 Revised Road, Leeds')
    await page.getByRole('button', { name: 'Preview impact analysis' }).click()
    await expect(page.getByText('This change will affect')).toBeVisible({ timeout: 15_000 })
  })

  test('cancel booking from detail page', async ({ page }) => {
    await page.goto('/bookings/bkg-1001')
    await expect(page.getByRole('heading', { name: 'BKG-01001' })).toBeVisible()

    await page.getByRole('button', { name: 'Cancel booking' }).click()
    await page.getByLabel('Reason').fill('Customer requested cancellation — term ended')
    await page.getByLabel('Requested by').fill('Sarah Mitchell')
    await page.getByRole('button', { name: 'Confirm cancellation' }).click()

    await expect(page.getByText('cancelled', { exact: false }).first()).toBeVisible()
  })

  test('bookings page has urgent shortcut', async ({ page }) => {
    await page.goto('/bookings')
    await page.getByRole('link', { name: 'Urgent booking' }).click()
    await expect(page).toHaveURL('/bookings/new/urgent')
  })

  test('live operations has urgent booking link', async ({ page }) => {
    await page.goto('/live-operations')
    await page.getByRole('link', { name: 'Urgent booking' }).click()
    await expect(page).toHaveURL('/bookings/new/urgent')
  })
})
