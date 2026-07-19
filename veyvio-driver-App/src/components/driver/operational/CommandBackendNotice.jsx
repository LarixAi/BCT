import { Info } from "lucide-react";
import { op } from "@/lib/driver-operational-theme";

/** Honest empty / readiness notice when a screen is waiting on Command APIs. */
export default function CommandBackendNotice({
  title,
  description,
  status = "ready", // ready | partial | missing
}) {
  const tone =
    status === "ready"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : status === "partial"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-border bg-muted/40 text-foreground";

  return (
    <div className={`mt-4 flex gap-3 rounded-2xl border p-4 text-sm ${tone}`}>
      <Info className={`mt-0.5 h-5 w-5 shrink-0 ${op.iconTeal}`} aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {description ? <p className="mt-1 text-sm opacity-90">{description}</p> : null}
      </div>
    </div>
  );
}
