import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Home,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { DAILY_VEHICLE_CHECKS } from "@/lib/dailyVehicleChecks";
import { OnboardingToggleField } from "@/components/driver/onboarding/OnboardingFormField";

const WORKFLOW_STEPS = [
  {
    icon: Home,
    title: "Open from the home screen",
    body: 'After you are approved, tap "Start vehicle check" on your map home screen. You must complete this before going on duty.',
  },
  {
    icon: ClipboardCheck,
    title: "Answer every checklist item",
    body: "Work through your operator's PSV walkaround checklist by section. Tap pass or fail for each item — failed items create defects automatically.",
  },
  {
    icon: ShieldAlert,
    title: "Describe any faults",
    body: "If you fail an item, add a short note. You can also report an extra defect not on the list. Your transport manager is notified automatically.",
  },
  {
    icon: MapPin,
    title: "Sign and submit",
    body: "Confirm the driver declaration and submit. A nil-defect check clears you for duty; failed checks block the vehicle until repaired.",
  },
];

export default function VehicleCheckTrainingGuide({ acknowledgments, onAckChange, readOnly }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-[#1eaeae]/10 border border-[#1eaeae]/25 p-4 flex gap-3">
        <ClipboardCheck className="w-6 h-6 text-[#1eaeae] shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground text-sm">Daily walkaround checks in this app</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Core Support Fleet uses the driver app to record TfL-required daily safety checks. Your operator can see
            every submission — including nil-defect reports when the vehicle is safe to drive.
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground mb-3">How to complete a check</p>
        <ol className="space-y-3">
          {WORKFLOW_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="flex gap-3 rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex flex-col items-center shrink-0">
                  <span className="w-6 h-6 rounded-full bg-[#8ec63f] text-white text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[#1eaeae] shrink-0" />
                    <p className="font-medium text-sm text-foreground">{step.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground mb-2">What you check each day</p>
        <div className="grid gap-2">
          {DAILY_VEHICLE_CHECKS.filter((item) => item.category !== "final_declaration").slice(0, 8).map((item) => (
            <div key={item.id} className="flex gap-2 rounded-lg border border-border px-3 py-2 bg-background">
              <CheckCircle2 className="w-4 h-4 text-[#8ec63f] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">{item.questionTitle}</p>
                <p className="text-xs text-muted-foreground capitalize">{item.category?.replace(/_/g, " ")}</p>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground px-1">…plus accessibility items on wheelchair-accessible vehicles.</p>
        </div>
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm text-amber-900">If a check fails</p>
          <ul className="mt-2 space-y-1.5 text-xs text-amber-900/90 leading-relaxed list-disc pl-4">
            <li>Do not drive the vehicle or accept passenger jobs.</li>
            <li>Describe the defect clearly in the app — it is sent to your transport manager.</li>
            <li>Contact dispatch if the issue is safety-critical (brakes, steering, tyres, lights).</li>
            <li>Only return to duty after the defect is fixed and you pass a new check.</li>
          </ul>
        </div>
      </div>

      {acknowledgments != null ? (
        <div className="pt-2 border-t border-border space-y-3">
          <p className="text-sm font-semibold text-foreground">Confirm you understand</p>
          {acknowledgments.map((ack) => (
            <OnboardingToggleField
              key={ack.key}
              label={ack.label}
              checked={Boolean(ack.checked)}
              onChange={(v) => onAckChange?.(ack.key, v)}
              disabled={readOnly}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
