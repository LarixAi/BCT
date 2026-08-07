import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(
  new URL(
    '../supabase/migrations/202607300006_executive_sensitive_actions.sql',
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
const commandApi = await readFile(
  new URL('../supabase/functions/command-api/index.ts', import.meta.url),
  'utf8',
)

for (const table of [
  'executive_board_meetings',
  'executive_decisions',
  'executive_policies',
  'executive_company_records',
  'executive_conflicts',
  'executive_budget_mandates',
  'executive_sensitive_action_requests',
  'executive_sensitive_action_approvals',
]) {
  assert.match(migration, new RegExp(`'${table}'`), `${table} must be in the RLS inventory`)
}

for (const actionType of [
  'executive_administrator_change',
  'director_or_officer_change',
  'annual_budget_approval',
  'company_policy_publication',
  'restricted_export',
  'bank_authority_change',
  'support_access_change',
  'security_settings_change',
  'company_closure_or_deletion',
]) {
  assert.match(migration, new RegExp(`'${actionType}'`))
}

assert.match(migration, /private\.current_session_is_aal2\(\)/)
assert.match(migration, /private\.user_has_active_executive_access\(company_id\)/)
assert.match(migration, /revoke insert, update, delete, truncate, references, trigger/)
assert.match(migration, /audit_events_append_only_guard/)
assert.match(migration, /executive_sensitive_approvals_append_only_guard/)
assert.match(migration, /executive_sensitive_request_validate/)
assert.match(migration, /executive_sensitive_request_protect/)
assert.match(migration, /executive_sensitive_approval_apply/)
assert.match(migration, /for update;/i)
assert.match(migration, /proposer_user_id = new\.approver_user_id/)
assert.match(migration, /created_at >= decided_at - interval '10 minutes'/)
assert.match(migration, /auth_strength in \(/)
assert.match(migration, /access\.app_type = 'EXECUTIVE'/)
assert.match(migration, /lower\(role\.name\) in \('director', 'board_member'\)/)
assert.match(migration, /Sensitive-action proposal evidence is immutable/)
assert.match(migration, /executive\.sensitive_action\.status_changed/)

const approvalTrigger = migration.indexOf(
  'create trigger executive_sensitive_approval_apply',
)
const approvalAuditTrigger = migration.indexOf(
  'create trigger executive_sensitive_approval_audit',
)
assert.ok(approvalTrigger >= 0 && approvalAuditTrigger > approvalTrigger)

assert.match(service, /requireExecutiveSession\(context, request, true\)/)
assert.match(service, /requireExecutiveSession\(context, request, false\)/)
assert.match(service, /independent_reviewer_required/)
assert.match(service, /executionState: 'not_executed'/)
assert.doesNotMatch(service, /\.update\(\{\s*status: nextStatus/)
assert.match(commandApi, /executive\/sensitive-actions/)
assert.match(commandApi, /executiveSensitiveActionDecision/)

console.log('Executive sensitive-action database control tests passed')
