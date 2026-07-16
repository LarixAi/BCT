import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EvidenceCaptureControl } from "@/components/driver/media/EvidenceCaptureControl";
import { VehicleMismatchScreen } from "@/components/driver/checks/BodyworkReview";
import { FocusedPageShell } from "@/components/driver/shells/FocusedPageShell";
import { useVehicleCheckStore } from "@/store/vehicle-check";
import { canSeedOperationalDemo } from "@/platform/dev/dev-guards";
import { isMediaCancelled } from "@/platform/media/capture-photo";
import {
  formatRegistration,
  normaliseRegistration,
  parseVehicleQrPayload,
  scanQrCode,
} from "@/platform/media/scan-qr";

export const Route = createFileRoute("/_app/checks/verify")({
  head: () => ({ meta: [{ title: "Verify vehicle — Veyvio Driver" }] }),
  component: VerifyVehiclePage,
});

function VerifyVehiclePage() {
  const navigate = useNavigate();
  const checksHome = useVehicleCheckStore((s) => s.checksHome);
  const activeSession = useVehicleCheckStore((s) => s.activeSession);
  const startCheck = useVehicleCheckStore((s) => s.startCheck);
  const setVerification = useVehicleCheckStore((s) => s.setVerification);

  const vehicle = checksHome.vehicle;
  const [registration, setRegistration] = useState(vehicle.registration);
  const [odometer, setOdometer] = useState(String(vehicle.mileage));
  const [fuelLevel, setFuelLevel] = useState(vehicle.fuelOrChargeLevel);
  const [dashboardPhoto, setDashboardPhoto] = useState<File | null>(null);
  const [mismatch, setMismatch] = useState(activeSession?.verificationMismatch);
  const [scanning, setScanning] = useState(false);

  const registrationMatches =
    normaliseRegistration(registration) === normaliseRegistration(vehicle.registration);

  function ensureSession() {
    if (!useVehicleCheckStore.getState().activeSession) {
      startCheck();
    }
  }

  function startWalkaround(opts?: { verified?: boolean }) {
    ensureSession();
    setVerification({
      verified: opts?.verified ?? registrationMatches,
      odometer: Number(odometer) || undefined,
      fuelLevel,
      dashboardPhotoTaken: Boolean(dashboardPhoto),
    });
    void navigate({ to: "/checks/walkaround", search: { section: undefined, item: undefined, step: undefined } });
  }

  async function handleScanQr() {
    setScanning(true);
    try {
      const raw = await scanQrCode();
      if (!raw) {
        toast.message("No QR code read. Try again or enter the registration.");
        return;
      }

      const parsed = parseVehicleQrPayload(raw);
      if (!parsed) {
        toast.error("That QR code is not a recognised vehicle tag.");
        return;
      }

      ensureSession();
      setRegistration(parsed.registration);

      const matches =
        normaliseRegistration(parsed.registration) ===
        normaliseRegistration(vehicle.registration);

      if (!matches) {
        const m = {
          scannedRegistration: parsed.registration,
          scannedFleetNumber: parsed.fleetNumber ?? "—",
        };
        setMismatch(m);
        setVerification({ verified: false, mismatch: m });
        toast.error("Scanned vehicle does not match this assignment.");
        return;
      }

      setMismatch(undefined);
      toast.success(`Vehicle matched · ${parsed.registration}`);
      setVerification({
        verified: true,
        odometer: Number(odometer) || undefined,
        fuelLevel,
        dashboardPhotoTaken: Boolean(dashboardPhoto),
      });
    } catch (error) {
      if (!isMediaCancelled(error)) {
        toast.error(error instanceof Error ? error.message : "Could not open the QR scanner.");
      }
    } finally {
      setScanning(false);
    }
  }

  function handleScanMismatch() {
    ensureSession();
    const m = { scannedRegistration: "LK23 XYZ", scannedFleetNumber: "061" };
    setMismatch(m);
    setVerification({ verified: false, mismatch: m });
  }

  if (mismatch) {
    return (
      <FocusedPageShell title="Vehicle mismatch" backTo="/checks" backLabel="Checks" eyebrow="Walkaround">
        <VehicleMismatchScreen
          assignedRegistration={vehicle.registration}
          assignedFleet={vehicle.fleetNumber}
          scannedRegistration={mismatch.scannedRegistration}
          scannedFleet={mismatch.scannedFleetNumber}
          onScanAgain={() => setMismatch(undefined)}
        />
      </FocusedPageShell>
    );
  }

  return (
    <FocusedPageShell
      title="Verify vehicle"
      backTo="/checks"
      backLabel="Checks"
      eyebrow="Walkaround"
      subtitle="Confirm you are standing with the correct vehicle before starting the walkaround."
    >
      <div className="animate-in-up space-y-5">
        <div className="rounded-[14px] border border-border bg-background p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">Assigned</p>
          <p className="mt-1 font-mono text-lg font-extrabold">{vehicle.registration}</p>
          <p className="text-sm text-muted">
            Fleet {vehicle.fleetNumber} · {vehicle.make} {vehicle.model}
          </p>
        </div>

        <div className={`grid gap-2 ${canSeedOperationalDemo() ? "grid-cols-2" : "grid-cols-1"}`}>
          <Button
            variant="outline"
            className="h-20 flex-col gap-1"
            disabled={scanning}
            onClick={() => void handleScanQr()}
          >
            {scanning ? <Loader2 className="size-6 animate-spin" /> : <QrCode className="size-6" />}
            {scanning ? "Scanning…" : "Scan QR code"}
          </Button>
          {canSeedOperationalDemo() ? (
            <Button variant="outline" className="h-20 flex-col gap-1" onClick={handleScanMismatch}>
              <QrCode className="size-6" />
              Demo mismatch
            </Button>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="reg">Registration</Label>
            <Input
              id="reg"
              value={registration}
              onChange={(e) => setRegistration(formatRegistration(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="odo">Odometer</Label>
            <Input id="odo" inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fuel">Fuel / charge level</Label>
            <Input id="fuel" value={fuelLevel} onChange={(e) => setFuelLevel(e.target.value)} />
          </div>
        </div>

        <EvidenceCaptureControl
          label="Take dashboard photo"
          capturedLabel="Dashboard photo captured"
          value={dashboardPhoto}
          onChange={setDashboardPhoto}
        />

        {vehicle.vorRestrictions && vehicle.vorRestrictions.length > 0 && (
          <div className="rounded-[14px] border border-warn/30 bg-warn/5 p-3 text-sm text-warn">
            <p className="font-medium">Maintenance restrictions</p>
            <ul className="mt-1 list-inside list-disc">
              {vehicle.vorRestrictions.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        <Button
          className="w-full"
          disabled={!registrationMatches}
          onClick={() => startWalkaround({ verified: true })}
        >
          Confirm and start check
        </Button>
      </div>
    </FocusedPageShell>
  );
}
