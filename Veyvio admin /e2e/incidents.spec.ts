import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Incidents', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('hub shows summary cards and incident register', async ({ page }) => {
    await page.goto('/incidents')
    await expect(page.getByRole('heading', { name: 'Incidents', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Open critical/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Awaiting triage/ }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Active incidents' })).toBeVisible()
    await expect(page.getByTestId('incidents-register-table').getByRole('link', { name: 'Passenger fall while boarding' })).toBeVisible()
  })

  test('priority banner shows critical safeguarding incident', async ({ page }) => {
    await page.goto('/incidents')
    const banner = page.getByTestId('priority-incidents')
    await expect(banner.getByText(/critical incident/i)).toBeVisible()
    await expect(banner.getByText('Missing child at school stop')).toBeVisible()
    await expect(banner.getByRole('link', { name: 'Acknowledge' })).toBeVisible()
  })

  test('can open incident detail workspace', async ({ page }) => {
    await page.goto('/incidents/inc-1')
    await expect(page.getByRole('heading', { name: 'INC-2026-001' })).toBeVisible()
    await expect(page.getByText('Passenger fall while boarding')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Timeline' })).toBeVisible()
    await expect(page.getByTestId('safety-controls')).toBeVisible()
  })

  test('incident detail shows timeline and regulatory assessments', async ({ page }) => {
    await page.goto('/incidents/inc-1')
    await page.getByRole('button', { name: 'Timeline' }).click()
    await expect(page.getByTestId('incident-timeline')).toBeVisible()
    await expect(page.getByText('Incident occurred')).toBeVisible()
    await page.getByRole('button', { name: 'Regulatory' }).click()
    await expect(page.getByTestId('regulatory-assessments')).toBeVisible()
    await expect(page.getByTestId('regulatory-assessments').getByText('RIDDOR')).toBeVisible()
  })

  test('can acknowledge unacknowledged incident', async ({ page }) => {
    await page.goto('/incidents/inc-2')
    await expect(page.getByText('Unacknowledged')).toBeVisible()
    await page.getByTestId('acknowledge-incident').click()
    await expect(page.getByText('Unacknowledged')).not.toBeVisible()
  })

  test('report incident workflow', async ({ page }) => {
    await page.goto('/incidents?report=1')
    await expect(page.getByTestId('report-incident-step-1')).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByPlaceholder('Brief description of what happened').fill('Test depot near miss')
    await page.locator('textarea').fill('Vehicle reversed near pedestrian in yard during test')
    await page.getByText('Location', { exact: true }).locator('..').locator('input').fill('Wembley Depot')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByTestId('report-incident-step-3')).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByTestId('report-incident-step-4')).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByTestId('report-incident-step-5')).toBeVisible()
    await page.getByTestId('submit-incident-report').click()
    await expect(page.getByRole('heading', { name: 'Active incidents' })).toBeVisible()
    await expect(page.getByTestId('incidents-register-table').getByText('Test depot near miss')).toBeVisible()
  })

  test('can export incidents register', async ({ page }) => {
    await page.goto('/incidents')
    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('incidents-export-button').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/incidents-export-.*\.csv/)
  })

  test('can contain incident and escalate severity', async ({ page }) => {
    await page.goto('/incidents/inc-5')
    await page.getByTestId('contain-incident').click()
    await expect(page.getByText('Incident contained')).toBeVisible()
    await page.getByTestId('escalate-incident').locator('..').locator('input[placeholder="Reason for escalation"]').fill('Pedestrian proximity risk in depot')
    await page.getByTestId('escalate-incident').click()
    await page.getByRole('button', { name: 'Timeline' }).click()
    await expect(page.getByTestId('incident-timeline').getByText('Severity escalated')).toBeVisible()
  })

  test('can create defect from incident with linked vehicle', async ({ page }) => {
    await page.goto('/incidents/inc-5')
    await page.getByRole('button', { name: 'Vehicle & journey' }).click()
    await page.getByTestId('create-defect-from-incident').locator('..').locator('input[placeholder="Component / area"]').fill('Reversing sensors')
    await page.getByTestId('create-defect-from-incident').click()
    await expect(page.getByRole('link', { name: 'Linked defect' })).toBeVisible()
  })

  test('live operations shows critical incidents banner', async ({ page }) => {
    await page.goto('/live-operations')
    await expect(page.getByTestId('live-critical-incidents')).toBeVisible()
    await expect(page.getByText('Missing child at school stop')).toBeVisible()
  })

  test('regulatory tab filters external assessments', async ({ page }) => {
    await page.goto('/incidents?tab=regulatory')
    await expect(page.getByRole('heading', { name: 'Regulatory assessments' })).toBeVisible()
    await expect(page.getByTestId('incidents-register-table').getByText('INC-2026-006')).toBeVisible()
  })

  test('analytics tab shows incident trends', async ({ page }) => {
    await page.goto('/incidents?tab=analytics')
    await expect(page.getByTestId('incidents-analytics')).toBeVisible()
    await expect(page.getByText('Incident analytics')).toBeVisible()
  })

  test('can upload evidence on incident detail', async ({ page }) => {
    await page.goto('/incidents/inc-5')
    await page.getByRole('button', { name: 'Evidence' }).click()
    await page.getByTestId('evidence-upload').getByPlaceholder('Description').fill('Yard CCTV still')
    await page.getByTestId('evidence-upload').getByRole('button', { name: 'Upload' }).click()
    await expect(page.getByText('Yard CCTV still')).toBeVisible()
  })

  test('search filters incident list', async ({ page }) => {
    await page.goto('/incidents')
    await page.getByPlaceholder('Search incidents…').fill('Missing child')
    await expect(page.getByTestId('incidents-register-table').getByText('Missing child at school stop')).toBeVisible()
    await expect(page.getByTestId('incidents-register-table').getByText('Passenger fall while boarding')).not.toBeVisible()
  })

  test('quick view drawer opens from register', async ({ page }) => {
    await page.goto('/incidents')
    await page.getByTestId('quick-view-inc-1').click()
    await expect(page.getByTestId('incident-quick-drawer')).toBeVisible()
    await expect(page.getByTestId('incident-quick-drawer').getByRole('heading', { name: 'Passenger fall while boarding' })).toBeVisible()
    await page.getByTestId('open-full-incident').click()
    await expect(page.getByRole('heading', { name: 'INC-2026-001' })).toBeVisible()
  })

  test('can edit investigation cause analysis', async ({ page }) => {
    await page.goto('/incidents/inc-1')
    await page.getByRole('button', { name: 'Investigation' }).click()
    await page.getByTestId('confirmed-facts').fill('Passenger fell on wet step\nDriver applied first aid')
    await page.getByTestId('cause-analysis').getByText('Equipment failure').click()
    await page.getByTestId('save-investigation').click()
    await expect(page.getByText('Equipment failure')).toBeVisible()
  })

  test('audit tab shows immutable trail', async ({ page }) => {
    await page.goto('/incidents/inc-1')
    await page.getByRole('button', { name: 'Audit' }).click()
    await expect(page.getByTestId('incident-audit-trail')).toBeVisible()
    await expect(page.getByTestId('incident-audit-trail').getByText('Incident occurred')).toBeVisible()
  })

  test('incident settings page shows automation rules', async ({ page }) => {
    await page.goto('/incidents/settings')
    await expect(page.getByRole('heading', { name: 'Incident settings' })).toBeVisible()
    await expect(page.getByTestId('incident-automation-rules')).toBeVisible()
    await expect(page.getByText('Collision reported')).toBeVisible()
  })

  test('can download regulator export pack', async ({ page }) => {
    await page.goto('/incidents/inc-1')
    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('incident-export-packs').getByRole('button', { name: 'Regulator pack' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/INC-2026-001-regulator-.*\.txt/)
  })

  test('driver safety tab shows linked incidents', async ({ page }) => {
    await page.goto('/drivers/drv-1')
    await page.getByRole('button', { name: 'Safety', exact: true }).click()
    await expect(page.getByTestId('driver-safety-tab')).toBeVisible()
    await expect(page.getByText('Passenger fall while boarding')).toBeVisible()
  })

  test('register shows risk score column', async ({ page }) => {
    await page.goto('/incidents')
    await expect(page.getByTestId('incidents-register-table').getByTestId('incident-risk-badge').first()).toBeVisible()
  })

  test('incident detail shows linked entities and manifest freeze', async ({ page }) => {
    await page.goto('/incidents/inc-2')
    await expect(page.getByTestId('incident-linked-entities')).toBeVisible()
    await expect(page.getByTestId('incident-linked-entities').locator('dt', { hasText: 'School' }).locator('..').getByText('Oakwood Primary School')).toBeVisible()
    await expect(page.getByTestId('incident-linked-entities').getByText('Yes — edits blocked')).toBeVisible()
    await expect(page.getByTestId('incident-risk-badge')).toBeVisible()
  })

  test('can request CCTV clip preservation', async ({ page }) => {
    await page.goto('/incidents/inc-1')
    await page.getByRole('button', { name: 'Evidence' }).click()
    await page.getByTestId('preserve-cctv-cctv-depot-wembley-1').click()
    await expect(page.getByTestId('incident-cctv-assets').getByText('Clip requested')).toBeVisible()
  })

  test('can submit incident to insurer connector', async ({ page }) => {
    await page.goto('/incidents/inc-1')
    await page.getByRole('button', { name: 'Regulatory' }).click()
    await page.getByTestId('submit-insurer-conn-aviva').click()
    await expect(page.getByTestId('incident-insurer-panel').getByText(/AVIVA-/)).toBeVisible()
  })

  test('settings shows telematics feed and can create incident from event', async ({ page }) => {
    await page.goto('/incidents/settings')
    await expect(page.getByTestId('telematics-feed')).toBeVisible()
    await expect(page.getByTestId('process-telematics-tel-feed-1')).toBeVisible()
    await page.getByTestId('process-telematics-tel-feed-1').click()
    await expect(page.getByTestId('telematics-feed').getByText('Processed').first()).toBeVisible()
    await expect(page.getByTestId('telematics-feed').getByRole('link', { name: 'View incident' })).toBeVisible()
    await page.getByTestId('telematics-feed').getByRole('link', { name: 'View incident' }).click()
    await expect(page.getByText('Telematics collision alert')).toBeVisible()
    await page.getByRole('button', { name: 'Vehicle & journey' }).click()
    await expect(page.getByTestId('telematics-snapshot')).toBeVisible()
  })
})
