import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Fleet Resources', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('hub shows attention cards and overview', async ({ page }) => {
    await page.goto('/fleet-resources')
    await expect(page.getByRole('heading', { name: 'Fleet Resources', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Missing receipts/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Tyres needing attention/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible()
    await expect(page.getByText(/Missing fuel receipt|Depot stock|Tyre|Equipment/i).first()).toBeVisible()
  })

  test('fuel register shows seeded transactions', async ({ page }) => {
    await page.goto('/fleet-resources?tab=fuel')
    await expect(page.getByText('Fuel & energy register')).toBeVisible()
    await expect(page.getByRole('link', { name: 'AB12 CDE' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'CD34 EFG' }).first()).toBeVisible()
  })

  test('missing receipt filter', async ({ page }) => {
    await page.goto('/fleet-resources?tab=fuel&filter=missing_receipt')
    await expect(page.getByRole('button', { name: 'Missing receipt', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'CD34 EFG' }).first()).toBeVisible()
  })

  test('tyres tab shows register and position map', async ({ page }) => {
    await page.goto('/fleet-resources?tab=tyres')
    await expect(page.getByText('Tyre register')).toBeVisible()
    await expect(page.getByText('Vehicle position map')).toBeVisible()
    await expect(page.getByText('TY-WEM-0401')).toBeVisible()
  })

  test('equipment tab lists QR assets', async ({ page }) => {
    await page.goto('/fleet-resources?tab=equipment')
    await expect(page.getByText('Equipment assets')).toBeVisible()
    await expect(page.getByText('EQ-WEM-WC-040')).toBeVisible()
    await expect(page.getByText('Missing').first()).toBeVisible()
  })

  test('stock tab shows transfers', async ({ page }) => {
    await page.goto('/fleet-resources?tab=stock')
    await expect(page.getByText('Depot stock')).toBeVisible()
    await expect(page.getByText('Stock transfers')).toBeVisible()
    await expect(page.getByText('AdBlue').first()).toBeVisible()
  })

  test('analytics and finance tabs render', async ({ page }) => {
    await page.goto('/fleet-resources?tab=analytics')
    await expect(page.getByText('Operational intelligence')).toBeVisible()
    await expect(page.getByText('Stock forecast (7 days)')).toBeVisible()
    await page.goto('/fleet-resources?tab=finance')
    await expect(page.getByText('Budgets & whole-life cost')).toBeVisible()
    await expect(page.getByText('Ops — Wembley').first()).toBeVisible()
  })

  test('integrations tab lists connectors', async ({ page }) => {
    await page.goto('/fleet-resources?tab=integrations')
    await expect(page.getByRole('heading', { name: 'Integrations' })).toBeVisible()
    await expect(page.getByText('Allstar')).toBeVisible()
    await expect(page.getByText('Xero')).toBeVisible()
  })

  test('vehicle overview shows fuel & costs panel', async ({ page }) => {
    await page.goto('/vehicles/veh-1')
    await expect(page.getByRole('heading', { name: 'Fuel & costs' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open fleet resources →' })).toBeVisible()
  })

  test('vehicle wheels tab links to tyre register', async ({ page }) => {
    await page.goto('/vehicles/veh-1?tab=wheels')
    await expect(page.getByText('Fleet Resources tyre assets')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open fleet resources tyres →' })).toBeVisible()
  })
})
