/** SaaS Stripe Checkout is deferred until tenant isolation is CI-proven. */
export function BillingPlaceholder({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span
        className="inline-flex items-center rounded-md border border-dashed border-border bg-surface-muted px-3 py-2 text-xs font-medium text-muted"
        title="SaaS billing is not enabled yet"
      >
        Billing — coming later
      </span>
    )
  }

  return (
    <aside className="rounded-xl border border-dashed border-border bg-surface-muted/60 px-4 py-3 text-sm">
      <p className="font-semibold text-ink">Billing placeholder</p>
      <p className="mt-1 text-ink-soft">
        SaaS Stripe Checkout and invoices are not wired yet. Set plan and tenant status manually for
        now. Self-serve payment lands after tenant isolation is proven in CI.
      </p>
      <p className="mt-2 text-xs text-muted">
        Driver PHV payments stay separate and are unchanged.
      </p>
    </aside>
  )
}
