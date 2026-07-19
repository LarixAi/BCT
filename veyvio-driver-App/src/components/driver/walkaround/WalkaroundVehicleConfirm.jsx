import { Link } from "react-router-dom";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import DriverSyncBanner from "@/components/driver/operational/DriverSyncBanner";
import WalkaroundStepper from "@/components/driver/walkaround/WalkaroundStepper";
import { CHECK_TYPES } from "@/services/vehicle-check.service";
import { op } from "@/lib/driver-operational-theme";
import { formatUkTime } from "@/lib/uk-locale";

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
}) {
  const vehicle = session?.vehicle;
  const job = session?.job;
  const profile = session?.profile;
  const safety = session?.safety;
  const firstName = driver?.fullName?.split(" ")[0] ?? "Driver";
  const dailyAlreadyDone =
    safety?.checkComplete &&
    checkType === CHECK_TYPES.daily.id &&
    safety.result !== "failed";

  if (!vehicle && !session?.ok) {
    return (
      <div className={op.pageBg}>
        <DriverOperationalHeader title="Vehicle check" subtitle="Walkaround" onBack={onBack} />
        <div className="px-4 pb-8 space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-950">No vehicle assigned</p>
            <p className="text-sm text-amber-900 mt-1">
              {error || session?.message || "Contact dispatch to assign a vehicle for today before starting a walkaround."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1 h-10">
              <Link to="/check/vehicles">Change vehicle</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 h-10">
              <Link to="/check/history">Past checks</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (safety?.vehicleBlocked) {
    return (
      <div className={op.pageBg}>
        <DriverOperationalHeader title="Vehicle blocked" backTo="/" />
        <div className="p-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="font-bold text-red-900">Do not drive this vehicle</p>
            <p className="text-sm text-red-800 mt-2">{safety.message}</p>
            <p className="text-sm text-red-800 mt-2">Contact your transport manager before starting duty.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${op.pageBg} min-h-[calc(100dvh-4rem)]`}>
      <DriverOperationalHeader title="Start walkaround" subtitle={`Good morning, ${firstName}`} onBack={onBack} />
      <WalkaroundStepper activeStep="confirm" />

      <div className="px-4 pb-8 space-y-4">
        <DriverSyncBanner pendingCount={pendingSync} className="mb-0" />
        {safety?.checkComplete ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <p className="font-semibold text-emerald-900">Check already submitted today</p>
            <p className="text-emerald-800 mt-1">
              {safety.resultLabel ?? (safety.result === "nil_defect" ? "Nil defects" : safety.result === "failed" ? "Defects reported" : "Complete")}
              {safety.startedAt ? ` · started ${formatUkTime(safety.startedAt)}` : ""}
            </p>
            <p className="text-emerald-800 mt-1 text-xs">You can start a changeover check if another driver used this vehicle.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-950">Vehicle check required</p>
            <p className="text-sm text-amber-900 mt-1">Complete today&apos;s walkaround before starting this job.</p>
          </div>
        )}

        <div className={`${op.card} p-4 space-y-3`}>
          <Row label="Vehicle" value={vehicle?.registration ?? "—"} />
          <Row label="Make / model" value={[vehicle?.make, vehicle?.model].filter(Boolean).join(" ") || "—"} />
          <Row label="Type" value={profile?.vehicleType?.replace(/_/g, " ") ?? "—"} />
          <Row label="Route / job" value={job?.route_name ?? "—"} />
          <Row label="Depot" value={profile?.depotName ?? "—"} />
          <Row label="Template" value={session?.checklist?.templateLabel ?? "PSV walkaround"} />
          {profile?.usedForSchoolTransport ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-2">
              School transport add-on included for today&apos;s route.
            </p>
          ) : null}
        </div>

        <div className={`${op.card} p-4 space-y-3`}>
          <label className="block">
            <span className="text-xs text-muted-foreground uppercase">Check type</span>
            <select
              className={`mt-1 w-full rounded-xl px-3 py-2.5 text-sm ${op.input}`}
              value={checkType}
              onChange={(e) => onCheckTypeChange(e.target.value)}
            >
              {checkTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-muted-foreground uppercase">Odometer reading *</span>
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
            <label
              className={`mt-1 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border ${op.card}`}
            >
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
            <span className="text-xs text-muted-foreground uppercase">Fuel / charge level</span>
            <input
              className={`mt-1 w-full rounded-xl px-3 py-2.5 text-sm ${op.input}`}
              placeholder="e.g. 3/4 tank or 78%"
              value={fuelLevel}
              onChange={(e) => onFuelLevelChange(e.target.value)}
            />
          </label>
        </div>

        <label className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer ${vehicleConfirmed ? "border-emerald-300 bg-emerald-50" : op.card}`}>
          <input type="checkbox" className="mt-1" checked={vehicleConfirmed} onChange={(e) => onVehicleConfirmedChange(e.target.checked)} />
          <span className="text-sm">I confirm this is my assigned vehicle for today&apos;s duty.</span>
        </label>

        {syncHint ? (
          <p className="text-xs text-muted-foreground flex items-center justify-between">
            {syncHint}
            <button type="button" className="text-[#1eaeae] font-medium" onClick={onDiscardDraft}>Discard draft</button>
          </p>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex gap-2">
          <Button asChild variant="outline" className="flex-1 h-10">
            <Link to="/check/vehicles">Change vehicle</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 h-10">
            <Link to="/check/history">Past checks</Link>
          </Button>
        </div>

        {dailyAlreadyDone ? (
          <Button asChild className={`w-full h-12 ${op.primaryBtn}`}>
            <Link to="/jobs">Go to today&apos;s jobs</Link>
          </Button>
        ) : draftComplete ? (
          <Button className={`w-full h-12 ${op.primaryBtn}`} onClick={onContinueReview}>
            Continue to sign &amp; submit
          </Button>
        ) : (
          <Button className={`w-full h-12 ${op.primaryBtn}`} onClick={onStart}>
            Start walkaround ({session?.checklist?.totalSteps ?? 0} items)
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground text-right">{value}</span>
    </div>
  );
}
