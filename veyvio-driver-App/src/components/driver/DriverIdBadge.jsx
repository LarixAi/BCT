import { ShieldCheck } from "lucide-react";
import { op } from "@/lib/driver-operational-theme";

export default function DriverIdBadge({ driver, organisationName, compact = false }) {
  const initials = driver.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`${op.card} ${compact ? "p-3.5" : "p-4"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--ridova-navy)] text-sm font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className={`${op.appLabel} !text-[10px]`}>Digital driver ID</p>
            <p className="truncate font-semibold text-foreground">{driver.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{organisationName ?? "Veyvio"}</p>
          </div>
        </div>
        <ShieldCheck className={`h-5 w-5 shrink-0 ${op.limeAccent}`} aria-hidden="true" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-border bg-muted/50 px-3 py-2">
          <p className="text-muted-foreground">Licence</p>
          <p className="truncate font-medium text-foreground">{driver.licenceNumber ?? "On file"}</p>
        </div>
        <div className="rounded-lg border border-[var(--ridova-lime)]/25 bg-[var(--ridova-lime)]/10 px-3 py-2">
          <p className="text-muted-foreground">Status</p>
          <p className={`font-semibold capitalize ${op.limeAccent}`}>
            {driver.onboardingStatus?.replace(/_/g, " ") ?? "Active"}
          </p>
        </div>
      </div>
    </div>
  );
}
