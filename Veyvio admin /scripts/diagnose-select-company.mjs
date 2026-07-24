#!/usr/bin/env node
/**
 * Diagnose /select-company on a running Command dev server.
 * Usage: node scripts/diagnose-select-company.mjs [baseUrl]
 */
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const baseURL = process.argv[2] ?? 'http://localhost:5173'

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env'), 'utf8')
    const env = {}
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) env[m[1].trim()] = m[2].trim()
    }
    return env
  } catch {
    return {}
  }
}

async function main() {
  const env = loadEnv()
  const apiBase = (env.VITE_API_URL ?? '').replace(/\/$/, '')
  const anon = env.VITE_SUPABASE_ANON_KEY ?? ''
  const mock = env.VITE_MOCK_API !== 'false'

  console.log('=== Command select-company diagnostic ===')
  console.log('baseURL:', baseURL)
  console.log('VITE_MOCK_API:', mock ? 'true (mock)' : 'false (live API)')
  console.log('VITE_API_URL:', apiBase || '(not set)')

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  const consoleErrors = []
  const failedRequests = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`)
  })

  const apiResponses = []
  page.on('response', async (res) => {
    const url = res.url()
    if (url.includes('/api/auth/') || url.includes('/auth/v1/token')) {
      let body = ''
      try {
        body = await res.text()
      } catch {
        body = '(unreadable)'
      }
      apiResponses.push({ status: res.status(), url, body: body.slice(0, 300) })
    }
  })

  await page.goto(`${baseURL}/select-company`, { waitUntil: 'networkidle', timeout: 30_000 })

  const snapshot = await page.evaluate(() => {
    const heading = document.querySelector('h1, h2')?.textContent?.trim() ?? ''
    const subtitle = document.querySelector('p')?.textContent?.trim() ?? ''
    const errorEl = document.querySelector('.text-critical, [class*="critical"]')
    const buttons = [...document.querySelectorAll('button')].map((b) => ({
      text: b.textContent?.trim().slice(0, 80),
      disabled: b.disabled,
    }))
    return {
      heading,
      subtitle,
      error: errorEl?.textContent?.trim() ?? null,
      url: location.href,
      accessToken: localStorage.getItem('access_token') ? 'present' : 'missing',
      refreshToken: localStorage.getItem('refresh_token') ? 'present' : 'missing',
      hasTenant: sessionStorage.getItem('has_tenant'),
      membershipsRaw: sessionStorage.getItem('pending_memberships'),
      buttons,
    }
  })

  console.log('\n--- Page state (cold visit, no injected session) ---')
  console.log(JSON.stringify(snapshot, null, 2))

  if (apiResponses.length) {
    console.log('\n--- Auth API responses ---')
    for (const r of apiResponses) console.log(r.status, r.url, '\n ', r.body)
  }

  if (consoleErrors.length) {
    console.log('\n--- Browser console errors ---')
    consoleErrors.forEach((e) => console.log(' ', e))
  }

  if (failedRequests.length) {
    console.log('\n--- Failed network requests ---')
    failedRequests.forEach((e) => console.log(' ', e))
  }

  // Simulate post-MFA state: refresh only, cached memberships
  if (!mock && anon) {
    console.log('\n--- Live API probe (anon memberships — reproduces broken session) ---')
    const res = await fetch(`${apiBase}/api/auth/memberships`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
    })
    const json = await res.json().catch(() => ({}))
    console.log('GET /auth/memberships with anon bearer:', res.status, json.message ?? json)
  }

  const hasNewSubtitle = snapshot.subtitle?.includes('Only companies you belong to')
  console.log('\n--- Verdict ---')
  console.log('Updated frontend loaded:', hasNewSubtitle ? 'YES' : 'NO (restart dev server + hard refresh)')
  if (snapshot.error) console.log('Visible error:', snapshot.error)
  if (snapshot.accessToken === 'missing' && snapshot.refreshToken === 'missing' && snapshot.membershipsRaw) {
    console.log('Likely issue: cached companies but no session tokens in storage')
  }

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
