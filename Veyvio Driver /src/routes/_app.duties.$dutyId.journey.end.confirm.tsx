import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  createHandbackDraft,
  handbackBlockingReasons,
  handbackIsComplete,
  type VehicleHandbackRecord,
} from "@veyvio/ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JourneyFlowShell } from "@/components/driver/journey/JourneyFlowShell";
import { formatTime } from "@/lib/utils";
import { useDriverStore } from "@/store/driver";
import { getSessionSnapshot } from "@/platform/auth/session-store";
import {
  custodyEndsAfterJourney,
  getActiveJourney,
  getActiveJourneyId,
  getNextJourney,
} from "@/domain/journey/journey-helpers";

export const Route = createFileRoute("/_app/duties/$dutyId/journey/end/confirm")({
  head: () => ({ meta: [{ title: "End journey — Veyvio Driver" }] }),
  component: EndJourneyConfirmPage,
});

function EndJourneyConfirmPage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const storeJourneyId = useDriverStore((s) => s.activeJourneyId);
  const draft = useDriverStore((s) => s.endJourneyDrafts[dutyId]);
  const setEndJourneyDraft = useDriverStore((s) => s.setEndJourneyDraft);
  const [note, setNote] = useState(draft?.handoverNote ?? "");
  const [handback, setHandback] = useState<VehicleHandbackRecord>(() =>
    createHandbackDraft({
      dutyId,
      vehicleId: "",
      assignmentId: "asgn_unknown",
    }),
  );
  const [submitting, setSubmitting] = useState(false);

  const journeyId = duty ? getActiveJourneyId(duty, storeJourneyId ?? duty.activeJourneyId) : "";
  const activeJourney = duty ? getActiveJourney(duty, journeyId) : undefined;
  const endsCustody = duty ? custodyEndsAfterJourney(duty, journeyId) : false;
  const nextJourney = duty ? getNextJourney(duty, journeyId) : undefined;

  useEffect(() => {
    if (!draft?.fuelLevel) return;
    setHandback((h) =>
      h.fuelOrChargeStatus.trim() ? h : { ...h, fuelOrChargeStatus: draft.fuelLevel },
    );
  }, [draft?.fuelLevel]);

  useEffect(() => {
    if (!duty) return;
    setHandback((h) => ({
      ...h,
      vehicleId: h.vehicleId || duty.vehicle?.id || "",
      assignmentId:
        h.assignmentId !== "asgn_unknown"
          ? h.assignmentId
          : (duty.vehicleCheck.assignmentId ?? "asgn_unknown"),
    }));
  }, [duty]);

  const effectiveHandback = useMemo(() => {
    return {
      ...handback,
      fuelOrChargeStatus: handback.fuelOrChargeStatus.trim() || draft?.fuelLevel || "",
      vehicleId: handback.vehicleId || duty?.vehicle?.id || "",
      assignmentId: handback.assignmentId || duty?.vehicleCheck.assignmentId || "asgn_unknown",
    };
  }, [handback, draft?.fuelLevel, duty?.vehicle?.id, duty?.vehicleCheck.assignmentId]);

  const blockers = endsCustody ? handbackBlockingReasons(effectiveHandback) : [];
  const ready = !endsCustody || handbackIsComplete(effectiveHandback);

  function patch(update: Partial<VehicleHandbackRecord>) {
    setHandback((h) => ({ ...h, ...update }));
  }

  if (!duty) {
    return <p className="text-sm text-muted">Loading journey end…</p>;
  }

  const started = duty.startedAt
    ? new Date(duty.startedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "—";
  const ending = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <JourneyFlowShell
      kind="end"
      step={2}
      total={3}
      routeLabel={activeJourney?.name ?? duty.routeName}
      backTo={`/duties/${dutyId}/journey/end`}
      backLabel="Back"
      footer={
        <div className="space-y-2">
          <Button
            size="lg"
            className="h-12 w-full font-bold uppercase tracking-widest"
            disabled={!ready || submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                const completed: VehicleHandbackRecord | undefined = endsCustody
                  ? {
                      ...effectiveHandback,
                      completedAt: new Date().toISOString(),
                      completedBy: getSessionSnapshot().user?.id ?? "driver",
                    }
                  : undefined;
                setEndJourneyDraft(dutyId, {
                  odometer: draft?.odometer ?? "",
                  fuelLevel: completed?.fuelOrChargeStatus ?? draft?.fuelLevel ?? "",
                  handoverNote: note,
                  handback: completed,
                });
                await useDriverStore.getState().completeEndJourney(dutyId, {
                  withHandback: endsCustody,
                });
                void navigate({ to: "/duties/$dutyId/journey/end/complete", params: { dutyId } });
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {endsCustody ? "Complete handback & end journey" : "End journey"}
          </Button>
          {!ready && blockers.length > 0 && (
            <div className="rounded-md border border-warn/30 bg-warn/5 px-3 py-2 text-sm text-warn">
              <p className="font-bold">Still needed</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {blockers.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      }
    >
      <div className="animate-in-up space-y-4">
        <header>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            {endsCustody ? "End journey & handback" : "End journey"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {endsCustody
              ? "This is the last journey on this duty — complete vehicle handback when custody ends."
              : nextJourney
                ? `After this journey you still have: ${nextJourney.name}. Vehicle custody stays with you.`
                : "Confirm journey readings and close this journey."}
          </p>
        </header>
        <section className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4 text-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Started</p>
            <p className="mt-1 font-bold">{started}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Ending</p>
            <p className="mt-1 font-bold">{ending}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Scheduled end</p>
            <p className="mt-1 font-bold">{formatTime(duty.endTime)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Vehicle</p>
            <p className="mt-1 font-mono font-bold">{duty.vehicle?.registrationNumber}</p>
          </div>
        </section>

        {endsCustody ? (
          <section className="space-y-3 rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Vehicle handback</p>
            <div className="space-y-2">
              <Label htmlFor="bay">Return bay / location</Label>
              <Input
                id="bay"
                value={handback.locationOrBay}
                onChange={(e) => patch({ locationOrBay: e.target.value })}
                className="h-12"
                placeholder="e.g. Bay C03"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuel">Fuel / charge status</Label>
              <Input
                id="fuel"
                value={effectiveHandback.fuelOrChargeStatus}
                onChange={(e) => patch({ fuelOrChargeStatus: e.target.value })}
                className="h-12"
              />
            </div>
            {(
              [
                ["keysSecured", "Keys secured"],
                ["postUseConditionOk", "Post-use condition acceptable"],
                ["cleanlinessAccepted", "Cleanliness accepted"],
                ["lostPropertyChecked", "Lost property checked"],
                ["restraintsAndEquipmentOk", "Restraints & equipment OK"],
                ["criticalSyncClear", "No critical sync outstanding"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(handback[key])}
                  onChange={(e) => patch({ [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={handback.newBodyDamage}
                onChange={(e) =>
                  patch({
                    newBodyDamage: e.target.checked,
                    damageNotes: e.target.checked ? handback.damageNotes : "",
                  })
                }
              />
              New body damage to record
            </label>
            {handback.newBodyDamage && (
              <textarea
                value={handback.damageNotes ?? ""}
                onChange={(e) => patch({ damageNotes: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Describe the damage (required when this is ticked)"
              />
            )}
          </section>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="handover">Journey note (optional)</Label>
          <textarea
            id="handover"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
            placeholder="Anything Operations should know about this journey."
          />
        </div>
      </div>
    </JourneyFlowShell>
  );
}
