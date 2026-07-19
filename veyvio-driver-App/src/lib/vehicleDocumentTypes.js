export const VEHICLE_DOC_TYPES = [
  { value: "phv_licence", label: "PHV vehicle licence" },
  { value: "phv_back_page", label: "PHV (back page)" },
  { value: "mot_certificate", label: "MOT certificate" },
  { value: "insurance_certificate", label: "Insurance certificate" },
  { value: "insurance_digital", label: "Digital insurance certificate" },
  { value: "permission_letter", label: "Permission letter" },
  { value: "v5_logbook", label: "V5 logbook" },
  { value: "other", label: "Other document" },
];

export function vehicleDocTypeLabel(type) {
  return VEHICLE_DOC_TYPES.find((d) => d.value === type)?.label || type || "Document";
}

export const VEHICLE_DOC_STATUS = {
  pending: { label: "Pending review", className: "bg-amber-100 text-amber-800" },
  verified: { label: "Verified", className: "bg-green-100 text-green-800" },
  expired: { label: "Expired", className: "bg-red-100 text-red-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
};
