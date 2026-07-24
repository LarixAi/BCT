import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Tenant isolation — workspace boundaries', () => {
  test('company picker only lists memberships from the authenticated session', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'pending_memberships',
        JSON.stringify([
          { tenantId: 'co_alpha', tenantName: 'Alpha Transport', role: 'member' },
          { tenantId: 'co_bravo', tenantName: 'Bravo Buses', role: 'member' },
        ]),
      )
      localStorage.setItem('access_token', 'mock-demo-token')
    })

    await page.goto('/select-company')
    await expect(page.getByRole('heading', { name: 'Select company' })).toBeVisible()
    await expect(page.getByText('Alpha Transport')).toBeVisible()
    await expect(page.getByText('Bravo Buses')).toBeVisible()
    await expect(page.getByText('Metro Transport Ltd')).not.toBeVisible()
  })

  test('company selection navigates home after secure switch', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'pending_memberships',
        JSON.stringify([{ tenantId: 'co_demo', tenantName: 'Demo Operator', role: 'member' }]),
      )
      localStorage.setItem('access_token', 'mock-demo-token')
    })

    await page.goto('/select-company')
    await page.getByRole('button', { name: /Demo Operator/i }).click()
    await page.waitForURL(/\/($|\?)/, { timeout: 15_000 })
    await expect(page.getByText(/Switching securely/i)).not.toBeVisible({ timeout: 5_000 })
  })

  test('bookings workspace has no hybrid operational layer markers', async ({ page }) => {
    await login(page)
    await page.goto('/bookings')
    await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible({ timeout: 15_000 })
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/hybrid mock|demo operational layer|operations mock active/i)
  })

  test('dial-a-ride accept flow remains tenant-scoped in mock workspace', async ({ page }) => {
    await login(page)
    await page.goto('/dial-a-ride/requests/dar-req-1')
    await expect(page.getByRole('heading', { name: 'DAR-01001' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Accept and create jobs' }).click()
    await expect(page.getByText(/accepted/i)).toBeVisible({ timeout: 15_000 })
  })
})
