/**
 * Driver fuel refill — Gate 2 first-class fuel event to Command.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { OperationalPage } from "./DriverOperationalPageParts";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { commandPostDriverFuelRefill } from "@/lib/command-api";
import { getSupabaseClient } from "@/lib/supabase/client";
import { refreshCommandBootstrap } from "@/services/command-driver-ops.service";
import { op } from "@/lib/driver-operational-theme";

export default function DriverFuelRefill() {
  const { session } = useDriverSupabaseAuth();
  const [litres, setLitres] = useState("");
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const depotId = session?.activeDepotId ?? session?.depots?.[0]?.id ?? null;
      const boot = await refreshCommandBootstrap(depotId).catch(() => null);
      const vehicle = boot?.ok ? boot.bootstrap?.duties?.[0]?.vehicle : null;
      const vehicleId = vehicle?.id ?? vehicle?.vehicleId;
      if (!vehicleId) {
        setMessage("No vehicle on your duty — fuel can only be recorded for an assigned vehicle.");
        return;
      }
      const supabase = getSupabaseClient();
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      if (!token) {
        setMessage("Sign in again to record fuel.");
        return;
      }
      const result = await commandPostDriverFuelRefill(token, {
        vehicleId,
        litres: litres ? Number(litres) : undefined,
        odometer: odometer ? Number(odometer) : undefined,
        notes: notes || undefined,
        clientId: `fuel-${Date.now()}`,
        driverId: session?.driverId ?? session?.driver?.id,
      });
      if (!result.ok) {
        setMessage(result.message ?? "Fuel refill could not be recorded.");
        return;
      }
      setMessage("Fuel refill recorded on Command.");
      setLitres("");
      setOdometer("");
      setNotes("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <OperationalPage title="Fuel refill" subtitle="Record a fuel purchase or top-up." backTo="/vehicle">
      <form onSubmit={submit} className={`space-y-4 p-4 ${op.card}`}>
        <label className="block text-sm">
          <span className="font-medium text-foreground">Litres</span>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            inputMode="decimal"
            value={litres}
            onChange={(e) => setLitres(e.target.value)}
            placeholder="e.g. 40"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-foreground">Odometer</span>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            inputMode="numeric"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
            placeholder="Miles"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-foreground">Notes</span>
          <textarea
            className="mt-1 w-full rounded-md border px-3 py-2"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Saving…" : "Save fuel refill"}
        </Button>
        <Link to="/vehicle" className="block text-center text-sm text-muted-foreground underline">
          Back to vehicle
        </Link>
      </form>
    </OperationalPage>
  );
}
