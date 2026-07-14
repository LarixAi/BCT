import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { QrCode, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VehicleMismatchScreen } from "@/components/driver/checks/BodyworkReview";
import { useVehicleCheckStore } from "@/store/vehicle-check";

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
  const [dashboardPhoto, setDashboardPhoto] = useState(false);
  const [mismatch, setMismatch] = useState(activeSession?.verificationMismatch);

  function ensureSession() {
    if (!useVehicleCheckStore.getState().activeSession) {
      startCheck();
    }
  }

  function handleScanMatch() {
    ensureSession();
    setMismatch(undefined);
    setRegistration(vehicle.registration);
    setVerification({ verified: true, odometer: Number(odometer), fuelLevel, dashboardPhotoTaken: dashboardPhoto });
    void navigate({ to: "/checks/walkaround" });
  }

  function handleScanMismatch() {
    ensureSession();
    const m = { scannedRegistration: "LK23 XYZ", scannedFleetNumber: "061" };
    setMismatch(m);
    setVerification({ verified: false, mismatch: m });
  }

  if (mismatch) {
    return (
      <div className="animate-in-up space-y-4">
        <VehicleMismatchScreen
          assignedRegistration={vehicle.registration}
          assignedFleet={vehicle.fleetNumber}
          scannedRegistration={mismatch.scannedRegistration}
          scannedFleet={mismatch.scannedFleetNumber}
          onScanAgain={() => setMismatch(undefined)}
        />
      </div>
    );
  }

  return (
    <div className="animate-in-up space-y-5">
      <header>
        <Link to="/checks" className="text-sm text-link">
          ← Checks
        </Link>
        <h1 className="mt-2 font-display text-xl font-extrabold">Verify your vehicle</h1>
        <p className="mt-1 text-sm text-muted">
          Confirm you are standing with the correct vehicle before starting the walkaround.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Assigned</p>
        <p className="mt-1 font-mono text-lg font-extrabold">{vehicle.registration}</p>
        <p className="text-sm text-muted">
          Fleet {vehicle.fleetNumber} · {vehicle.make} {vehicle.model}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-20 flex-col gap-1" onClick={handleScanMatch}>
          <QrCode className="size-6" />
          Scan QR code
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-1" onClick={handleScanMismatch}>
          <QrCode className="size-6" />
          Demo mismatch
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="reg">Registration</Label>
          <Input id="reg" value={registration} onChange={(e) => setRegistration(e.target.value.toUpperCase())} />
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

      <button
        type="button"
        onClick={() => setDashboardPhoto(true)}
        className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30"
      >
        <Camera className="size-7 text-muted" />
        <span className="text-sm font-medium">{dashboardPhoto ? "Dashboard photo captured" : "Take dashboard photo"}</span>
      </button>

      {vehicle.vorRestrictions && vehicle.vorRestrictions.length > 0 && (
        <div className="rounded-md border border-warn/30 bg-warn/5 p-3 text-sm text-warn">
          <p className="font-medium">Maintenance restrictions</p>
          <ul className="mt-1 list-inside list-disc">
            {vehicle.vorRestrictions.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <Button
        className="h-14 w-full font-bold uppercase tracking-widest"
        disabled={registration !== vehicle.registration}
        onClick={handleScanMatch}
      >
        Confirm and start check
      </Button>
    </div>
  );
}
