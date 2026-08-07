import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Fuel,
  Gauge,
  Loader2,
  MapPin,
  Phone,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import DriverEmptyState from "@/components/driver/operational/DriverEmptyState";
import DriverPageContainer from "@/components/driver/operational/DriverPageContainer";
import DriverSectionTitle from "@/components/driver/operational/DriverSectionTitle";
import DriverSyncBanner from "@/components/driver/operational/DriverSyncBanner";
import CheckPageHeader from "@/components/driver/walkaround/CheckPageHeader";
import WalkaroundStepper from "@/components/driver/walkaround/WalkaroundStepper";
import VehicleConditionAcknowledgement from "@/components/driver/condition/VehicleConditionAcknowledgement";
import { CHECK_TYPES } from "@/services/vehicle-check.service";
import { op } from "@/lib/driver-operational-theme";
import {
  formatUkDateWithWeekday,
  formatUkNumber,
  formatUkTime,
  parseUkInstant,
} from "@/lib/uk-locale";

function localDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function relativeCheckLabel(iso) {
  const d = parseUkInstant(iso);
  if (!d) return "Earlier";
  const key = localDayKey(d);
  const today = localDayKey();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDayKey(yesterdayDate);
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return formatUkDateWithWeekday(d);
}

function resultCopy(check) {
  if (check.result === "failed") return "Defect reported";
  if (check.result === "pass_with_advisory") return "Advisory";
  if (check.resultLabel && /nil|pass|complete/i.test(check.resultLabel)) return "Completed";
  if (check.resultLabel) return check.resultLabel;
  if (check.result === "nil_defect" || check.result === "passed") return "Completed";
  return "Completed";
}

function resultOk(check) {
  return check.result === "nil_defect" || check.result === "passed" || check.result === "pass_with_advisory";
}

function StatusRow({ done, pending, label, detail }) {
  const Icon = done ? CheckCircle2 : Circle;
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${
          done
            ? "text-[var(--ridova-lime-dark)]"
            : pending
              ? "text-amber-500"
              : "text-muted-foreground/40"
        }`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-semibold ${
            done ? "text-foreground" : pending ? "text-amber-950" : "text-muted-foreground"
          }`}
        >
          {label}
        </p>
        {detail ? <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{detail}</p> : null}
      </div>
    </div>
  );
}

