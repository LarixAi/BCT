import { format } from "date-fns";
import { ArrowLeft, ChevronRight, Loader2, Phone, User } from "lucide-react";
import NavigationPanel from "@/components/driver/NavigationPanel";
import CancelJobModal from "@/components/driver/CancelJobModal";
import { Button } from "@/components/ui/button";
import { JOB_FLOW } from "@/lib/phv-job/job-flow";
import { DRIVER_SAFE_TOP } from "@/lib/driverSafeArea";

export default function DriverActiveJobView({
  booking,
  driver,
  currentStep,
  stepIndex,
  updating,
  showCancelModal,
  cancelling,
  onBack,
  onAdvance,
  onOpenCancel,
  onCloseCancel,
  onConfirmCancel,
}) {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div
        className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-3"
        style={{ paddingTop: DRIVER_SAFE_TOP }}
      >
        <button onClick={onBack} className="text-slate-400 hover:text-white p-1" type="button">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="font-semibold text-sm">{booking.booking_reference}</p>
          <p className="text-xs text-slate-400">
            {currentStep?.icon} {currentStep?.label || booking.booking_status}
          </p>
        </div>
        <div className="text-right">
          <span className="text-emerald-400 font-bold text-lg">
            £{((booking.fare_estimate || 0) * 0.8).toFixed(2)}
          </span>
          <p className="text-xs text-slate-500">your earnings</p>
        </div>
      </div>

      <div className="bg-slate-800 px-4 pt-3 pb-2 border-b border-slate-700">
        <div className="flex items-center max-w-lg mx-auto">
          {JOB_FLOW.map((step, i) => (
            <div key={step.status} className="flex items-center flex-1">
              <div className={`h-1.5 rounded-full transition-all flex-1 ${i <= stepIndex ? "bg-primary" : "bg-slate-700"}`} />
              {i < JOB_FLOW.length - 1 && (
                <div
                  className={`w-3 h-3 rounded-full shrink-0 border-2 transition-all ${
                    i < stepIndex
                      ? "bg-primary border-primary"
                      : i === stepIndex
                        ? "bg-slate-900 border-primary animate-pulse"
                        : "bg-slate-900 border-slate-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 max-w-lg mx-auto">
          {JOB_FLOW.map((step, i) => (
            <p key={step.status} className={`text-xs ${i <= stepIndex ? "text-primary font-medium" : "text-slate-600"}`}>
              {step.shortLabel}
            </p>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-lg mx-auto w-full pb-24">
        {currentStep ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-300 flex items-center gap-2">
            <span className="text-xl">{currentStep.icon}</span>
            <p>{currentStep.description}</p>
          </div>
        ) : null}

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Passenger</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{booking.customer_name}</p>
                <p className="text-sm text-slate-400">
                  {booking.passenger_count || 1} passenger{(booking.passenger_count || 1) > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            {booking.customer_phone ? (
              <a href={`tel:${booking.customer_phone}`}>
                <Button size="sm" className="bg-primary/20 hover:bg-primary/30 text-primary border-0 gap-1.5">
                  <Phone className="w-4 h-4" /> Call
                </Button>
              </a>
            ) : null}
          </div>
          {booking.special_requirements ? (
            <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-xs text-amber-300">
              {booking.special_requirements}
            </div>
          ) : null}
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Route</p>
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <div className="w-0.5 h-9 bg-slate-600" />
              <div className="w-3 h-3 rounded-full bg-red-400" />
            </div>
            <div className="space-y-4 flex-1 text-sm">
              <div>
                <p className="text-xs text-slate-400">Pick up</p>
                <p className="font-medium mt-0.5">{booking.pickup_address}</p>
                {booking.pickup_postcode ? <p className="text-xs text-slate-500">{booking.pickup_postcode}</p> : null}
              </div>
              <div>
                <p className="text-xs text-slate-400">Drop off</p>
                <p className="font-medium mt-0.5">{booking.dropoff_address}</p>
                {booking.dropoff_postcode ? <p className="text-xs text-slate-500">{booking.dropoff_postcode}</p> : null}
              </div>
            </div>
          </div>
          <NavigationPanel booking={booking} driver={driver} />
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2 text-xs">
          <p className="text-slate-400 uppercase tracking-wide font-semibold">TfL Timeline</p>
          {[
            { label: "Driver accepted", value: booking.driver_accept_time },
            { label: "En route", value: booking.dispatch_time },
            { label: "Arrived at pickup", value: booking.arrival_time },
            { label: "Passenger on board", value: booking.pickup_time },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className={value ? "text-slate-400" : "text-slate-700"}>{label}</span>
              <span className={value ? "text-slate-300 font-mono" : "text-slate-700"}>
                {value ? format(new Date(value), "HH:mm") : "—"}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Fare Breakdown</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Total charged to customer</span>
              <span className="font-medium text-white">£{(booking.fare_estimate || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Platform fee (20%)</span>
              <span>-£{((booking.fare_estimate || 0) * 0.2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-700 text-base">
              <span className="font-semibold text-white">Your earnings (80%)</span>
              <span className="font-bold text-emerald-400">£{((booking.fare_estimate || 0) * 0.8).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {booking.notes ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Operator Notes</p>
            <p className="text-sm text-slate-300">{booking.notes}</p>
          </div>
        ) : null}
      </div>

      {currentStep ? (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur border-t border-slate-800">
          <div className="max-w-lg mx-auto space-y-2">
            <Button
              onClick={onAdvance}
              disabled={updating}
              className={`w-full h-14 text-base font-bold text-white gap-2 ${currentStep.actionColor}`}
            >
              {updating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Updating...
                </>
              ) : (
                <>
                  <ChevronRight className="w-5 h-5" /> {currentStep.action}
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={onOpenCancel}
              className="w-full h-9 text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10"
            >
              Cancel job
            </Button>
          </div>
        </div>
      ) : null}

      <CancelJobModal
        open={showCancelModal}
        onClose={onCloseCancel}
        onConfirm={onConfirmCancel}
        loading={cancelling}
      />
    </div>
  );
}
