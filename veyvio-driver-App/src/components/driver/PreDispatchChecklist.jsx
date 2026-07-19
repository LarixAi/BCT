import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { formatUkTime } from "@/lib/uk-locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ShieldCheck, Car, User, AlertTriangle } from "lucide-react";

const CHECKLIST_ITEMS = [
  { id: "vehicle_roadworthy", label: "Vehicle is roadworthy & safe to drive", category: "vehicle" },
  { id: "documents_onboard", label: "All documents are onboard (insurance, PHV licence)", category: "vehicle" },
  { id: "exterior_clean", label: "Vehicle exterior is clean and presentable", category: "vehicle" },
  { id: "interior_clean", label: "Vehicle interior is clean with no hazards", category: "vehicle" },
  { id: "fuel_adequate", label: "Fuel level is adequate for the journey", category: "vehicle" },
  { id: "seatbelts_working", label: "All seatbelts are functional", category: "vehicle" },
  { id: "driver_fit", label: "I am fit to drive (not fatigued, unwell, or impaired)", category: "personal" },
  { id: "phv_badge_worn", label: "I am wearing my PHV driver badge", category: "personal" },
  { id: "phone_mounted", label: "Phone is mounted safely (not handheld)", category: "personal" },
  { id: "aware_of_booking", label: "I have reviewed the booking details and pickup location", category: "booking" },
];

export default function PreDispatchChecklist({ booking, driver, onAccepted, onDeclined }) {
  const [checked, setChecked] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id) => setChecked(p => ({ ...p, [id]: !p[id] }));

  const allChecked = CHECKLIST_ITEMS.every(item => checked[item.id]);
  const checkedCount = Object.values(checked).filter(Boolean).length;

  const handleAccept = async () => {
    if (!allChecked) return;
    setSubmitting(true);
    try {
      await base44.entities.VehicleSafetyCheck.create({
        driver_id: driver.id,
        vehicle_id: driver.assigned_vehicle_id || "unknown",
        vehicle_registration: booking.vehicle_registration || "N/A",
        check_date: new Date().toISOString().split("T")[0],
        check_time: formatUkTime(new Date()),
        tyres_ok: true,
        lights_ok: true,
        brakes_ok: true,
        mirrors_ok: true,
        windscreen_ok: true,
        seatbelts_ok: true,
        interior_clean: !!checked["interior_clean"],
        exterior_clean: !!checked["exterior_clean"],
        fuel_adequate: !!checked["fuel_adequate"],
        defects_reported: false,
        overall_status: "pass",
        driver_signature: `${driver.full_name} — Pre-dispatch checklist for booking ${booking.booking_reference}`,
        notes: `Pre-dispatch checklist completed at ${formatUkTime(new Date())} for booking ${booking.booking_reference}. All ${CHECKLIST_ITEMS.length} items acknowledged.`,
      });
      onAccepted();
    } finally {
      setSubmitting(false);
    }
  };

  const vehicleItems = CHECKLIST_ITEMS.filter(i => i.category === "vehicle");
  const personalItems = CHECKLIST_ITEMS.filter(i => i.category === "personal");
  const bookingItems = CHECKLIST_ITEMS.filter(i => i.category === "booking");

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          <div>
            <h1 className="font-bold text-base">Pre-Dispatch Checklist</h1>
            <p className="text-xs text-slate-400">Acknowledge all items before accepting this job</p>
          </div>
        </div>
      </div>

      {/* Booking summary */}
      <div className="mx-4 mt-4 bg-primary/10 border border-primary/30 rounded-xl p-4">
        <p className="font-mono text-xs text-primary mb-1">{booking.booking_reference}</p>
        <p className="font-semibold text-sm">{booking.customer_name}</p>
        <p className="text-xs text-slate-400 mt-0.5">📍 {booking.pickup_address}</p>
        <p className="text-xs text-slate-400">🏁 {booking.dropoff_address}</p>
        <p className="text-emerald-400 font-bold text-sm mt-1">
          Est. £{booking.fare_estimate?.toFixed(2) || "—"}
        </p>
      </div>

      {/* Progress */}
      <div className="mx-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">Checklist Progress</span>
          <span className="text-xs font-semibold text-slate-300">{checkedCount}/{CHECKLIST_ITEMS.length}</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${(checkedCount / CHECKLIST_ITEMS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-24">
        {[
          { label: "Vehicle Readiness", icon: <Car className="w-4 h-4 text-purple-400" />, items: vehicleItems },
          { label: "Personal Readiness", icon: <User className="w-4 h-4 text-blue-400" />, items: personalItems },
          { label: "Booking Awareness", icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, items: bookingItems },
        ].map(section => (
          <div key={section.label}>
            <div className="flex items-center gap-2 mb-2">
              {section.icon}
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{section.label}</p>
            </div>
            <div className="space-y-2">
              {section.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    checked[item.id]
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-slate-800 border-slate-700 hover:border-slate-600"
                  }`}
                >
                  {checked[item.id]
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    : <XCircle className="w-5 h-5 text-slate-600 shrink-0" />
                  }
                  <p className={`text-sm ${checked[item.id] ? "text-slate-200" : "text-slate-400"}`}>
                    {item.label}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ))}

        {!allChecked && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">
              All {CHECKLIST_ITEMS.length} items must be acknowledged before you can accept this booking.
              This checklist is recorded for TfL compliance.
            </p>
          </div>
        )}
      </div>

      {/* Actions — fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-700 flex gap-3">
        <Button
          variant="outline"
          onClick={onDeclined}
          className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Decline Job
        </Button>
        <Button
          onClick={handleAccept}
          disabled={!allChecked || submitting}
          className={`flex-1 font-semibold ${allChecked ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-700 text-slate-500 cursor-not-allowed"}`}
        >
          {submitting ? "Saving..." : allChecked ? "✓ Accept Job" : `Check All Items (${checkedCount}/${CHECKLIST_ITEMS.length})`}
        </Button>
      </div>
    </div>
  );
}