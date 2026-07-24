import { expect, test } from '@playwright/test'

test.describe('Select company page', () => {
  test('renders cached memberships in mock mode', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'pending_memberships',
        JSON.stringify([
          { tenantId: 'co_a', tenantName: 'Alpha Transport', role: 'member' },
          { tenantId: 'co_b', tenantName: 'Bravo Buses', role: 'yard_manager' },
        ]),
      )
    })

    await page.goto('/select-company')

    await expect(page.getByRole('heading', { name: 'Select company' })).toBeVisible()
    await expect(page.getByText('Only companies you belong to are listed here')).toBeVisible()
    await expect(page.getByRole('button', { name: /Alpha Transport/i })).toBeEnabled()
    await expect(page.getByRole('button', { name: /Bravo Buses/i })).toBeEnabled()
  })

  test('selecting a company navigates to the dashboard', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'pending_memberships',
        JSON.stringify([{ tenantId: 'co_demo', tenantName: 'Demo Operator', role: 'member' }]),
      )
      localStorage.setItem('access_token', 'mock_token_demo')
    })

    await page.goto('/select-company')
    await page.getByRole('button', { name: /Demo Operator/i }).click()
    await page.waitForURL(/\/($|\?)/, { timeout: 15_000 })
  })
})
