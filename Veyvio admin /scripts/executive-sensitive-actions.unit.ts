import assert from 'node:assert/strict'
import {
  decideExecutiveAuthorisation,
  executiveCapabilitiesForRoles,
} from '../supabase/functions/_shared/executive-authorisation.ts'

const companyId = '00000000-0000-4000-8000-000000000001'
const proposerUserId = '00000000-0000-4000-8000-000000000002'
const reviewerUserId = '00000000-0000-4000-8000-000000000003'

function decision(input: {
  actorUserId: string
  roles: string[]
  action: string
  proposerUserId?: string
  resourceCompanyId?: string
}) {
  return decideExecutiveAuthorisation({
    actorUserId: input.actorUserId,
    roleKeys: input.roles,
    action: input.action,
    companyId,
    resourceCompanyId: input.resourceCompanyId ?? companyId,
    proposerUserId: input.proposerUserId,
  })
}

assert.equal(
  decision({
    actorUserId: proposerUserId,
    roles: ['chief_executive'],
    action: 'executive.budget.propose',
  }).allowed,
  true,
)

for (const action of [
  'executive.directors.propose',
  'executive.bank_authority.propose',
  'executive.company_close.propose',
]) {
  assert.equal(
    decision({
      actorUserId: proposerUserId,
      roles: ['chief_executive'],
      action,
    }).allowed,
    true,
    `${action} should be available to a chief executive`,
  )
}

const selfApproval = decision({
  actorUserId: proposerUserId,
  roles: ['director'],
  action: 'executive.board_reserved.approve',
  proposerUserId,
})
assert.equal(selfApproval.allowed, false)
assert.equal(selfApproval.code, 'separation_of_duties_required')

const independentApproval = decision({
  actorUserId: reviewerUserId,
  roles: ['board_member'],
  action: 'executive.board_reserved.approve',
  proposerUserId,
})
assert.equal(independentApproval.allowed, true)

const administratorApproval = decision({
  actorUserId: reviewerUserId,
  roles: ['company_administrator'],
  action: 'executive.board_reserved.approve',
  proposerUserId,
})
assert.equal(administratorApproval.allowed, false)
assert.equal(administratorApproval.code, 'permission_denied')

const otherCompanyApproval = decision({
  actorUserId: reviewerUserId,
  roles: ['director'],
  action: 'executive.board_reserved.approve',
  proposerUserId,
  resourceCompanyId: '00000000-0000-4000-8000-000000000099',
})
assert.equal(otherCompanyApproval.allowed, false)
assert.equal(otherCompanyApproval.code, 'resource_scope_forbidden')

const capabilities = executiveCapabilitiesForRoles(['board_member'])
assert.equal(capabilities.includes('executive.board_reserved.approve'), true)
assert.equal(capabilities.includes('executive.accounts.manage'), false)

console.log('Executive sensitive-action policy unit tests passed')