function ReadinessChip({ tone, label }) {
  const tones = {
    ready: "border-[var(--ridova-lime)]/40 bg-[var(--ridova-lime)]/15 text-[var(--ridova-lime-dark)]",
    pending: "border-amber-300/60 bg-amber-50 text-amber-950",
    blocked: "border-red-300/60 bg-red-50 text-red-950",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        tones[tone] ?? tones.pending
      }`}
    >
      {label}
    </span>
  );
}

function VehicleHeroCard({ vehicle, profile, job, odometer, fuelLevel, readinessChip }) {
  const makeModel = [vehicle?.make, vehicle?.model].filter(Boolean).join(" ") || "Assigned vehicle";
  const depot = profile?.depotName || "—";
  const mileage =
    odometer && Number(odometer) > 0
      ? formatUkNumber(Number(odometer))
      : vehicle?.odometer != null
        ? formatUkNumber(Number(vehicle.odometer))
        : null;

  return (
    <article className={`mt-4 overflow-hidden ${op.card}`}>
      <div className="border-b border-[var(--ridova-teal)]/15 bg-gradient-to-br from-[var(--ridova-teal)]/8 to-transparent p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className={`${op.iconWrap} h-12 w-12 shrink-0`}>
              <Truck className={`h-6 w-6 ${op.iconTeal}`} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Assigned vehicle
              </p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">{makeModel}</h2>
              <p className="mt-2 text-3xl font-bold tracking-wider tabular-nums text-foreground">
                {vehicle?.registration ?? "—"}
              </p>
              {job?.route_name ? (
                <p className="mt-1 truncate text-sm text-muted-foreground">{job.route_name}</p>
              ) : null}
            </div>
          </div>
          {readinessChip ? (
            <ReadinessChip tone={readinessChip.tone} label={readinessChip.label} />
          ) : null}
        </div>
      </div>
      <div className="p-4 pt-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              <p className="text-[10px] font-semibold uppercase tracking-wide">Depot</p>
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">{depot}</p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Gauge className="h-3.5 w-3.5" aria-hidden />
              <p className="text-[10px] font-semibold uppercase tracking-wide">Miles</p>
            </div>
            <p className="mt-1 truncate text-sm font-semibold tabular-nums text-foreground">
              {mileage != null ? mileage : "—"}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Fuel className="h-3.5 w-3.5" aria-hidden />
              <p className="text-[10px] font-semibold uppercase tracking-wide">Fuel</p>
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">{fuelLevel || "—"}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function TodayComplianceStatus({ safety, vehicleReadiness, expiringDocumentCount = 0 }) {
  const walkaroundDone = Boolean(safety?.checkComplete && safety?.result !== "failed");
  const ready = Boolean(safety?.routeStartAllowed && walkaroundDone && !safety?.vehicleBlocked);
  const openDefects =
    vehicleReadiness?.openDefectCount ?? safety?.openDefectCount ?? 0;
  const criticalDefects =
    vehicleReadiness?.criticalDefectCount ?? safety?.criticalDefectCount ?? 0;
  const defectsClear = openDefects === 0;
  const licenceOk = expiringDocumentCount === 0;

  return (
    <>
      <DriverSectionTitle>Today&apos;s status</DriverSectionTitle>
      <div className={`px-4 py-1 ${op.card}`}>
        <StatusRow done label="Vehicle assigned" detail={safety?.registration ?? "On your duty"} />
        <StatusRow
          done={walkaroundDone}
          pending={!walkaroundDone}
          label={walkaroundDone ? "Walkaround complete" : "Walkaround pending"}
          detail={
            walkaroundDone
              ? safety?.startedAt
                ? `Started ${formatUkTime(safety.startedAt)}`
                : safety?.resultLabel ?? "On record for today"
              : "Required before you start duty"
          }
        />
        <StatusRow
          done={defectsClear}
          pending={!defectsClear && criticalDefects === 0}
          label={defectsClear ? "No outstanding defects" : "Open defects"}
          detail={
            defectsClear
              ? "No safety-critical defects on this vehicle"
              : `${openDefects} open${criticalDefects > 0 ? ` · ${criticalDefects} critical` : ""}`
          }
        />
        <StatusRow
          done={licenceOk}
          pending={!licenceOk}
          label={licenceOk ? "Licence & documents" : "Documents need attention"}
          detail={
            licenceOk
              ? "Required compliance on file"
              : `${expiringDocumentCount} document${expiringDocumentCount === 1 ? "" : "s"} expiring soon`
          }
        />
        <StatusRow
          done={ready}
          pending={!ready && !safety?.vehicleBlocked}
          label="Ready for duty"
          detail={
            safety?.vehicleBlocked
              ? "Vehicle blocked — contact dispatch"
              : ready
                ? "You can sign on and start jobs"
                : "Complete the walkaround first"
          }
        />
      </div>
    </>
  );
}

function RecentChecksList({ recentChecks, loading }) {
  return (
    <>
      <DriverSectionTitle
        action={
          <Link to="/check/history" className={`text-xs font-semibold ${op.linkAccent}`}>
            View all
          </Link>
        }
      >
        Recent checks
      </DriverSectionTitle>
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
        </p>
      ) : recentChecks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Completed walkarounds will show here.</p>
      ) : (
        <ul className={`overflow-hidden ${op.listCard}`}>
          {recentChecks.map((check, index) => {
            const ok = resultOk(check);
            return (
              <li key={check.id} className={index > 0 ? "border-t border-border" : ""}>
                <Link
                  to={`/check/history/${check.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 active:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {relativeCheckLabel(check.submittedAt ?? check.checkedAt ?? check.startedAt)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {check.registration || "Vehicle"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold ${
                      ok ? "text-[var(--ridova-lime-dark)]" : "text-amber-800"
                    }`}
                  >
                    {ok ? "Completed ✓" : resultCopy(check)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function DriverFooter({ driver, depotName }) {
  return (
    <>
      <DriverSectionTitle>Driver</DriverSectionTitle>
      <p className="text-sm text-muted-foreground">
        Signed in as {driver?.fullName || "Driver"}. Depot {depotName || "not set"}.
      </p>
    </>
  );
}

export default function WalkaroundVehicleConfirm({
  driver,
  session,
  error,
  checkType,
  checkTypes,
  onCheckTypeChange,
  vehicleConfirmed,
  onVehicleConfirmedChange,
  odometer,
  onOdometerChange,
  odometerPhotoPreview,
  onOdometerPhotoChange,
  fuelLevel,
  onFuelLevelChange,
  syncHint,
  pendingSync = 0,
  onDiscardDraft,
  onStart,
  onBack,
  draftComplete = false,
  onContinueReview,
  conditionSummary,
  conditionAcknowledged = false,
  onConditionAcknowledge,
  recentChecks = [],
  recentChecksLoading = false,
  onRefreshAssignment,
  refreshing = false,
  vehicleReadiness = null,
  expiringDocumentCount = 0,
}) {
  const vehicle = session?.vehicle;
  const job = session?.job;
  const profile = session?.profile;
  const safety = session?.safety;
  const noVehicle = !vehicle && !session?.ok;

  const dailyAlreadyDone =
    safety?.checkComplete &&
    checkType === CHECK_TYPES.daily.id &&
    safety.result !== "failed";

  const hasDraft = Boolean(session?.draft?.startedAt || session?.draft?.answers);
  const [phase, setPhase] = useState(() =>
    hasDraft || draftComplete ? "start" : "hub",
  );

  useEffect(() => {
    if (hasDraft || draftComplete) setPhase("start");
  }, [hasDraft, draftComplete]);

  useEffect(() => {
    if (!dailyAlreadyDone) return;
    if (checkType !== CHECK_TYPES.daily.id) return;
    const preferred =
      checkTypes.find((t) => t.id === CHECK_TYPES.in_service.id) ||
      checkTypes.find((t) => t.id === CHECK_TYPES.changeover.id) ||
      checkTypes.find((t) => t.id !== CHECK_TYPES.daily.id);
    if (preferred?.id) onCheckTypeChange(preferred.id);
  }, [dailyAlreadyDone, checkType, checkTypes, onCheckTypeChange]);

  const readiness = useMemo(() => {
    if (!vehicle) {
      return {
        headline: "Waiting for assignment",
        detail: "You cannot start a walkaround until a vehicle is on your duty.",
        tone: "partial",
      };
    }
    if (safety?.vehicleBlocked) {
      return {
        headline: "Do not drive",
        detail: safety.message || "This vehicle is blocked until defects are cleared.",
        tone: "missing",
      };
    }
    if (safety?.checkComplete && safety.result !== "failed") {
      return {
        headline: "Ready to drive",
        detail:
          safety.resultLabel ??
          (safety.result === "nil_defect" ? "Nil defects recorded today." : "Walkaround complete for today."),
        tone: "ready",
      };
    }
    if (safety?.result === "failed") {
      return {
        headline: "Defect reported",
        detail: "Wait for transport manager instructions before moving this vehicle.",
        tone: "partial",
      };
    }
    return {
      headline: "Walkaround required",
      detail: "Complete today’s check before starting duty.",
      tone: "partial",
    };
  }, [vehicle, safety]);

  const checkTypeLabel =
    checkTypes.find((t) => t.id === checkType)?.label ?? "Daily walkaround";

  const heroReadinessChip = useMemo(() => {
    if (safety?.vehicleBlocked) return { tone: "blocked", label: "Blocked" };
    if (safety?.checkComplete && safety.result !== "failed" && safety.routeStartAllowed) {
      return { tone: "ready", label: "Ready" };
    }
    if (safety?.result === "failed") return { tone: "blocked", label: "Defect" };
    return { tone: "pending", label: "Check due" };
  }, [safety]);

  const showHubNotice = useMemo(() => {
    if (!vehicle || safety?.vehicleBlocked) return true;
    if (safety?.result === "failed") return true;
    return false;
  }, [vehicle, safety]);

  if (noVehicle) {
    const rawMessage = String(error || session?.message || "").trim();
    const isStandardNoVehicle = /no vehicle assigned/i.test(rawMessage);
    const extraMessage = rawMessage && !isStandardNoVehicle ? rawMessage : "";

    return (
      <DriverPageContainer>
        <CheckPageHeader
          title="Vehicle check"
          subtitle="Waiting for a vehicle on today’s duty"
          onRefresh={onRefreshAssignment}
          refreshing={refreshing}
        />

        <CommandBackendNotice
          status="partial"
          title="Waiting for your vehicle assignment"
          description="When dispatch publishes a duty with a vehicle, it will appear here so you can start the walkaround."
        />

        <DriverEmptyState
          icon={Truck}
          title="No vehicle assigned"
          description={
            extraMessage ||
            "You are waiting for dispatch to assign a vehicle. Stay on Checks or Home — refresh if you think it is already live."
          }
          action={
            <div className="flex flex-col items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 min-h-[44px]"
                disabled={refreshing}
                onClick={() => void onRefreshAssignment?.()}
              >
                {refreshing ? "Refreshing…" : "Check again"}
              </Button>
              <Button asChild variant="ghost" className="h-10 text-[var(--ridova-teal)]">
                <Link to="/contact" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Contact Dispatch
                </Link>
              </Button>
            </div>
          }
        />

        <DriverSectionTitle>Today&apos;s status</DriverSectionTitle>
        <div className={`px-4 py-1 ${op.card}`}>
          <StatusRow
            done={false}
            pending
            label="Vehicle assigned"
            detail="Not on your published duty yet"
          />
          <StatusRow done={false} label="Walkaround" detail="Starts after a vehicle is assigned" />
          <StatusRow done={false} label="Ready for duty" detail="Complete the walkaround first" />
        </div>

        <RecentChecksList recentChecks={recentChecks} loading={recentChecksLoading} />
        <DriverFooter driver={driver} depotName={profile?.depotName} />
      </DriverPageContainer>
    );
  }

  if (safety?.vehicleBlocked) {
    return (
      <DriverPageContainer>
        <CheckPageHeader
          title="Vehicle blocked"
          subtitle={vehicle?.registration}
          onRefresh={onRefreshAssignment}
          refreshing={refreshing}
        />
        <CommandBackendNotice
          status="missing"
          title="Do not drive this vehicle"
          description={`${safety.message || "This vehicle cannot enter service."} Contact your transport manager before starting duty.`}
        />
        <VehicleHeroCard
          vehicle={vehicle}
          profile={profile}
          job={job}
          odometer={odometer}
          fuelLevel={fuelLevel}
          readinessChip={heroReadinessChip}
        />
        <div className="mt-4">
          <Button asChild variant="outline" className="h-11 w-full min-h-[44px]">
            <Link to="/contact">Contact Dispatch</Link>
          </Button>
        </div>
        <DriverFooter driver={driver} depotName={profile?.depotName} />
      </DriverPageContainer>
    );
  }

  if (phase === "hub") {
    const walkaroundDone = Boolean(safety?.checkComplete && safety.result !== "failed");
    const ready = walkaroundDone && !safety?.vehicleBlocked;

    return (
      <DriverPageContainer>
        <CheckPageHeader
          title="Vehicle check"
          subtitle={
            ready
              ? "Walkaround complete — ready for duty"
              : walkaroundDone
                ? "Daily check on record"
                : "Complete today’s walkaround before duty"
          }
          onRefresh={onRefreshAssignment}
          refreshing={refreshing}
        />

        <DriverSyncBanner pendingCount={pendingSync} className="mb-0 mt-4" />

        {showHubNotice ? (
          <CommandBackendNotice
            status={readiness.tone}
            title={readiness.headline}
            description={readiness.detail}
          />
        ) : null}

        <VehicleHeroCard
          vehicle={vehicle}
          profile={profile}
          job={job}
          odometer={odometer}
          fuelLevel={fuelLevel}
          readinessChip={heroReadinessChip}
        />

        <WalkaroundStepper activeStep="confirm" />

        <TodayComplianceStatus
          safety={safety}
          vehicleReadiness={vehicleReadiness}
          expiringDocumentCount={expiringDocumentCount}
        />

        <div className="mt-4 space-y-2">
          {walkaroundDone ? (
            <>
              <Button
                type="button"
                className={`h-12 w-full min-h-[44px] ${op.primaryBtn}`}
                onClick={() => setPhase("start")}
              >
                Start {checkTypeLabel}
              </Button>
              <Button asChild variant="outline" className="h-11 w-full min-h-[44px]">
                <Link to="/jobs">Go to today&apos;s jobs</Link>
              </Button>
            </>
          ) : (
            <Button
              type="button"
              className={`h-12 w-full min-h-[44px] ${op.primaryBtn}`}
              onClick={() => setPhase("start")}
            >
              <ClipboardCheck className="mr-2 h-5 w-5" />
              Start walkaround
            </Button>
          )}
          <Button asChild variant="outline" className="h-11 w-full min-h-[44px]">
            <Link to="/contact">Contact Dispatch</Link>
          </Button>
        </div>

        <RecentChecksList recentChecks={recentChecks} loading={recentChecksLoading} />
        <DriverFooter driver={driver} depotName={profile?.depotName} />
      </DriverPageContainer>
    );
  }

  return (
    <div className={`${op.pageBg} min-h-dvh`}>
      <DriverPageContainer>
        <CheckPageHeader
          title="Start walkaround"
          subtitle={vehicle?.registration ?? "Confirm vehicle"}
          onRefresh={onRefreshAssignment}
          refreshing={refreshing}
        />
      </DriverPageContainer>
      <WalkaroundStepper activeStep="confirm" />

      <div className="space-y-4 px-4 pb-8 pt-2">
        <DriverSyncBanner pendingCount={pendingSync} className="mb-0" />

        <VehicleHeroCard
          vehicle={vehicle}
          profile={profile}
          job={job}
          odometer={odometer}
          fuelLevel={fuelLevel}
          readinessChip={heroReadinessChip}
        />

        <Button
          type="button"
          variant="ghost"
          className="h-10 w-full text-muted-foreground"
          onClick={() => setPhase("hub")}
        >
          Back to vehicle check
        </Button>

        {conditionSummary?.enabled !== false && vehicle ? (
          <VehicleConditionAcknowledgement
            vehicleRegistration={vehicle.registration}
            lastInspectionAt={conditionSummary?.lastInspectionAt}
            openDamageCount={conditionSummary?.openDamageCount ?? 0}
            restrictions={conditionSummary?.restrictions ?? []}
            disabled={conditionAcknowledged}
            onAcknowledge={onConditionAcknowledge}
          />
        ) : null}

        <div className={`${op.card} space-y-3 p-4`}>
          <label className="block">
            <span className="text-xs uppercase text-muted-foreground">Check type</span>
            <select
              className={`mt-1 w-full rounded-xl px-3 py-2.5 text-sm ${op.input}`}
              value={checkType}
              onChange={(e) => onCheckTypeChange(e.target.value)}
            >
              {checkTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs uppercase text-muted-foreground">Odometer reading *</span>
            <input
              type="number"
              inputMode="numeric"
              className={`mt-1 w-full rounded-xl px-3 py-2.5 text-sm ${op.input}`}
              placeholder="e.g. 45230"
              value={odometer}
              onChange={(e) => onOdometerChange(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Enter the mileage, then photograph the odometer so Admin and Yard can verify it.
            </p>
          </label>

          <div>
            <p className="text-xs uppercase text-muted-foreground">Odometer photo *</p>
            <label className="mt-1 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20">
              <Camera className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {odometerPhotoPreview ? "Change odometer photo" : "Photograph the odometer"}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => onOdometerPhotoChange?.(e.target.files?.[0] ?? null)}
              />
            </label>
            {odometerPhotoPreview ? (
              <img
                src={odometerPhotoPreview}
                alt="Odometer evidence"
                className="mt-2 max-h-40 w-full rounded-xl object-cover"
              />
            ) : (
              <p className="mt-1 text-xs text-amber-800">
                Required — if the number is mistyped, this photo shows the correct reading.
              </p>
            )}
          </div>

          <label className="block">
            <span className="text-xs uppercase text-muted-foreground">Fuel / charge level</span>
            <input
              className={`mt-1 w-full rounded-xl px-3 py-2.5 text-sm ${op.input}`}
              placeholder="e.g. 3/4 tank or 78%"
              value={fuelLevel}
              onChange={(e) => onFuelLevelChange(e.target.value)}
            />
          </label>
        </div>

        <label
          className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${
            vehicleConfirmed
              ? "border-[var(--ridova-lime)]/40 bg-[var(--ridova-lime)]/10"
              : op.card
          }`}
        >
          <input
            type="checkbox"
            className="mt-1"
            checked={vehicleConfirmed}
            onChange={(e) => onVehicleConfirmedChange(e.target.checked)}
          />
          <span className="text-sm">
            I confirm this is my assigned vehicle for today&apos;s duty.
          </span>
        </label>

        {syncHint ? (
          <p className="flex items-center justify-between text-xs text-muted-foreground">
            {syncHint}
            <button type="button" className={`font-medium ${op.linkAccent}`} onClick={onDiscardDraft}>
              Discard draft
            </button>
          </p>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {draftComplete ? (
          <Button className={`h-12 w-full ${op.primaryBtn}`} onClick={onContinueReview}>
            Continue to sign &amp; submit
          </Button>
        ) : (
          <Button className={`h-12 w-full ${op.primaryBtn}`} onClick={onStart}>
            {safety?.checkComplete
              ? `Start ${checkTypeLabel}`
              : `Start checklist (${session?.checklist?.totalSteps ?? 0} items)`}
          </Button>
        )}

        {safety?.checkComplete ? (
          <Button asChild variant="outline" className="h-11 w-full">
            <Link to="/jobs">Go to today&apos;s jobs</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
