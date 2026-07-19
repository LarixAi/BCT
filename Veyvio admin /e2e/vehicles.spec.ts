import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Vehicle management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('directory shows summary cards and vehicles', async ({ page }) => {
    await page.goto('/vehicles')
    await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Total/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Available/ })).toBeVisible()
    await expect(page.getByText('VYV-014')).toBeVisible()
    await expect(page.getByText('AB12 CDE')).toBeVisible()
  })

  test('profile shows readiness card and status strip', async ({ page }) => {
    await page.goto('/vehicles/veh-4')
    await expect(page.getByText('VYV-008')).toBeVisible()
    await expect(page.getByTestId('vehicle-status-strip')).toBeVisible()
    await expect(page.getByTestId('vehicle-readiness-card')).toBeVisible()
    await expect(page.getByText('Not eligible for assignment')).toBeVisible()
    await expect(page.getByText('MOT expired', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Compliance', exact: true }).click()
    await expect(page.getByRole('cell', { name: 'MOT / annual test' })).toBeVisible()
  })

  test('can create a new vehicle via wizard identity step', async ({ page }) => {
    await page.goto('/vehicles/new')
    await expect(page.getByRole('heading', { name: 'Add vehicle' })).toBeVisible()
    await expect(page.getByText('Step 1')).toBeVisible()
    await page.getByLabel('Registration').fill('XX99 YYY')
    await page.getByLabel('Make').fill('Test')
    await page.getByLabel('Model').fill('Van')
    await page.getByRole('button', { name: 'Create and continue' }).click()
    await expect(page).toHaveURL(/\/vehicles\/veh-.*\/onboarding\?step=ownership/)
    await expect(page.getByRole('heading', { name: /Onboard XX99 YYY/ })).toBeVisible()
    await expect(page.getByText('Ownership path')).toBeVisible()
  })

  test('resume onboarding opens wizard for awaiting vehicle', async ({ page }) => {
    await page.goto('/vehicles/veh-6/onboarding')
    await expect(page.getByRole('heading', { name: /Onboard/ })).toBeVisible()
    await expect(page.getByText('Step 1')).toBeVisible()
    await expect(page.getByText('Identity')).toBeVisible()
  })

  test('damage tab shows body zone map on VOR vehicle', async ({ page }) => {
    await page.goto('/vehicles/veh-4')
    await page.getByRole('button', { name: 'Damage & media', exact: true }).click()
    await expect(page.getByText('Body zone map')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Front bumper' })).toBeVisible()
    await expect(page.getByText('Scuff on nearside', { exact: false })).toBeVisible()
    await expect(page.getByAltText('rear-dent.jpg')).toBeVisible()
  })

  test('active vehicle shows live telematics on overview', async ({ page }) => {
    await page.goto('/vehicles/veh-1')
    await expect(page.getByText('Live telematics')).toBeVisible()
    await expect(page.getByText('Samsara', { exact: false })).toBeVisible()
    await expect(page.getByText('51.5520', { exact: false })).toBeVisible()
    await expect(page.locator('.maplibregl-map')).toBeVisible()
  })

  test('filter cards narrow the directory', async ({ page }) => {
    await page.goto('/vehicles')
    await page.getByRole('button', { name: /^VOR/ }).click()
    await expect(page.getByText('CD34 EFG')).toBeVisible()
    await expect(page.getByText('AB12 CDE')).not.toBeVisible()
  })

  test('exceptions include vehicle release blocks', async ({ page }) => {
    await page.goto('/exceptions')
    await expect(page.getByText(/Vehicle release blocked/i).first()).toBeVisible()
    await expect(page.getByText('VYV-008')).toBeVisible()
  })
})
