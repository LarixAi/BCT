import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MoneyText, StatusPill } from '../components/Money'
import { PersonAvatar } from '../components/PersonAvatar'
import { WageHubNav } from '../components/WageHubNav'
import { useCostStore } from '../data/CostStore'
import {
  buildOrgTree,
  countByEmploymentKind,
  incompleteAllocationCount,
  listWageCostMembers,
  sumExpectedEmployerCost,
  type EmployeeCostReference,
  type OrgTreeNode,
} from '../domain/org-structure'

export function OrganisationPage() {
  const store = useCostStore()
  const orgNodes = store.orgNodes ?? []
  const employeeCostReferences = store.employeeCostReferences ?? []
  const [showAllPeople, setShowAllPeople] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [externalPayrollId, setExternalPayrollId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [expectedPounds, setExpectedPounds] = useState('')
  const [costCentre, setCostCentre] = useState('')
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const tree = useMemo(() => buildOrgTree(orgNodes), [orgNodes])
  const wageMembers = useMemo(
    () => listWageCostMembers(employeeCostReferences),
    [employeeCostReferences],
  )
  const visiblePeople = useMemo(() => {
    const base = showAllPeople
      ? [...employeeCostReferences].sort((a, b) => a.displayName.localeCompare(b.displayName))
      : wageMembers
    if (!selectedNodeId) return base
    const subtree = collectSubtreeIds(orgNodes, selectedNodeId)
    return base.filter((p) => subtree.has(p.orgNodeId))
  }, [employeeCostReferences, wageMembers, showAllPeople, selectedNodeId, orgNodes])

  const kindCounts = countByEmploymentKind(employeeCostReferences)
  const incomplete = incompleteAllocationCount(employeeCostReferences)
  const expectedTotal = sumExpectedEmployerCost(employeeCostReferences)
  const nodeTitle = Object.fromEntries(orgNodes.map((n) => [n.id, n.title]))

  async function onAddWageMember(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    setFormMessage(null)
    setSaving(true)
    try {
      const pounds = Number(expectedPounds || '0')
      if (!Number.isFinite(pounds) || pounds < 0) {
        throw new Error('Expected employer cost must be a non-negative amount in pounds')
      }
      const result = await store.upsertEmployeeCostReferences([
        {
          externalPayrollId: externalPayrollId.trim(),
          displayName: displayName.trim(),
          costCentre: costCentre.trim(),
          employmentKind: 'employed',
          wageCostBearing: true,
          expectedEmployerCostMinor: Math.round(pounds * 100),
          allocationComplete: Boolean(costCentre.trim()),
          active: true,
        },
      ])
      setFormMessage(`Saved ${result.upserted} wage-cost member(s).`)
      setExternalPayrollId('')
      setDisplayName('')
      setExpectedPounds('')
      setCostCentre('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save wage-cost member')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Organisation</h1>
          <p className="muted">
            Structure for cost allocation — wage members only for payroll cost control. Not an HR
            record and not a PAYE directory.
          </p>
        </div>
      </header>

      <WageHubNav />

      <p className="callout info">
        Board and volunteer roles may appear in the structure without employer wage cost. Only
        wage-cost-bearing members feed payroll cost control. Add members here so payroll summary
        imports can match provider ids.
      </p>

      {!orgNodes.length ? (
        <p className="callout attention">
          Organisational tree is not loaded for this company yet. You can still maintain the
          wage-cost member register below.
        </p>
      ) : null}

      <div className="kpi-grid dense">
        <div className="kpi">
          <div className="kpi-label">Wage-cost members</div>
          <div className="kpi-value">{wageMembers.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Expected employer cost</div>
          <div className="kpi-value">
            <MoneyText amountMinor={expectedTotal} />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Incomplete allocations</div>
          <div className={`kpi-value ${incomplete ? 'tone-critical' : ''}`.trim()}>
            {incomplete}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Employed on wages</div>
          <div className="kpi-value">{kindCounts.employed}</div>
        </div>
      </div>

      <section className="panel">
        <h2>Add wage-cost member</h2>
        <p className="muted">
          Upserts by external payroll id. Expected employer cost is the register value used for
          variance checks — not a payslip.
        </p>
        <form className="form-grid" onSubmit={onAddWageMember}>
          <label>
            External payroll id
            <input
              value={externalPayrollId}
              onChange={(e) => setExternalPayrollId(e.target.value)}
              required
              placeholder="PRV-1001"
            />
          </label>
          <label>
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Alex Founder"
            />
          </label>
          <label>
            Expected employer cost (£)
            <input
              value={expectedPounds}
              onChange={(e) => setExpectedPounds(e.target.value)}
              inputMode="decimal"
              placeholder="5118.00"
            />
          </label>
          <label>
            Cost centre
            <input
              value={costCentre}
              onChange={(e) => setCostCentre(e.target.value)}
              placeholder="CC-OPS"
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save member'}
            </button>
          </div>
        </form>
        {formMessage ? <p className="callout healthy">{formMessage}</p> : null}
        {formError ? <p className="callout critical">{formError}</p> : null}
      </section>

      <div className="org-layout">
        <section className="panel org-tree-panel">
          <div className="org-tree-head">
            <h2>Organisational structure</h2>
            {selectedNodeId ? (
              <button type="button" className="btn-ghost" onClick={() => setSelectedNodeId(null)}>
                Clear filter
              </button>
            ) : null}
          </div>
          {tree.length ? (
            <ul className="org-tree">
              {tree.map((node) => (
                <OrgBranch
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedId={selectedNodeId}
                  onSelect={setSelectedNodeId}
                  people={employeeCostReferences}
                />
              ))}
            </ul>
          ) : (
            <p className="muted">No organisational nodes loaded for this company.</p>
          )}
        </section>

        <section className="panel">
          <div className="org-tree-head">
            <h2>{showAllPeople ? 'All structure roles' : 'Members making a wage'}</h2>
            <label className="toggle-inline">
              <input
                type="checkbox"
                checked={showAllPeople}
                onChange={(e) => setShowAllPeople(e.target.checked)}
              />
              Show unpaid board / volunteers
            </label>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Team</th>
                  <th>Kind</th>
                  <th>Cost centre</th>
                  <th className="num">Employer cost</th>
                  <th className="num">Overtime</th>
                  <th>Allocation</th>
                </tr>
              </thead>
              <tbody>
                {visiblePeople.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="person-cell">
                        <PersonAvatar
                          name={p.displayName}
                          hue={p.payInputs?.avatarHue ?? 168}
                          size="sm"
                        />
                        <div>
                          <Link to={`/wages/people/${p.id}`} className="person-name-link">
                            {p.displayName}
                          </Link>
                          <div className="muted small">{p.externalPayrollId}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.roleTitle}</td>
                    <td>{nodeTitle[p.orgNodeId] ?? p.orgNodeId}</td>
                    <td>{kindLabel(p.employmentKind)}</td>
                    <td>{p.costCentre}</td>
                    <td className="num">
                      {p.wageCostBearing ? (
                        <MoneyText amountMinor={p.expectedEmployerCostMinor} />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="num">
                      {p.overtimeMinor ? <MoneyText amountMinor={p.overtimeMinor} /> : '—'}
                    </td>
                    <td>
                      {!p.wageCostBearing ? (
                        <StatusPill tone="neutral">n/a</StatusPill>
                      ) : p.allocationComplete ? (
                        <StatusPill tone="healthy">Complete</StatusPill>
                      ) : (
                        <StatusPill tone="attention">Incomplete</StatusPill>
                      )}
                    </td>
                  </tr>
                ))}
                {!visiblePeople.length ? (
                  <tr>
                    <td colSpan={8} className="muted">
                      No people match this filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

function OrgBranch({
  node,
  depth,
  selectedId,
  onSelect,
  people,
}: {
  node: OrgTreeNode
  depth: number
  selectedId: string | null
  onSelect: (id: string) => void
  people: EmployeeCostReference[]
}) {
  const wageCount = people.filter((p) => p.orgNodeId === node.id && p.wageCostBearing && p.active)
    .length
  const active = selectedId === node.id

  return (
    <li>
      <button
        type="button"
        className={`org-node${active ? ' active' : ''}`}
        style={{ paddingLeft: `${0.55 + depth * 0.85}rem` }}
        onClick={() => onSelect(node.id)}
      >
        <span className="org-node-title">{node.title}</span>
        {wageCount ? <span className="org-node-count">{wageCount} wage</span> : null}
      </button>
      {node.summary && depth <= 2 ? (
        <div className="org-node-summary" style={{ paddingLeft: `${0.55 + depth * 0.85}rem` }}>
          {node.summary}
        </div>
      ) : null}
      {node.children.length ? (
        <ul className="org-tree">
          {node.children.map((child) => (
            <OrgBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              people={people}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function collectSubtreeIds(
  nodes: { id: string; parentId: string | null }[],
  rootId: string,
): Set<string> {
  const children = new Map<string, string[]>()
  for (const n of nodes) {
    if (!n.parentId) continue
    const list = children.get(n.parentId) ?? []
    list.push(n.id)
    children.set(n.parentId, list)
  }
  const out = new Set<string>([rootId])
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop()!
    for (const child of children.get(id) ?? []) {
      if (!out.has(child)) {
        out.add(child)
        stack.push(child)
      }
    }
  }
  return out
}

function kindLabel(kind: EmployeeCostReference['employmentKind']): string {
  if (kind === 'board') return 'Board'
  if (kind === 'volunteer') return 'Volunteer'
  if (kind === 'contractor') return 'Contractor'
  if (kind === 'agency') return 'Agency'
  return 'Employed'
}
