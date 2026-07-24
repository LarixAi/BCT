#!/usr/bin/env node
/** Simulate user's browser storage after MFA + multi-company */
import { chromium } from '@playwright/test'

const baseURL = process.argv[2] ?? 'http://localhost:5173'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  await context.addInitScript(() => {
    sessionStorage.setItem(
      'pending_memberships',
      JSON.stringify([
        { tenantId: 'co_test_a', tenantName: 'veyvio Fleet LTD', role: 'member' },
        { tenantId: 'co_test_b', tenantName: 'Brent Community Transport', role: 'member' },
      ]),
    )
    // MFA bug scenario: refresh saved, access token missing
    localStorage.setItem('refresh_token', 'fake_refresh_for_probe')
    localStorage.removeItem('access_token')
  })

  const page = await context.newPage()
  const apiResponses = []
  page.on('response', async (res) => {
    if (res.url().includes('/api/auth/') || res.url().includes('/auth/v1/token')) {
      apiResponses.push({ status: res.status(), url: res.url(), body: (await res.text().catch(() => '')).slice(0, 200) })
    }
  })

  await page.goto(`${baseURL}/select-company`, { waitUntil: 'networkidle', timeout: 30_000 })
  await page.waitForTimeout(1500)

  const state = await page.evaluate(() => ({
    heading: document.querySelector('h1')?.textContent?.trim(),
    subtitle: [...document.querySelectorAll('p')].map((p) => p.textContent?.trim()).filter(Boolean),
    error: document.querySelector('.text-critical')?.textContent?.trim() ?? null,
    buttons: [...document.querySelectorAll('button')].map((b) => ({ text: b.textContent?.trim().slice(0, 60), disabled: b.disabled })),
    accessToken: localStorage.getItem('access_token') ? 'present' : 'missing',
    refreshToken: localStorage.getItem('refresh_token') ? 'present' : 'missing',
  }))

  console.log('=== Simulated MFA session (refresh only, cached companies) ===')
  console.log(JSON.stringify(state, null, 2))
  console.log('\nAPI calls:')
  apiResponses.forEach((r) => console.log(r.status, r.url, r.body))

  await browser.close()
}

main().catch(console.error)
