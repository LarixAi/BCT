import type { DepotStockRow, ResourceTransaction, StockForecastRow } from './types'

/** Lightweight 7-day demand forecast from recent issue/dispense rate. */
export function buildStockForecasts(
  stock: DepotStockRow[],
  transactions: ResourceTransaction[],
): StockForecastRow[] {
  const since = Date.now() - 14 * 24 * 60 * 60 * 1000
  const usage = new Map<string, number>()

  for (const tx of transactions) {
    if (new Date(tx.createdAt).getTime() < since) continue
    if (tx.transactionType !== 'issue' && tx.transactionType !== 'dispense') continue
    const key = `${tx.depotName ?? '—'}:${tx.resourceItemId}`
    usage.set(key, (usage.get(key) ?? 0) + tx.quantity)
  }

  return stock.map((s) => {
    const key = `${s.depotName}:${s.resourceItemId}`
    const used14d = usage.get(key) ?? 0
    const projectedDemand7d = Math.round((used14d / 2) * 10) / 10
    const daily = projectedDemand7d / 7
    const daysUntilStockout =
      daily > 0 ? Math.round((s.available / daily) * 10) / 10 : s.available > 0 ? null : 0

    let recommendation = 'Stock level adequate for the next week.'
    if (s.status === 'out' || (daysUntilStockout != null && daysUntilStockout <= 0)) {
      recommendation = 'Order now — stock is out or exhausted against demand.'
    } else if (s.status === 'reorder' || (daysUntilStockout != null && daysUntilStockout < 5)) {
      recommendation = 'Raise purchase request — likely stockout within 5 days.'
    } else if (s.status === 'low' || (daysUntilStockout != null && daysUntilStockout < 10)) {
      recommendation = 'Watch — plan a top-up before the weekend peak.'
    }

    return {
      resourceItemId: s.resourceItemId,
      resourceName: s.resourceName,
      depotName: s.depotName,
      available: s.available,
      unit: s.unit,
      projectedDemand7d,
      daysUntilStockout,
      recommendation,
    }
  })
}
