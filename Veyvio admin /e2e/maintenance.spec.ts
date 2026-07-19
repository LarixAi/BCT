import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Maintenance hub', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('overview shows attention cards and priority queue', async ({ page }) => {
    await page.goto('/maintenance')
    await expect(page.getByRole('heading', { name: 'Maintenance', exact: true })).toBeVisible()
    await expect(page.getByText('Due today')).toBeVisible()
    await expect(page.getByText('Maintenance attention')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Maintenance risk' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Fleet availability', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'CD34 EFG' }).first()).toBeVisible()
  })

  test('planner tab lists schedule with filters', async ({ page }) => {
    await page.goto('/maintenance?tab=planner')
    await expect(page.getByRole('button', { name: 'List' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Month' })).toBeVisible()
    await expect(page.getByLabel('Filter by depot')).toBeVisible()
    await expect(page.getByLabel('Filter by event type')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Owner' })).toBeVisible()
  })

  test('work orders honor vehicle query filter', async ({ page }) => {
    await page.goto('/maintenance?tab=work-orders&vehicle=CD34')
    await expect(page.getByText('Brake system repair').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'CD34 EFG' }).first()).toBeVisible()
  })

  test('work orders tab lists fleet work orders', async ({ page }) => {
    await page.goto('/maintenance?tab=work-orders')
    await expect(page.getByRole('button', { name: 'Board', exact: true })).toBeVisible()
    await expect(page.getByText('Brake system repair').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'CD34 EFG' }).first()).toBeVisible()
  })

  test('legacy work-orders route redirects into hub', async ({ page }) => {
    await page.goto('/maintenance/work-orders')
    await expect(page).toHaveURL(/\/maintenance\?tab=work-orders/)
    await expect(page.getByText('Brake system repair').first()).toBeVisible()
  })

  test('defects tab shows shared defect register', async ({ page }) => {
    await page.goto('/maintenance?tab=defects')
    await expect(page.getByText('Defect register')).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Brake pedal', exact: true }).first()).toBeVisible()
  })

  test('links open vehicle maintenance tab', async ({ page }) => {
    await page.goto('/maintenance')
    await page.getByRole('link', { name: 'CD34 EFG' }).first().click()
    await expect(page).toHaveURL(/tab=Maintenance/)
    await page.getByRole('button', { name: 'Maintenance', exact: true }).click()
    await expect(page.getByText('Work orders')).toBeVisible()
  })

  test('costs tab includes downtime analytics', async ({ page }) => {
    await page.goto('/maintenance?tab=costs')
    await expect(page.getByText('Planned maintenance')).toBeVisible()
    await expect(page.getByText('Cost per mile')).toBeVisible()
    await expect(page.getByText('Cost alerts')).toBeVisible()
    await expect(page.getByText('Fleet avg cost / mile')).toBeVisible()
    await expect(page.getByText('Downtime timeline')).toBeVisible()
    await expect(page.getByText('Vehicles on downtime')).toBeVisible()
  })

  test('compliance tab shows brake evidence gaps', async ({ page }) => {
    await page.goto('/maintenance?tab=compliance')
    await expect(page.getByText('Missing evidence queue')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Brake evidence gaps' })).toBeVisible()
    await expect(page.getByText('Missing brake performance evidence').first()).toBeVisible()
  })

  test('parts tab lists warehouse and suppliers', async ({ page }) => {
    await page.goto('/maintenance?tab=parts')
    await expect(page.getByText('Approved suppliers')).toBeVisible()
    await expect(page.getByText('Fleet Workshop')).toBeVisible()
    await expect(page.getByText('Parts warehouse')).toBeVisible()
    await expect(page.getByText('Low stock')).toBeVisible()
  })

  test('work orders show estimate approval queue', async ({ page }) => {
    await page.goto('/maintenance?tab=work-orders')
    await expect(page.getByText('Estimates awaiting approval')).toBeVisible()
    await expect(page.getByText('Brake system repair').first()).toBeVisible()
  })

  test('work order kanban board shows lanes and cards', async ({ page }) => {
    await page.goto('/maintenance?tab=work-orders')
    await expect(page.getByRole('button', { name: 'Board', exact: true })).toBeVisible()
    await expect(page.getByText('Intake & planning')).toBeVisible()
    await expect(page.getByText('Workshop').first()).toBeVisible()
    await expect(page.getByText('Awaiting parts').first()).toBeVisible()
    await expect(page.getByText('Brake system repair').first()).toBeVisible()
    await expect(page.getByText('PMI re-test — brake performance').first()).toBeVisible()
  })

  test('work order board toggles to table view', async ({ page }) => {
    await page.goto('/maintenance?tab=work-orders')
    await page.getByRole('button', { name: 'Table', exact: true }).click()
    await expect(page.getByRole('columnheader', { name: 'WO' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Brake system repair' })).toBeVisible()
  })

  test('work order deep link opens manage panel', async ({ page }) => {
    await page.goto('/maintenance?tab=work-orders&wo=wo-4')
    await expect(page.getByText('Work order wo-4')).toBeVisible()
    await expect(page.getByText('Diagnosis / notes')).toBeVisible()
  })

  test('vor board tab loads', async ({ page }) => {
    await page.goto('/maintenance?tab=vor')
    await expect(page.getByRole('heading', { name: 'VOR board' })).toBeVisible()
    await expect(page.getByText('Newly VOR')).toBeVisible()
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

  test('digital PMI form opens from PMI tab', async ({ page }) => {
    await page.goto('/maintenance?tab=pmi')
    await expect(page.getByText('Open PMI work orders')).toBeVisible()
    await page.getByRole('button', { name: 'Open digital PMI' }).first().click()
    await expect(page.getByText(/Digital PMI/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Service brake performance' })).toBeVisible()
    await expect(page.getByText('Cannot complete PMI yet')).toBeVisible()
  })

  test('technician portal shell shows bay queue and job actions', async ({ page }) => {
    await page.goto('/maintenance?tab=technician')
    await expect(page.getByText('Technician portal shell')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Workshop bay' })).toBeVisible()
    await expect(page.getByText('Job queue')).toBeVisible()
    await expect(page.getByText('Brake system repair').first()).toBeVisible()
    await expect(page.getByText('Quick actions')).toBeVisible()
  })
})
