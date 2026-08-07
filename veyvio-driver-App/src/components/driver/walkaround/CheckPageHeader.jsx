import { RefreshCw } from "lucide-react";
import { op } from "@/lib/driver-operational-theme";

/** Tab-root Checks header — eyebrow + title (no back chevron). */
export default function CheckPageHeader({ title, subtitle, onRefresh, refreshing }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className={op.appLabel}>Checks</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {onRefresh ? (
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={refreshing}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card disabled:opacity-60"
          aria-label="Refresh assignment"
        >
          <RefreshCw className={`h-5 w-5 ${op.iconTeal} ${refreshing ? "animate-spin" : ""}`} />
        </button>
      ) : null}
    </div>
  );
}
