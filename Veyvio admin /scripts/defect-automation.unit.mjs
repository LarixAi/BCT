/**
 * Defect automation → operational-exceptions dependency (PROD-1 Batch 03).
 * Run: npx tsx scripts/defect-automation.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  defectCreatesOperationalException,
  rulesTriggeredByDefect,
} from '../supabase/functions/_shared/defect-automation.mapping.ts'

assert.equal(defectCreatesOperationalException({ severity: 'critical' }), true)
assert.equal(defectCreatesOperationalException({ severity: 'dangerous' }), true)
assert.equal(defectCreatesOperationalException({ severity: 'safety_critical' }), true)
assert.equal(defectCreatesOperationalException({ severity: 'observation' }), false)
assert.equal(
  defectCreatesOperationalException({ category: 'accessibility', component: 'wheelchair ramp' }),
  false,
)

const critical = rulesTriggeredByDefect({ severity: 'critical' })
assert.ok(critical.some((rule) => rule.actions.includes('create_exception')))
assert.ok(critical.some((rule) => rule.actions.includes('mark_vor')))

const accessibility = rulesTriggeredByDefect({ category: 'accessibility' })
assert.equal(
  accessibility.some((rule) => rule.actions.includes('create_exception')),
  false,
)

const implPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../supabase/functions/_shared/defect-automation.ts',
)
const impl = fs.readFileSync(implPath, 'utf8')
assert.match(
  impl,
  /import\s*\{\s*raiseOperationalException\s*\}\s*from\s*'\.\/operational-exceptions\.ts'/,
  'defect-automation must call operational-exceptions.raiseOperationalException',
)
assert.match(impl, /companyScopedServiceDbForCompany/, 'Batch 03 wrap must declare company-scoped DB')
assert.doesNotMatch(
  impl,
  /import\s*\{[^}]*\badmin\b[^}]*\}\s*from\s*'\.\/supabase\.ts'/,
  'bare admin import must be removed',
)
assert.match(impl, /\.from\('operational_exceptions'\)/)
assert.match(impl, /\.eq\('company_id',\s*input\.companyId\)/)
assert.match(impl, /await raiseOperationalException\(/)
assert.ok(
  impl.indexOf(".from('operational_exceptions')") < impl.indexOf('await raiseOperationalException('),
  'existing open exception must be checked before raising a new one',
)

console.log('defect-automation.unit.mjs: PASS')
