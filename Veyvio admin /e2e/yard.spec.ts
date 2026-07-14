import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Yard operations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('yard hub shows summary cards and live table', async ({ page }) => {
    await page.goto('/yard')
    await expect(page.getByRole('heading', { name: 'Yard Operations' })).toBeVisible()
    await expect(page.getByText('Vehicles on site')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Live yard' })).toBeVisible()
    await expect(page.getByText('CD34 EFG')).toBeVisible()
  })

  test('depot selector filters vehicles', async ({ page }) => {
    await page.goto('/yard?depot=depot-croydon')
    await expect(page.getByText(/Croydon Depot · Sunday 12 July/)).toBeVisible()
    await expect(page.getByText('KL78 MNO')).toBeVisible()
    await expect(page.getByText('CD34 EFG')).not.toBeVisible()
  })

  test('movements tab shows ledger', async ({ page }) => {
    await page.goto('/yard?tab=movements')
    await expect(page.getByText('Movement ledger')).toBeVisible()
    await expect(page.getByText('Workshop transfer')).toBeVisible()
    await expect(page.getByText('Audit trail')).toBeVisible()
  })

  test('can open vehicle operations drawer', async ({ page }) => {
    await page.goto('/yard')
    await page.getByText('CD34 EFG').click()
    await expect(page.getByText('Vehicle operations')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open vehicle profile →' })).toBeVisible()
  })

  test('can record vehicle movement', async ({ page }) => {
    await page.goto('/yard?depot=depot-croydon')
    await page.getByRole('button', { name: 'Record movement' }).click()
    await page.getByLabel('Destination').fill('Bay C3')
    await page.getByRole('button', { name: 'Record movement' }).last().click()
    await expect(page.getByText('Bay C3').first()).toBeVisible({ timeout: 5000 })
  })

  test('tasks tab shows yard task queue', async ({ page }) => {
    await page.goto('/yard?tab=tasks')
    await expect(page.getByRole('heading', { name: 'Yard task queue' })).toBeVisible()
    await expect(page.getByText('Complete return inspection')).toBeVisible()
  })

  test('exceptions tab shows operational issues', async ({ page }) => {
    await page.goto('/yard?tab=exceptions')
    await expect(page.getByRole('heading', { name: 'Operational exceptions' })).toBeVisible()
  })

  test('yard map tab shows depot zones', async ({ page }) => {
    await page.goto('/yard?tab=map')
    await expect(page.getByRole('heading', { name: 'Yard map' })).toBeVisible()
    await expect(page.getByText('Parking bays A')).toBeVisible()
  })

  test('handover tab shows shift summary', async ({ page }) => {
    await page.goto('/yard?tab=handover')
    await expect(page.getByRole('heading', { name: 'Shift handover' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Submit for acceptance' })).toBeVisible()
  })

  test('can create yard task', async ({ page }) => {
    await page.goto('/yard')
    await page.getByRole('button', { name: 'Create task' }).click()
    await page.getByRole('button', { name: 'Create task' }).last().click()
    await page.goto('/yard?tab=tasks')
    await expect(page.getByText('Return inspection').first()).toBeVisible()
  })
})
