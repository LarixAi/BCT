import { useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  Receipt,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { logAuditEvent } from "@/lib/auditLogger";
import { generateAndSaveInvoice } from "@/lib/phv-job/generate-invoice";
import { DRIVER_SAFE_TOP } from "@/lib/driverSafeArea";

export default function PaymentConfirmation({ booking, driver, onConfirmed }) {
  const [confirming, setConfirming] = useState(false);
  const fare = booking.final_fare || booking.fare_estimate || 0;
  const method = booking.payment_method || "cash";
  const methodLabel = { card: "Card Payment", cash: "Cash", account: "Account" }[method] || method;
  const methodIcon =
    method === "card" ? (
      <CreditCard className="w-8 h-8 text-blue-400" />
    ) : method === "cash" ? (
      <Banknote className="w-8 h-8 text-emerald-400" />
    ) : (
      <Building2 className="w-8 h-8 text-purple-400" />
    );

  const confirm = async () => {
    setConfirming(true);
    const now = new Date().toISOString();
    await base44.entities.Booking.update(booking.id, {
      final_fare: fare,
      payment_status: "captured",
      completion_time: booking.completion_time || now,
    });
    await base44.entities.BookingEvent.create({
      booking_id: booking.id,
      event_type: "payment_captured",
      actor_name: driver.full_name,
      actor_role: "driver",
      description: `Payment of £${fare.toFixed(2)} confirmed by driver via ${methodLabel}.`,
      metadata: JSON.stringify({ fare, method }),
    });
    await logAuditEvent({
      action: "payment_confirmed",
      entityType: "Booking",
      entityId: booking.id,
      actorName: driver.full_name,
      actorRole: "driver",
      description: `Driver confirmed payment of £${fare.toFixed(2)} by ${methodLabel} for booking ${booking.booking_reference}.`,
      severity: "info",
    });
    const records = await base44.entities.DispatchRecord.filter({ booking_id: booking.id }, "-created_date", 1);
    if (records.length) await base44.entities.DispatchRecord.update(records[0].id, { status: "completed" });
    await generateAndSaveInvoice({ ...booking, final_fare: fare }, driver);
    onConfirmed();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div
        className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-3"
        style={{ paddingTop: DRIVER_SAFE_TOP }}
      >
        <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <p className="font-bold">Trip Complete!</p>
          <p className="text-xs text-slate-400">{booking.booking_reference}</p>
        </div>
      </div>
      <div className="flex-1 p-5 flex flex-col gap-5 max-w-lg mx-auto w-full">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Journey Completed</p>
          <div className="flex items-start gap-3 text-sm">
            <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div className="w-0.5 h-7 bg-slate-600" />
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            </div>
            <div className="space-y-4 flex-1">
              <p className="text-slate-300 text-sm">{booking.pickup_address}</p>
              <p className="text-slate-300 text-sm">{booking.dropoff_address}</p>
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-700 text-sm">
            <span className="text-slate-400">Passenger</span>
            <span className="font-medium">{booking.customer_name}</span>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-4">Fare Summary</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Total charged to customer</span>
              <span className="font-semibold text-white text-base">£{fare.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Platform fee (20%)</span>
              <span>-£{(fare * 0.2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-700">
              <span className="font-bold text-white text-base">Your earnings</span>
              <span className="text-3xl font-extrabold text-emerald-400">£{(fare * 0.8).toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-4">Payment Method</p>
          <div className="flex items-center gap-4">
            {methodIcon}
            <div>
              <p className="font-bold text-lg">{methodLabel}</p>
              {method === "cash" && (
                <p className="text-sm text-amber-300">Collect £{fare.toFixed(2)} from passenger now</p>
              )}
              {method === "card" && (
                <p className="text-sm text-blue-300">Card payment processed by operator system</p>
              )}
              {method === "account" && (
                <p className="text-sm text-purple-300">Charged to passenger account</p>
              )}
            </div>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2 text-xs">
          <p className="text-slate-400 uppercase tracking-wide font-semibold mb-2">TfL Trip Record</p>
          {[
            { label: "Dispatched", value: booking.dispatch_time },
            { label: "Driver arrived", value: booking.arrival_time },
            { label: "Passenger on board", value: booking.pickup_time },
            { label: "Trip completed", value: booking.completion_time },
          ].map(
            ({ label, value }) =>
              value && (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-slate-300 font-mono">{format(new Date(value), "HH:mm dd/MM/yy")}</span>
                </div>
              ),
          )}
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>Confirm below only once you have received or verified payment. This is recorded for TfL compliance.</p>
        </div>
      </div>
      <div className="p-4 bg-slate-900/95 backdrop-blur border-t border-slate-800 max-w-lg mx-auto w-full">
        <Button
          onClick={confirm}
          disabled={confirming}
          className="w-full h-14 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          {confirming ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Processing...
            </>
          ) : (
            <>
              <Receipt className="w-5 h-5" /> Confirm Payment Received
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
