import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { PermissionGate } from "@/components/yard/PermissionGate";
import { SyncStatusBadge } from "@/components/yard/status/SyncStatusBadge";
import { Textarea } from "@/components/ui/textarea";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { useSessionStore } from "@/platform/auth/session-store";
import { useSyncStore } from "@/platform/sync/outbox";
import { useYard } from "@/store/yard";
import { buildHandoverSummary } from "@/domain/yard/handover-summary";
import { SHIFT } from "@/data/fixtures";
import { toast } from "sonner";
import { yardCopy } from "@/copy/yard-messages";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { HubCallout, HubMiniStat, HubSectionHeading, hubListPanelClass } from "@/features/hub/HubContentPrimitives";
import { HubOpsPageLayout } from "@/features/hub/HubOpsPageLayout";
import { HubPrimaryButton } from "@/features/hub/HubPageHeader";

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
    <HubOpsPageLayout title="Shift & handover" description="Depot context and outgoing handover summary.">
      <DashboardSurface>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoRow label="Company" value={companyName ?? "—"} />
          <InfoRow label="Depot" value={depotName ? `${depotName} (${depotCode})` : "—"} />
          <InfoRow label="Shift window" value={SHIFT.window} />
          <InfoRow label="Signed in" value={user ? `${user.firstName} ${user.lastName}` : "—"} />
        </div>
      </DashboardSurface>

      <DashboardSurface>
        <HubSectionHeading title="Fleet snapshot" description="Live counts for this shift." />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <HubMiniStat label="Available" value={summary.available} />
          <HubMiniStat label="On line" value={summary.onDepartureLine} />
          <HubMiniStat label="VOR" value={summary.vor} tone="vor" />
          <HubMiniStat label="Off-site" value={summary.offSite} />
          <HubMiniStat label="Open defects" value={summary.openDefects} tone="warn" />
          <HubMiniStat label="Active VOR cases" value={summary.activeVorCases} tone="vor" />
          <HubMiniStat label="Trips ready" value={summary.tripsReady} tone="ok" />
          <HubMiniStat label="Trips blocked" value={summary.tripsBlocked} tone="warn" />
        </div>
      </DashboardSurface>

      {summary.blockedTripCodes.length > 0 && (
        <HubCallout tone="warn">
          Blocked departures: {summary.blockedTripCodes.join(" · ")}
        </HubCallout>
      )}

      <DashboardSurface className="space-y-3">
        <HubSectionHeading title="Connectivity" />
        <SyncStatusBadge />
        {lastSyncedAt ? (
          <p className="text-sm text-[#667085]">
            Last sync {new Date(lastSyncedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            {pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
          </p>
        ) : null}
      </DashboardSurface>

      <DashboardSurface className="space-y-3">
        <HubSectionHeading title="Outgoing handover" description="Summarise open issues for incoming shift." />
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Summarise open issues, vehicles to watch, and context for incoming shift…"
          rows={4}
          className="rounded-xl border-[#e4e7ec]"
        />
        <PermissionGate permission="handover.complete">
          <HubPrimaryButton onClick={handleComplete} className="w-full sm:w-auto">
            <ClipboardList className="size-4" />
            Complete handover
          </HubPrimaryButton>
        </PermissionGate>
      </DashboardSurface>

      {handovers.length > 0 && (
        <DashboardSurface>
          <HubSectionHeading title="Recent handovers" />
          <div className={hubListPanelClass}>
            {handovers.slice(0, 5).map(h => (
              <div key={h.id} className="p-4">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-ink">{h.by}</span>
                  <span className="text-[#667085]">{new Date(h.at).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-[#667085]">{h.notes}</p>
                <p className="mt-2 text-xs text-[#98a2b3]">
                  {h.summary.tripsReady} ready · {h.summary.tripsBlocked} blocked · {h.summary.vor} VOR
                </p>
              </div>
            ))}
          </div>
        </DashboardSurface>
      )}
    </HubOpsPageLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#eaecf0] bg-[#fcfcfd] p-4">
      <div className="text-sm font-medium text-[#667085]">{label}</div>
      <div className="mt-1 font-display text-lg font-bold text-ink">{value}</div>
    </div>
  );
}
