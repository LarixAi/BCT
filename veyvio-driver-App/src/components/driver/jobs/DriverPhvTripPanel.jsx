import { useState } from "react";
import { Button } from "@/components/ui/button";
import { op } from "@/lib/driver-operational-theme";
import {
  advanceCustomerBookingJob,
  needsPickupPin,
  phvAdvanceLabel,
  verifyPickupPin,
} from "@/services/customer-phv-job.service";
import DriverBookingChatPanel from "@/components/driver/mobile/DriverBookingChatPanel";

export default function DriverPhvTripPanel({ job, driver, disabled, onUpdated }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const advanceLabel = phvAdvanceLabel(job?.status);
  const showPin = needsPickupPin(job?.status);

  async function runAdvance() {
    setBusy(true);
    setMessage("");
    const result = await advanceCustomerBookingJob(job.id, driver);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setMessage("Trip updated.");
    await onUpdated?.();
  }

  async function runVerifyPin() {
    setBusy(true);
    setMessage("");
    const result = await verifyPickupPin(job.id, pin);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setPin("");
    setMessage("Pickup PIN verified.");
    await onUpdated?.();
  }

  return (
    <div className="mt-4 rounded-2xl border border-[#1eaeae]/30 bg-[#1eaeae]/5 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[#1eaeae]">PHV customer booking</p>
      <p className="mt-1 text-sm text-gray-700">
        Pre-booked private hire — follow the steps below. The passenger shares their pickup PIN when you arrive.
      </p>

      {showPin ? (
        <div className="mt-3 space-y-2">
          <label className="block text-sm font-medium text-gray-800">Passenger pickup PIN</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="4-digit PIN"
            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-center text-2xl font-mono tracking-[0.4em]"
            disabled={disabled || busy}
          />
          <Button
            className={`w-full h-12 rounded-xl ${op.primaryBtn}`}
            disabled={disabled || busy || pin.length < 4}
            onClick={() => void runVerifyPin()}
          >
            {busy ? "Checking…" : "Verify PIN & board passenger"}
          </Button>
        </div>
      ) : advanceLabel ? (
        <Button
          className={`mt-3 w-full h-12 rounded-xl ${op.primaryBtn}`}
          disabled={disabled || busy}
          onClick={() => void runAdvance()}
        >
          {busy ? "Working…" : advanceLabel}
        </Button>
      ) : null}

      {message ? <p className="mt-2 text-sm text-gray-600">{message}</p> : null}

      {job?.customerBookingId ? (
        <DriverBookingChatPanel
          customerBookingId={job.customerBookingId}
          customerName={job.routeName ?? "Passenger"}
          disabled={disabled || busy}
        />
      ) : null}
    </div>
  );
}
