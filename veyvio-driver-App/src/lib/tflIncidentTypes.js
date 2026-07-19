/**
 * TfL-aligned incident categories for driver SOS / operator reporting.
 * Maps to Complaint.complaint_type enum where applicable.
 * @see PHV Driver Handbook — report assaults to police (999/101) and operator.
 */
export const DRIVER_SOS_OPTIONS = [
  {
    id: "emergency",
    label: "Emergency",
    subtitle: "Call 999 — police or ambulance",
    icon: "🚨",
    action: "call_999",
  },
  {
    id: "assault",
    label: "Assault or attack",
    subtitle: "Physical attack on you or passenger",
    icon: "👊",
    complaintType: "safety_concern",
    tflNote: "Report to police (999 or 101) and your operator within 24 hours.",
  },
  {
    id: "harassment",
    label: "Threat or harassment",
    subtitle: "Verbal abuse, hate crime, stalking",
    icon: "⚠️",
    complaintType: "safety_concern",
    tflNote: "TfL urges reporting hate crime to the police.",
  },
  {
    id: "passenger_behaviour",
    label: "Passenger behaviour",
    subtitle: "Refusal to pay, aggression, safety risk",
    icon: "👤",
    complaintType: "safety_concern",
  },
  {
    id: "accident",
    label: "Accident or collision",
    subtitle: "Road traffic incident involving the vehicle",
    icon: "💥",
    complaintType: "safety_concern",
    tflNote: "Report accidents to your operator as soon as practicable.",
  },
  {
    id: "vehicle",
    label: "Vehicle issue",
    subtitle: "Breakdown, defect, or safety fault",
    icon: "🚗",
    complaintType: "vehicle_condition",
  },
  {
    id: "lost_property",
    label: "Lost property",
    subtitle: "Item left in vehicle by passenger",
    icon: "🎒",
    complaintType: "lost_property",
  },
  {
    id: "accessibility",
    label: "Accessibility issue",
    subtitle: "Assistance dog, wheelchair, discrimination",
    icon: "♿",
    complaintType: "safety_concern",
    tflNote: "Accessibility refusals must be reported to the operator.",
  },
  {
    id: "other",
    label: "Other incident",
    subtitle: "Something else — describe in the report",
    icon: "📋",
    complaintType: "other",
  },
];

export function getSosOption(id) {
  return DRIVER_SOS_OPTIONS.find(o => o.id === id);
}
