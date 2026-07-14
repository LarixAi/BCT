import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Staff management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('staff hub shows summary cards and directory', async ({ page }) => {
    await page.goto('/staff')
    await expect(page.getByRole('heading', { name: 'Staff', exact: true })).toBeVisible()
    await expect(page.getByText('Total staff')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sarah James' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Michael Brown' })).toBeVisible()
  })

  test('summary card filters staff list', async ({ page }) => {
    await page.goto('/staff')
    await page.getByText('Currently on duty').click()
    await expect(page.getByRole('link', { name: 'Sarah James' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'David King' })).toBeVisible()
  })

  test('invitations tab lists pending invites', async ({ page }) => {
    await page.goto('/staff?tab=invitations')
    await expect(page.getByText('Pending invitations')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Priya Shah' })).toBeVisible()
  })

  test('staff profile shows overview and account tabs', async ({ page }) => {
    await page.goto('/staff/staff-1')
    await expect(page.getByRole('heading', { name: /Sarah James/ })).toBeVisible()
    await expect(page.getByText('Role: Operations Manager')).toBeVisible()
    await page.getByRole('button', { name: 'Account', exact: true }).click()
    await expect(page.getByText('Account and access')).toBeVisible()
    await expect(page.getByText('MFA', { exact: true })).toBeVisible()
  })

  test('linked driver profile from staff record', async ({ page }) => {
    await page.goto('/staff/staff-2')
    await expect(page.getByRole('link', { name: 'Michael Brown' }).first()).toBeVisible()
    await expect(page.getByText('Linked driver')).toBeVisible()
  })

  test('can add staff member via wizard', async ({ page }) => {
    await page.goto('/staff/new')
    await page.getByLabel('First name').fill('Test')
    await page.getByLabel('Last name').fill('Coordinator')
    await page.getByLabel('Work email').fill('test.coord@metrotransport.co.uk')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('Job title').fill('School Transport Coordinator')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Create staff member' }).click()
    await expect(page).toHaveURL(/\/staff\/staff-/)
    await expect(page.getByText('School Transport Coordinator')).toBeVisible()
  })

  test('teams tab shows departments', async ({ page }) => {
    await page.goto('/staff?tab=teams')
    await expect(page.getByRole('heading', { name: 'Teams and departments' })).toBeVisible()
    await expect(page.getByRole('main').getByText('Operations', { exact: true })).toBeVisible()
    await expect(page.getByRole('main').getByText('Yard Operations')).toBeVisible()
  })

  test('availability tab shows shifts and handovers', async ({ page }) => {
    await page.goto('/staff?tab=availability')
    await expect(page.getByText("Today's shifts")).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sarah James' }).first()).toBeVisible()
    await expect(page.getByText('Pending shift handovers')).toBeVisible()
    await expect(page.getByText('Duty controller — Wembley')).toBeVisible()
  })

  test('staff schedule tab shows duty controls', async ({ page }) => {
    await page.goto('/staff/staff-1?tab=schedule')
    await expect(page.getByText('Duty status')).toBeVisible()
    await expect(page.getByText('Shift assignments')).toBeVisible()
    await expect(page.getByRole('button', { name: 'End duty' })).toBeVisible()
  })

  test('can complete staff task', async ({ page }) => {
    await page.goto('/staff/staff-2?tab=tasks')
    await page.getByRole('button', { name: 'Complete' }).click()
    await expect(page.getByText('completed').first()).toBeVisible({ timeout: 5000 })
  })

  test('training tab shows compliance gaps and catalogue', async ({ page }) => {
    await page.goto('/staff?tab=training')
    await expect(page.getByText('Compliance gaps')).toBeVisible()
    await expect(page.getByText('Requirement catalogue')).toBeVisible()
    await expect(page.getByRole('link', { name: 'David King' }).first()).toBeVisible()
  })

  test('staff training tab shows requirements and verify action', async ({ page }) => {
    await page.goto('/staff/staff-4?tab=training')
    await expect(page.getByText('Required training')).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Hybrid vehicle awareness' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Workshop safety' })).toBeVisible()
  })

  test('can verify staff qualification', async ({ page }) => {
    await page.goto('/staff/staff-3?tab=training')
    await expect(page.getByRole('cell', { name: 'Dispatch system training' })).toBeVisible()
    await page.getByRole('button', { name: 'Verify' }).click()
    await expect(page.getByText('valid').first()).toBeVisible({ timeout: 5000 })
  })

  test('access tab shows governance summary and reviews', async ({ page }) => {
    await page.goto('/staff?tab=access')
    await expect(page.getByText('Identity governance policy')).toBeVisible()
    await expect(page.getByText('Pending access reviews')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sarah James' })).toBeVisible()
    await expect(page.getByText('Segregation-of-duties warnings')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tom Harris' })).toBeVisible()
  })

  test('staff documents tab shows records and verify', async ({ page }) => {
    await page.goto('/staff/staff-4?tab=documents')
    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible()
    await expect(page.getByText('DBS documentation')).toBeVisible()
    await page.getByRole('button', { name: 'Verify' }).click()
    await expect(page.getByText('verified').first()).toBeVisible({ timeout: 5000 })
  })

  test('contractor profile shows governance and sessions', async ({ page }) => {
    await page.goto('/staff/staff-6?tab=account')
    await expect(page.getByText('Devices and sessions')).toBeVisible()
    await expect(page.getByText('Contractor access expires in')).toBeVisible()
  })
})
