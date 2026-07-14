import { Link } from "@tanstack/react-router";
import { AlertTriangle, ClipboardCheck, ShieldAlert } from "lucide-react";
import type { Defect, Vehicle } from "@/types/yard";
import type { YardCheckResult } from "@/types/yard-check";

interface YardAuditBriefProps {
  vehicle: Vehicle;
  openDefects: Defect[];
  lastCheck?: YardCheckResult;
}

export function YardAuditBrief({ vehicle, openDefects, lastCheck }: YardAuditBriefProps) {
  const suspiciousPass =
    lastCheck?.overallPassed
    && lastCheck.checkType !== "yard-spot"
    && (lastCheck.durationSeconds ?? 999) < 120;

  return (
    <section className="bg-warn/10 border border-warn/40 rounded-xs p-4 space-y-3">
      <div>
        <h2 className="text-xs font-extrabold uppercase tracking-widest font-display text-warn">
          Manager spot-bust audit
        </h2>
        <p className="text-[11px] text-muted mt-1">
          Physically inspect the entire vehicle. Your job is to find defects the driver missed — bald tyres,
          unreported body damage, faulty lights, and anything not on the defect register.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white border border-border rounded-xs p-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted">Open defects</div>
          <div className="font-bold mt-0.5">{openDefects.length}</div>
        </div>
        <div className="bg-white border border-border rounded-xs p-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted">Last driver check</div>
          <div className="font-bold mt-0.5">
            {vehicle.lastCheckAt
              ? formatRel(vehicle.lastCheckAt)
              : "None recorded"}
          </div>
          {vehicle.lastCheckPassed != null && (
            <div className={vehicle.lastCheckPassed ? "text-ok text-[10px] font-bold uppercase mt-0.5" : "text-vor text-[10px] font-bold uppercase mt-0.5"}>
              {vehicle.lastCheckPassed ? "Passed" : "Failed"}
            </div>
          )}
        </div>
      </div>

      {openDefects.length > 0 && (
        <div className="bg-white border border-border rounded-xs p-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1.5 flex items-center gap-1">
            <ShieldAlert className="size-3" /> On system — verify physically
          </div>
          <ul className="space-y-1">
            {openDefects.slice(0, 5).map(d => (
              <li key={d.id}>
                <Link to="/defects/$defectId" params={{ defectId: d.id }} className="text-xs hover:underline">
                  <span className="font-bold">{d.category}</span>
                  <span className="text-muted"> — {d.notes.slice(0, 60)}{d.notes.length > 60 ? "…" : ""}</span>
                </Link>
              </li>
            ))}
            {openDefects.length > 5 && (
              <li className="text-[10px] text-muted">+{openDefects.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {suspiciousPass && lastCheck && (
        <div className="flex gap-2 text-xs bg-vor/5 border border-vor/20 rounded-xs p-2">
          <AlertTriangle className="size-4 text-vor shrink-0" />
          <p>
            Last check passed in under 2 minutes ({lastCheck.durationSeconds}s).
            Use the <strong>Defect register cross-check</strong> section if the walkaround looks rushed.
          </p>
        </div>
      )}

      {lastCheck && (
        <Link
          to="/checks/$checkId"
          params={{ checkId: lastCheck.id }}
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground"
        >
          <ClipboardCheck className="size-3" /> View last check record
        </Link>
      )}
    </section>
  );
}

function formatRel(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
