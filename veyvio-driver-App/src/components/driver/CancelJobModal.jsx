/**
 * CancelJobModal — shown to driver when they want to cancel an active job.
 * Forces selection of a reason code before allowing cancellation.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

const DRIVER_REASONS = [
  { code: "driver_vehicle_breakdown", label: "Vehicle breakdown" },
  { code: "driver_unsafe_location", label: "Unsafe pickup location" },
  { code: "driver_passenger_unreachable", label: "Passenger unreachable" },
  { code: "driver_personal_emergency", label: "Personal emergency" },
  { code: "other", label: "Other reason" },
];

export default function CancelJobModal({ open, onClose, onConfirm, loading }) {
  const [selectedReason, setSelectedReason] = useState("");

  const handleConfirm = () => {
    if (!selectedReason) return;
    onConfirm(selectedReason);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Cancel this job?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Please select a reason. This is required for TfL compliance and will be logged permanently.
          </p>
          <div className="space-y-2">
            {DRIVER_REASONS.map(r => (
              <button
                key={r.code}
                onClick={() => setSelectedReason(r.code)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  selectedReason === r.code
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-border bg-muted/30 hover:border-red-300 hover:bg-red-50/50"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
            Keep job
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedReason || loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm cancel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}