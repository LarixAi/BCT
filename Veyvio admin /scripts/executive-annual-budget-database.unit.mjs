import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(
  new URL(
    '../supabase/migrations/202607300007_executive_annual_budget_approval.sql',
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
const pages = await readFile(
  new URL(
    '../supabase/functions/_shared/executive-pages.ts',
    import.meta.url,
  ),
  'utf8',
)
const commandApi = await readFile(
  new URL('../supabase/functions/command-api/index.ts', import.meta.url),
  'utf8',
)

assert.match(migration, /create table public\.executive_annual_budgets/)
assert.match(migration, /unique \(company_id, financial_year, version\)/)
assert.match(migration, /where status = 'approved'/)
assert.match(migration, /executive_annual_budgets_aal2_read/)
assert.match(migration, /private\.current_session_is_aal2\(\)/)
assert.match(migration, /private\.user_has_active_executive_access\(company_id\)/)
assert.match(migration, /revoke insert, update, delete, truncate, references, trigger/)
assert.match(migration, /Annual-budget proposal content is immutable/)
assert.match(migration, /create_executive_annual_budget_proposal/)
assert.match(migration, /from public, anon, authenticated/)
assert.match(migration, /pg_advisory_xact_lock/)
assert.match(migration, /for update;/i)
assert.match(migration, /content_hash := encode\(digest/)
assert.match(migration, /Annual-budget proposal integrity check failed/)
assert.match(migration, /status = 'superseded'/)
assert.match(migration, /new\.executed_at := decision_time/)
assert.match(migration, /executive\.annual_budget\.approved/)
assert.match(migration, /executive_annual_budget_append_only/)

assert.match(service, /actionType === 'annual_budget_approval'/)
assert.match(service, /annual_budget_route_required/)
assert.match(service, /validateAnnualBudgetProposal/)
assert.match(service, /create_executive_annual_budget_proposal/)
assert.match(service, /requireExecutiveSession\(context, request, true\)/)
assert.match(service, /approveAction: 'executive\.budget\.approve'/)
assert.match(service, /executionState: updated\.executed_at \? 'executed'/)

assert.match(pages, /executive_annual_budgets/)
assert.match(pages, /pendingBudgetApprovals/)
assert.match(pages, /canCurrentUserApprove/)

assert.match(commandApi, /executive\/annual-budgets\/proposals/)
assert.match(commandApi, /executiveAnnualBudgetDecision/)
assert.match(commandApi, /'annual_budget_approval'/)

console.log('Executive annual-budget database control tests passed')
