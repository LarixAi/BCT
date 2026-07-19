import { expect, type Page } from '@playwright/test'

export async function login(page: Page) {
  await page.goto('/login')
  const email = page.getByLabel(/email/i)
  if (await email.isVisible().catch(() => false)) {
    const value = await email.inputValue()
    if (!value) {
      await email.fill('demo@veyvio.com')
      await page.getByLabel(/^password$/i).fill('demo')
    }
  }
  await page.getByRole('button', { name: 'Sign in' }).click()

  const mfa = page.getByLabel(/authenticator or recovery code/i)
  if (await mfa.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const hint = page.getByText(/Temporary MFA code/i)
    if (await hint.isVisible().catch(() => false)) {
      const text = (await hint.textContent()) ?? ''
      const code = text.match(/:\s*(\S+)/)?.[1]
      if (code) await mfa.fill(code)
    }
    await page.getByRole('button', { name: /verify|confirm|continue/i }).click()
  }

  await page.waitForURL(/\/($|\?)/, { timeout: 30_000 })
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
