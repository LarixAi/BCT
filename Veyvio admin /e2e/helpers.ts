import { expect, type Page } from '@playwright/test'

export async function login(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('/')
}

export async function advanceWizard(page: Page, times = 1) {
  const stepper = page.getByRole('navigation', { name: 'Booking progress' })
  for (let i = 0; i < times; i++) {
    const active = stepper.locator('button.bg-command-600')
    const label = ((await active.textContent()) ?? '').trim()
    await page.getByRole('button', { name: 'Continue' }).click()
    if (label) {
      await expect(active).not.toHaveText(label, { timeout: 10_000 })
    } else {
      await page.waitForTimeout(200)
    }
  }
}
