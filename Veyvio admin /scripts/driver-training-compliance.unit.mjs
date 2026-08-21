/** Training compliance must never exceed 100% when optional courses are completed. */

function trainingCompliancePercent(assignments) {
  const open = assignments.filter((a) => !['completed', 'waived', 'superseded'].includes(String(a.status)))
  const mandatory = assignments.filter((a) => a.mandatory !== false)
  const tracked = mandatory.length > 0 ? mandatory : assignments
  const doneCount = tracked.filter((a) => String(a.status) === 'completed').length
  return tracked.length === 0 ? 100 : Math.min(100, Math.round((doneCount / tracked.length) * 100))
}

const cases = [
  {
    name: 'all mandatory complete',
    assignments: [
      { status: 'completed', mandatory: true },
      { status: 'completed', mandatory: true },
    ],
    expected: 100,
  },
  {
    name: 'optional completions do not inflate compliance',
    assignments: [
      { status: 'completed', mandatory: true },
      { status: 'completed', mandatory: true },
      { status: 'completed', mandatory: false },
      { status: 'completed', mandatory: false },
    ],
    expected: 100,
  },
  {
    name: 'legacy bug: all completed vs few mandatory capped at 100',
    assignments: Array.from({ length: 18 }, () => ({ status: 'completed', mandatory: false })).concat(
      Array.from({ length: 8 }, () => ({ status: 'completed', mandatory: true })),
    ),
    expected: 100,
  },
  {
    name: 'partial mandatory completion',
    assignments: [
      { status: 'completed', mandatory: true },
      { status: 'in_progress', mandatory: true },
    ],
    expected: 50,
  },
]

for (const testCase of cases) {
  const actual = trainingCompliancePercent(testCase.assignments)
  if (actual !== testCase.expected) {
    console.error(`FAIL ${testCase.name}: expected ${testCase.expected}, got ${actual}`)
    process.exit(1)
  }
}

console.log(`PASS driver-training-compliance (${cases.length} cases)`)
