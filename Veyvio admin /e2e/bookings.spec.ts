import { test, expect } from '@playwright/test'
import { advanceWizard, login } from './helpers'

test.describe('Booking flows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('bookings list loads sample data', async ({ page }) => {
    await page.goto('/bookings')
    await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible()
    await expect(page.getByText('BKG-01002')).toBeVisible()
  })

  test('customer entry point pre-fills customer on wizard', async ({ page }) => {
    await page.goto('/customers')
    await page.getByRole('link', { name: 'Create booking' }).first().click()
    await expect(page.getByRole('heading', { name: 'Create booking' })).toBeVisible()
    await advanceWizard(page, 1)
    await expect(page.getByRole('button', { name: 'Oakwood Primary' })).toHaveClass(/ring-command-500/)
  })

  test('passenger entry point opens wizard with passenger step', async ({ page }) => {
    await page.goto('/passengers')
    await page.getByRole('link', { name: 'Create booking' }).first().click()
    await expect(page.getByText('Preparing booking…')).toBeHidden({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Create booking' })).toBeVisible()
    await advanceWizard(page, 2)
    await expect(page.getByText('Oliver Taylor').first()).toBeVisible()
  })

  test('create booking via full wizard', async ({ page }) => {
    await page.goto('/bookings/new')
    await expect(page.getByText('Preparing booking…')).toBeHidden({ timeout: 15_000 })

    await advanceWizard(page, 1)

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

    await page.getByRole('button', { name: 'Confirm booking' }).click()
    await expect(page).toHaveURL(/\/bookings\/bkg-/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('BKG-')
  })

  test('legacy booking type slug redirects to unified wizard', async ({ page }) => {
    await page.goto('/bookings/new/contract')
    await expect(page).toHaveURL(/\/bookings\/new\?journey=contract/)
    await expect(page.getByText('Preparing booking…')).toBeHidden({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Create booking' })).toBeVisible()
  })

  test('dial-a-ride members page loads', async ({ page }) => {
    await page.goto('/dial-a-ride/members')
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible()
    await expect(page.getByText('DAR-10042')).toBeVisible()
  })

  test('accept dial-a-ride request creates jobs', async ({ page }) => {
    await page.goto('/dial-a-ride/requests/dar-req-1')
    await expect(page.getByRole('heading', { name: 'DAR-01001' })).toBeVisible()
    await page.getByRole('button', { name: 'Accept and create jobs' }).click()
    await expect(page.getByText('accepted', { exact: false })).toBeVisible({ timeout: 15_000 })
    await page.goto('/jobs')
    await expect(page.getByText('Dial-a-Ride', { exact: false }).first()).toBeVisible()
  })

  test('school routes register loads', async ({ page }) => {
    await page.goto('/school-routes')
    await expect(page.getByRole('heading', { name: 'School Routes' })).toBeVisible()
    await expect(page.getByText('SCH-RT-1001')).toBeVisible()
  })

  test('publish school route creates jobs', async ({ page }) => {
    await page.goto('/school-routes/sch-route-1')
    await expect(page.getByRole('heading', { name: 'SCH-RT-1001' })).toBeVisible()
    await page.getByRole('button', { name: 'Publish route' }).click()
    await expect(page.getByText('published', { exact: false })).toBeVisible({ timeout: 15_000 })
    await page.goto('/jobs')
    await expect(page.getByText('School Route', { exact: false }).first()).toBeVisible()
  })

  test('schedule planning workspace loads unscheduled jobs', async ({ page }) => {
    await page.goto('/schedule')
    await expect(page.getByRole('heading', { name: 'Schedule', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Planning' })).toBeVisible()
    await expect(page.getByText('Unscheduled jobs')).toBeVisible()
    await expect(page.getByText('Oliver Taylor').first()).toBeVisible()
    await expect(page.getByText('SCH-PM-207')).toBeVisible()
  })

  test('run detail page loads with publish panel', async ({ page }) => {
    await page.goto('/runs/duty-4')
    await expect(page.getByRole('heading', { name: 'EVEN-012', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Publish run' })).toBeVisible()
    await expect(page.getByText('Ready to publish')).toBeVisible()
  })

  test('trip detail page loads with route tab', async ({ page }) => {
    await page.goto('/trips/trip-1072')
    await expect(page.getByRole('heading', { name: 'TRP-1072', level: 1 })).toBeVisible()
    await page.getByRole('button', { name: 'Route', exact: true }).click()
    await expect(page.getByText('Route versions')).toBeVisible()
    await expect(page.getByText('Version 1')).toBeVisible()
  })

  test('dispatch page loads live control panels', async ({ page }) => {
    await page.goto('/dispatch')
    await expect(page.getByRole('heading', { name: 'Dispatch', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Active runs' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Late jobs' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Dispatch controls' })).toBeVisible()
    await page.getByRole('button', { name: 'SCH-AM-104' }).click()
    await page.getByRole('button', { name: 'Mark no-show' }).click()
    await expect(page.getByText('No-show marked')).toBeVisible()
  })

  test('trip detail shows operational trail', async ({ page }) => {
    await page.goto('/trips/trip-1041')
    const trail = page.getByRole('navigation', { name: 'Operational trail' })
    await expect(trail).toBeVisible()
    await expect(trail.getByRole('link', { name: 'Trip TRP-1041' })).toBeVisible()
    await expect(trail.getByRole('link', { name: 'Run SCH-AM-104' })).toBeVisible()
  })

  test('live operations shows control rail for selected run', async ({ page }) => {
    await page.goto('/live-operations?duty=duty-1')
    await expect(page.getByText('Live control')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open journey' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Trip TRP-1041/ })).toBeVisible()
  })

  test('schedule planning workspace shows optimisation panel', async ({ page }) => {
    await page.goto('/schedule?mode=planning')
    await expect(page.getByRole('heading', { name: 'Optimisation' })).toBeVisible()
    await expect(page.getByText('Suggested grouping, stop order, crew and mileage improvements')).toBeVisible()
  })

  test('jobs page loads operational register', async ({ page }) => {
    await page.goto('/jobs')
    await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible()
    await expect(page.getByText('Job register')).toBeVisible()
  })

  test('urgent booking flow', async ({ page }) => {
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
