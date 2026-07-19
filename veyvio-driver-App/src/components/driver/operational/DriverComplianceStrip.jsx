import { Link } from "react-router-dom";
import { op } from "@/lib/driver-operational-theme";

function Chip({ to, label, tone = "amber", onClick }) {
  const tones = {
    amber: "bg-amber-50 border-amber-200 text-amber-950",
    red: "bg-red-50 border-red-200 text-red-950",
    blue: "bg-blue-50 border-blue-200 text-blue-950",
  };
  const className = `shrink-0 inline-flex items-center min-h-[44px] rounded-full border px-3.5 py-2 text-xs font-semibold active:opacity-80 ${tones[tone] ?? tones.amber}`;

  if (to) {
    return (
      <Link to={to} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {label}
    </button>
  );
}

export default function DriverComplianceStrip({
  walkaroundSafety,
  pendingSync,
  dispatchBlocked,
  dispatchBlockers = [],
  outdatedPolicies = [],
  tachoReminders = [],
  expiringDocuments = [],
  complianceFix,
}) {
  const chips = [];

  if (pendingSync > 0) {
    chips.push({ key: "sync", label: `${pendingSync} check sync pending`, tone: "blue", to: "/check" });
  }

  if (walkaroundSafety?.checkRequired && walkaroundSafety?.registration) {
    chips.push({ key: "check", label: "Vehicle check due", tone: "amber", to: "/check" });
  } else if (walkaroundSafety?.vehicleBlocked) {
    chips.push({ key: "blocked", label: "Vehicle blocked", tone: "red", to: "/contact" });
  }

  if (complianceFix) {
    chips.push({ key: "fix", label: complianceFix.label, tone: "amber", to: complianceFix.href });
  }

  if (dispatchBlocked && dispatchBlockers.length > 0) {
    chips.push({ key: "dispatch", label: "Dispatch blocked", tone: "red", to: "/profile" });
  }

  if (outdatedPolicies.length > 0) {
    chips.push({
      key: "policies",
      label: `${outdatedPolicies.length} polic${outdatedPolicies.length === 1 ? "y" : "ies"} to review`,
      tone: "amber",
      to: "/policies",
    });
  }

  if (tachoReminders.length > 0) {
    chips.push({ key: "tacho", label: "Tachograph reminder", tone: "amber", to: "/profile" });
  }

  if (expiringDocuments.length > 0) {
    chips.push({
      key: "docs",
      label: `${expiringDocuments.length} doc${expiringDocuments.length === 1 ? "" : "s"} expiring`,
      tone: "amber",
      to: "/documents",
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className={`${op.card} p-3`}>
      <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Needs attention</p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {chips.map((chip) => (
          <Chip key={chip.key} to={chip.to} label={chip.label} tone={chip.tone} />
        ))}
      </div>
    </div>
  );
}
