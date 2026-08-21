import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(
  new URL(
    '../supabase/migrations/202607300010_executive_sensitive_typed_execution.sql',
    import.meta.url,
  ),
  'utf8',
)
const service = await readFile(
  new URL(
    '../supabase/functions/_shared/executive-sensitive-actions.ts',
    import.meta.url,
  ),
  'utf8',
)

assert.match(migration, /executive_sensitive_execution_outcomes/)
assert.match(migration, /executive_security_settings/)
assert.match(migration, /private\.execute_executive_typed_sensitive_decision/)
assert.match(migration, /company_policy_publication/)
assert.match(migration, /executive_administrator_change/)
assert.match(migration, /director_or_officer_change/)
assert.match(migration, /restricted_export/)
assert.match(migration, /bank_authority_change/)
assert.match(migration, /support_access_change/)
assert.match(migration, /security_settings_change/)
assert.match(migration, /company_closure_or_deletion/)
assert.match(migration, /private\.current_session_is_aal2\(\)/)
assert.match(migration, /private\.user_has_active_executive_access\(company_id\)/)
assert.match(migration, /Hard deletion is never executed/i)
assert.match(migration, /status = 'archived'/)

assert.match(service, /assertTypedProposalTarget/)
assert.match(service, /company_policy_publication/)
assert.match(service, /Hard deletion is not executed/)

console.log('executive-sensitive-typed-execution.unit: ok')
