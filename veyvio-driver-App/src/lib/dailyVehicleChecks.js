/** Training preview — live checks use the org PSV template from the server. */
export { FALLBACK_WALKAROUND_ITEMS as DAILY_VEHICLE_CHECKS } from "@/lib/walkaround-check-template";

export const VEHICLE_CHECK_TRAINING_ACKS = [
  {
    key: "before_duty",
    label: "I will complete a daily vehicle check before every shift, before going online or accepting jobs.",
  },
  {
    key: "pass_fail",
    label: "I will tap Pass or Fail honestly for each checklist item — false declarations are a serious offence.",
  },
  {
    key: "defects",
    label: "If anything fails, I will describe the fault. The app sends defects to my operator automatically.",
  },
  {
    key: "nil_defect",
    label: "When everything is OK, I will submit a nil-defect walkaround (no faults found).",
  },
  {
    key: "accessibility",
    label: "On wheelchair-accessible vehicles I will check the ramp/lift and restraints before passenger duties.",
  },
];
