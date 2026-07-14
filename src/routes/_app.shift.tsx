import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SectionHeader } from "@/components/yard/primitives";
import { PermissionGate } from "@/components/yard/PermissionGate";
import { SyncStatusBadge } from "@/components/yard/status/SyncStatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { useSessionStore } from "@/platform/auth/session-store";
import { useSyncStore } from "@/platform/sync/outbox";
import { useYard } from "@/store/yard";
import { buildHandoverSummary } from "@/domain/yard/handover-summary";
import { SHIFT } from "@/data/fixtures";
import { toast } from "sonner";
import { yardCopy } from "@/copy/yard-messages";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/_app/shift")({
  head: () => ({
    meta: [
      { title: "Shift & Handover — Veyvio Yard" },
      { name: "description", content: "Current shift, depot context and handover summary." },
    ],
  }),
  component: ShiftPage,
});

function ShiftPage() {
  const user = useSessionStore(s => s.user);
  const depotName = useTenancyStore(s => s.depotName);
  const depotCode = useTenancyStore(s => s.depotCode);
  const companyName = useTenancyStore(s => s.companyName);
  const lastSyncedAt = useSyncStore(s => s.lastSyncedAt);
  const pendingCount = useSyncStore(s => s.pendingCount);

  const vehicles = useYard(s => s.vehicles);
  const trips = useYard(s => s.trips);
  const defects = useYard(s => s.defects);
  const vorCases = useYard(s => s.vorCases);
  const handovers = useYard(s => s.handovers);
  const completeHandover = useYard(s => s.completeHandover);

  const [notes, setNotes] = useState("");
  const summary = useMemo(
    () => buildHandoverSummary(vehicles, trips, defects, vorCases),
    [vehicles, trips, defects, vorCases],
  );

  function handleComplete() {
    if (!notes.trim()) {
      toast.error(yardCopy.toast.shift.notesRequired);
      return;
    }
    completeHandover(notes.trim());
    toast.success(yardCopy.toast.shift.handoverRecorded);
    setNotes("");
  }

  return (
    <div className="space-y-5 animate-in-up pb-4">
      <SectionHeader title="Shift & Handover" sub="outgoing summary" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Panel label="Company" value={companyName ?? "—"} />
        <Panel label="Depot" value={depotName ? `${depotName} (${depotCode})` : "—"} />
        <Panel label="Shift window" value={SHIFT.window} />
        <Panel label="Signed in" value={user ? `${user.firstName} ${user.lastName}` : "—"} />
      </div>

      <section className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted px-1">Fleet snapshot</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Available" value={summary.available} />
          <Stat label="On line" value={summary.onDepartureLine} tone="primary" />
          <Stat label="VOR" value={summary.vor} tone="vor" />
          <Stat label="Off-site" value={summary.offSite} />
          <Stat label="Open defects" value={summary.openDefects} tone="warn" />
          <Stat label="Active VOR cases" value={summary.activeVorCases} tone="vor" />
          <Stat label="Trips ready" value={summary.tripsReady} tone="ok" />
          <Stat label="Trips blocked" value={summary.tripsBlocked} tone="warn" />
        </div>
      </section>

      {summary.blockedTripCodes.length > 0 && (
        <section className="bg-warn/5 border border-warn/30 rounded-xs p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-warn">Blocked departures</div>
          <p className="text-xs mt-1 text-muted">{summary.blockedTripCodes.join(" · ")}</p>
        </section>
      )}

      <div className="bg-white border border-border rounded-xs p-4 space-y-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted">Connectivity</div>
        <SyncStatusBadge />
        {lastSyncedAt && (
          <p className="text-xs text-muted">
            Last sync {new Date(lastSyncedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            {pendingCount > 0 && ` · ${pendingCount} pending`}
          </p>
        )}
      </div>

      <section className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted px-1">Outgoing handover</h2>
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Summarise open issues, vehicles to watch, and context for incoming shift…"
          rows={4}
        />
        <PermissionGate permission="handover.complete">
          <Button
            onClick={handleComplete}
            className="w-full bg-primary hover:bg-primary/90 text-white uppercase tracking-widest font-bold"
          >
            <ClipboardList className="size-4 mr-2" /> Complete handover
          </Button>
        </PermissionGate>
      </section>

      {handovers.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted px-1">Recent handovers</h2>
          <div className="bg-white border border-border rounded-xs overflow-hidden divide-y divide-border">
            {handovers.slice(0, 5).map(h => (
              <div key={h.id} className="p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold">{h.by}</span>
                  <span className="text-muted">{new Date(h.at).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm">{h.notes}</p>
                <div className="mt-2 text-[10px] text-muted uppercase tracking-widest">
                  {h.summary.tripsReady} ready · {h.summary.tripsBlocked} blocked · {h.summary.vor} VOR
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Panel({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-border rounded-xs p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted font-bold">{label}</div>
      <div className="text-lg font-display font-extrabold mt-1">{value}</div>
    </div>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "vor" | "warn" | "primary" | "ok" }) {
  const toneClass =
    tone === "vor" ? "text-vor"
    : tone === "warn" ? "text-warn"
    : tone === "primary" ? "text-primary"
    : tone === "ok" ? "text-ok"
    : "text-foreground";
  return (
    <div className="bg-white border border-border rounded-xs p-3 text-center">
      <div className={`text-xl font-display font-extrabold tabular-nums ${toneClass}`}>{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-widest text-muted">{label}</div>
    </div>
  );
}
