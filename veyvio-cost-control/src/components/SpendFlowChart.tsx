import { formatMoney } from '../domain/money'
import type { SpendFlowPoint } from '../domain/spend-flow'

type Props = {
  points: SpendFlowPoint[]
  actualTotalMinor: number
  committedTotalMinor: number
}

/**
 * Sequence-style divergent bars: Actual↑ (teal) / Committed↓ (mint).
 * Pure SVG — no chart library.
 */
export function SpendFlowChart({ points, actualTotalMinor, committedTotalMinor }: Props) {
  if (!points.length) {
    return (
      <p className="muted">No actual or committed costs to chart for this period.</p>
    )
  }

  const width = 640
  const height = 260
  const padL = 44
  const padR = 16
  const padT = 16
  const padB = 36
  const midY = padT + (height - padT - padB) / 2
  const plotW = width - padL - padR
  const halfH = (height - padT - padB) / 2 - 8

  const maxActual = Math.max(...points.map((p) => p.actualMinor), 1)
  const maxCommitted = Math.max(...points.map((p) => p.committedMinor), 1)
  const slot = plotW / points.length
  const barW = Math.min(18, Math.max(8, slot * 0.45))

  const scaleUp = (v: number) => (v / maxActual) * halfH
  const scaleDown = (v: number) => (v / maxCommitted) * halfH

  const yTick = (v: number, side: 'up' | 'down') => {
    const k = v >= 1_000_00 ? `${Math.round(v / 1_000_00)}k` : formatMoney(v).replace('£', '')
    return side === 'up' ? k : k
  }

  return (
    <div className="spend-flow">
      <div className="spend-flow-head">
        <div>
          <h2 className="spend-flow-title">Spend flow</h2>
          <p className="muted small">Actual posted vs commitments by week — not bank cashflow</p>
        </div>
        <div className="spend-flow-legend" aria-hidden>
          <span className="legend-item">
            <span className="legend-swatch actual" /> Actual
          </span>
          <span className="legend-item">
            <span className="legend-swatch committed" /> Committed
          </span>
        </div>
      </div>

      <div className="spend-flow-body">
        <svg
          className="spend-flow-svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Spend flow chart. Actual ${formatMoney(actualTotalMinor)}, committed ${formatMoney(committedTotalMinor)}.`}
        >
          <line
            x1={padL}
            x2={width - padR}
            y1={midY}
            y2={midY}
            className="spend-flow-axis"
          />
          <text x={8} y={padT + 10} className="spend-flow-tick">
            {yTick(maxActual, 'up')}
          </text>
          <text x={8} y={midY + 4} className="spend-flow-tick">
            0
          </text>
          <text x={8} y={height - padB + 4} className="spend-flow-tick">
            {yTick(maxCommitted, 'down')}
          </text>

          {points.map((p, i) => {
            const cx = padL + slot * i + slot / 2
            const upH = scaleUp(p.actualMinor)
            const downH = scaleDown(p.committedMinor)
            const showLabel = points.length <= 8 || i % 2 === 0
            return (
              <g key={p.weekStart}>
                {p.actualMinor > 0 ? (
                  <rect
                    x={cx - barW / 2}
                    y={midY - upH}
                    width={barW}
                    height={upH}
                    rx={barW / 2}
                    className="spend-bar actual"
                  >
                    <title>{`${p.label}: Actual ${formatMoney(p.actualMinor)}`}</title>
                  </rect>
                ) : null}
                {p.committedMinor > 0 ? (
                  <rect
                    x={cx - barW / 2}
                    y={midY}
                    width={barW}
                    height={downH}
                    rx={barW / 2}
                    className="spend-bar committed"
                  >
                    <title>{`${p.label}: Committed ${formatMoney(p.committedMinor)}`}</title>
                  </rect>
                ) : null}
                {showLabel ? (
                  <text
                    x={cx}
                    y={height - 10}
                    textAnchor="middle"
                    className="spend-flow-xlabel"
                  >
                    {p.label}
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>

        <div className="spend-flow-cards">
          <div className="spend-flow-card">
            <div className="spend-flow-card-label">Actual</div>
            <div className="spend-flow-card-value actual">{formatMoney(actualTotalMinor)}</div>
            <div className="muted small">Posted to ledger</div>
          </div>
          <div className="spend-flow-card">
            <div className="spend-flow-card-label">Committed</div>
            <div className="spend-flow-card-value committed">
              {formatMoney(committedTotalMinor)}
            </div>
            <div className="muted small">Locked obligations</div>
          </div>
        </div>
      </div>
    </div>
  )
}
