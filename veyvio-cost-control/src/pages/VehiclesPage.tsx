import { Link, useParams } from 'react-router-dom'
import { MoneyText, StatusPill } from '../components/Money'
import { useCostStore } from '../data/CostStore'
import {
  buildVehicleCostProfile,
  listVehicleIds,
  subcategoryLabel,
  sumByStatus,
} from '../domain/vehicle-cost-profile'
import { formatDate, statusLabel } from '../lib/labels'

/** Fleet cost profiles — Blueprint §7 (no dispatch / driver performance). */
export function VehiclesPage() {
  const { costs, organisation } = useCostStore()
  const vehicleIds = listVehicleIds(costs, organisation.id)

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Vehicles</h1>
          <p className="muted">
            Cost profile only — finance, fuel, insurance, tax and maintenance by vehicle. No
            dispatch, booking or driver performance.
          </p>
        </div>
      </header>

      <div className="card-grid">
        {vehicleIds.map((vehicleId) => {
          const profile = buildVehicleCostProfile({
            organisationId: organisation.id,
            vehicleId,
            costs,
          })
          const bucket = (key: string) =>
            profile.buckets.find((b) => b.key === key)?.amountMinor ?? 0
          const byStatus = sumByStatus(profile.costs, vehicleId)
          return (
            <section key={vehicleId} className="panel vehicle-profile-card">
              <div className="org-tree-head">
                <h2 className="reg">
                  <Link to={`/vehicles/${vehicleId}`} className="person-name-link">
                    {vehicleId}
                  </Link>
                </h2>
                {profile.missingOwnershipSignals.length ? (
                  <StatusPill tone="attention">
                    Missing {profile.missingOwnershipSignals.join(', ')}
                  </StatusPill>
                ) : (
                  <StatusPill tone="healthy">Ownership covered</StatusPill>
                )}
              </div>
              <dl className="detail-grid compact vehicle-profile-grid">
                <dt>Insurance</dt>
                <dd>
                  <MoneyText amountMinor={bucket('insurance')} status="committed" />
                </dd>
                <dt>Lease</dt>
                <dd>
                  <MoneyText amountMinor={bucket('lease')} status="committed" />
                </dd>
                <dt>VED / tax</dt>
                <dd>
                  <MoneyText amountMinor={bucket('tax')} status="actual" />
                </dd>
                <dt>Fuel</dt>
                <dd>
                  <MoneyText amountMinor={bucket('fuel')} status="actual" />
                </dd>
                <dt>Maintenance</dt>
                <dd>
                  <MoneyText amountMinor={bucket('maintenance')} />
                </dd>
                <dt>Total attributable</dt>
                <dd>
                  <strong>
                    <MoneyText amountMinor={profile.totalMinor} />
                  </strong>
                </dd>
              </dl>
              <p className="muted small">
                Actual <MoneyText amountMinor={byStatus.actual} status="actual" /> · Committed{' '}
                <MoneyText amountMinor={byStatus.committed} status="committed" /> · Forecast{' '}
                <MoneyText amountMinor={byStatus.forecast} status="forecast" />
              </p>
              <Link to={`/vehicles/${vehicleId}`} className="btn-ghost">
                Open cost profile
              </Link>
            </section>
          )
        })}
        {!vehicleIds.length ? <p className="muted">No vehicle-allocated costs yet.</p> : null}
      </div>
    </div>
  )
}

export function VehicleDetailPage() {
  const { vehicleId = '' } = useParams()
  const { costs, organisation } = useCostStore()
  const id = vehicleId.toUpperCase()
  const profile = buildVehicleCostProfile({
    organisationId: organisation.id,
    vehicleId: id,
    costs,
  })

  if (!profile.costs.length) {
    return (
      <div className="page">
        <p className="callout critical">No costs allocated to {id}.</p>
        <Link to="/vehicles" className="btn-ghost">
          Back to vehicles
        </Link>
      </div>
    )
  }

  const displayBuckets = profile.buckets.filter((b) => b.key !== 'total')

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="person-profile-eyebrow">Vehicle cost profile</p>
          <h1 className="reg">{profile.vehicleId}</h1>
          <p className="muted">
            Blueprint §7 — finance, fuel, insurance, tax, maintenance and total. Documents support
            vehicle costs; this is not Yard workflow.
          </p>
        </div>
        <div className="page-header-actions">
          <Link to="/vehicles" className="btn-ghost">
            All vehicles
          </Link>
          <Link to="/budgets/lines/bl_own" className="btn-ghost">
            Ownership budget
          </Link>
        </div>
      </header>

      {profile.missingOwnershipSignals.length ? (
        <p className="callout attention">
          Ownership profile incomplete for this vehicle: missing{' '}
          {profile.missingOwnershipSignals.join(', ')}. Import or allocate those cost lines.
        </p>
      ) : (
        <p className="callout healthy">
          Insurance, lease/finance and VED are present on this vehicle’s cost profile.
        </p>
      )}

      <div className="kpi-grid dense">
        {displayBuckets.map((b) => (
          <div key={b.key} className="kpi">
            <div className="kpi-label">{b.label}</div>
            <div className="kpi-value">
              <MoneyText amountMinor={b.amountMinor} />
            </div>
            <div className="muted small">{b.costCount} cost line{b.costCount === 1 ? '' : 's'}</div>
          </div>
        ))}
        <div className="kpi">
          <div className="kpi-label">Total attributable</div>
          <div className="kpi-value">
            <MoneyText amountMinor={profile.totalMinor} />
          </div>
        </div>
      </div>

      <section className="panel">
        <h2>Cost lines</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th>Category</th>
                <th>Subtype</th>
                <th>Status</th>
                <th>Evidence</th>
                <th className="num">Attributed</th>
              </tr>
            </thead>
            <tbody>
              {profile.costs.map((c) => {
                const attributed = c.allocations
                  .filter((a) => (a.vehicleId ?? '').toUpperCase() === id)
                  .reduce((s, a) => s + a.amountMinor, 0)
                return (
                  <tr key={c.id}>
                    <td>{formatDate(c.transactionDate)}</td>
                    <td>{c.supplierName}</td>
                    <td>{c.category.replaceAll('_', ' ')}</td>
                    <td>{subcategoryLabel(c.subcategory)}</td>
                    <td>
                      <StatusPill
                        tone={
                          c.status === 'actual'
                            ? 'healthy'
                            : c.status === 'committed'
                              ? 'attention'
                              : 'info'
                        }
                      >
                        {statusLabel(c.status)}
                      </StatusPill>
                    </td>
                    <td>{c.evidence.length ? c.evidence.map((e) => e.label).join(', ') : '—'}</td>
                    <td className="num">
                      <MoneyText amountMinor={attributed} status={c.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
