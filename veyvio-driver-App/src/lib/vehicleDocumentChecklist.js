/**
 * TfL-style vehicle document checklist (Uber driver documents pattern).
 */
const today = () => new Date().toISOString().split("T")[0];

export const VEHICLE_DOCUMENT_CHECKLIST = [
  {
    id: "phv_back",
    label: "[IF REQUIRED] PHV (back page)",
    shortLabel: "PHV (back page)",
    optional: true,
    documentTypes: ["phv_back_page"],
    description:
      "Upload the rear page of your PHV licence only if your operator or TfL has asked for it.",
  },
  {
    id: "phv_licence",
    label: "Private hire vehicle licence (PHVL)",
    shortLabel: "PHV licence (PHVL)",
    documentTypes: ["phv_licence"],
    vehicleVerifiedField: "phv_licence_verified",
    vehicleExpiryField: "phv_licence_expiry",
    vehicleNumberField: "phv_licence_number",
    description:
      "Your vehicle's TfL private hire vehicle licence. Keep a clear photo or PDF of the full licence on file.",
  },
  {
    id: "v5_logbook",
    label: "V5C Vehicle Logbook (2nd Page) or New Keeper Slip",
    shortLabel: "V5C logbook or keeper slip",
    documentTypes: ["v5_logbook"],
    description:
      "Page 2 of the V5C logbook or a new keeper slip showing you as the registered keeper of this vehicle.",
  },
  {
    id: "insurance",
    label: "Insurance Certificate",
    shortLabel: "Insurance certificate",
    documentTypes: ["insurance_certificate"],
    vehicleVerifiedField: "insurance_verified",
    vehicleExpiryField: "insurance_expiry",
    vehicleNumberField: "insurance_policy_number",
    description:
      "Valid hire & reward insurance certificate covering this vehicle for private hire work.",
  },
  {
    id: "insurance_digital",
    label: "[Insurer provided] Digital insurance certificate",
    shortLabel: "Digital insurance certificate",
    optional: true,
    documentTypes: ["insurance_digital"],
    description:
      "If your insurer provides a digital certificate, upload it here in addition to your paper certificate.",
  },
  {
    id: "permission_letter",
    label: "Permission letter",
    shortLabel: "Permission letter",
    optional: true,
    documentTypes: ["permission_letter"],
    description:
      "Required when the vehicle is registered to someone else — a letter confirming you may use it for PHV work.",
  },
  {
    id: "mot",
    label: "UK vehicle inspection",
    shortLabel: "UK vehicle inspection (MOT)",
    documentTypes: ["mot_certificate"],
    vehicleVerifiedField: "mot_verified",
    vehicleExpiryField: "mot_expiry",
    description:
      "Current MOT certificate (UK vehicle inspection). Must be valid for the vehicle to be dispatched.",
  },
];

export const VEHICLE_CHECKLIST_UPLOAD_TYPES = [
  { value: "phv_back_page", label: "PHV (back page)" },
  { value: "phv_licence", label: "PHV vehicle licence (PHVL)" },
  { value: "v5_logbook", label: "V5C logbook / keeper slip" },
  { value: "insurance_certificate", label: "Insurance certificate" },
  { value: "insurance_digital", label: "Digital insurance certificate" },
  { value: "permission_letter", label: "Permission letter" },
  { value: "mot_certificate", label: "UK vehicle inspection (MOT)" },
  { value: "other", label: "Other document" },
];

export function vehicleDocPath(docId) {
  return `/driver/vehicle/doc/${docId}`;
}

export const VEHICLE_DOCUMENTS_LIST_PATH = "/driver/vehicle/documents";

export function getChecklistItemById(docId) {
  return VEHICLE_DOCUMENT_CHECKLIST.find((item) => item.id === docId) || null;
}

export function vehicleChecklistHeading(vehicle) {
  const name = [vehicle?.make, vehicle?.model].filter(Boolean).join(" ");
  const reg = vehicle?.registration || "";
  if (name && reg) return `${name} ${reg}`;
  return name || reg || "Your vehicle";
}

export function findDocForItem(item, documents) {
  const types = item?.documentTypes || [];
  return documents.find((d) => types.includes(d.document_type)) || null;
}

function isExpired(dateStr) {
  return dateStr && dateStr < today();
}

/**
 * @returns {{ key: string, label: string, tone: 'green' | 'muted' | 'amber' | 'red' }}
 */
export function resolveChecklistStatus(item, vehicle, documents) {
  const doc = findDocForItem(item, documents);
  const fieldVerified = item.vehicleVerifiedField
    ? Boolean(vehicle?.[item.vehicleVerifiedField])
    : false;
  const expiry = item.vehicleExpiryField ? vehicle?.[item.vehicleExpiryField] : doc?.expiry_date;

  if (doc?.status === "rejected") {
    return { key: "rejected", label: "Action required", tone: "red" };
  }
  if (doc?.status === "expired" || (expiry && isExpired(expiry))) {
    return { key: "expired", label: "Expired", tone: "red" };
  }
  if (doc?.status === "verified" || fieldVerified) {
    return { key: "completed", label: "Completed", tone: "green" };
  }
  if (doc?.status === "pending" || doc?.file_url) {
    return { key: "pending", label: "Pending review", tone: "amber" };
  }
  if (item.optional) {
    return { key: "optional", label: "Optional", tone: "muted" };
  }
  return { key: "required", label: "Required", tone: "muted" };
}

export function defaultUploadTypeForItem(item) {
  return item?.documentTypes?.[0] || "other";
}

import { formatUkDate } from "@/lib/uk-locale";

export function formatVehicleDocDate(value) {
  if (!value) return null;
  try {
    return formatUkDate(value);
  } catch {
    return value;
  }
}

/** Split bracket prefix like "[IF REQUIRED] Title" into tag + title. */
export function getChecklistDisplayParts(item) {
  const match = item?.label?.match(/^\[([^\]]+)\]\s*(.+)$/);
  const title = item?.shortLabel || match?.[2] || item?.label || "";
  if (match) {
    return { tag: match[1], title, fullTitle: item.label };
  }
  return { tag: null, title, fullTitle: item?.label || title };
}

export function getChecklistProgress(vehicle, documents) {
  const required = VEHICLE_DOCUMENT_CHECKLIST.filter((i) => !i.optional);
  const optional = VEHICLE_DOCUMENT_CHECKLIST.filter((i) => i.optional);

  const isComplete = (item) =>
    resolveChecklistStatus(item, vehicle, documents).key === "completed";

  const needsAction = VEHICLE_DOCUMENT_CHECKLIST.filter((item) => {
    const key = resolveChecklistStatus(item, vehicle, documents).key;
    return key === "required" || key === "rejected" || key === "expired";
  });

  const requiredCompleted = required.filter(isComplete).length;

  return {
    requiredCompleted,
    requiredTotal: required.length,
    optionalCompleted: optional.filter(isComplete).length,
    optionalTotal: optional.length,
    totalCompleted: VEHICLE_DOCUMENT_CHECKLIST.filter(isComplete).length,
    totalItems: VEHICLE_DOCUMENT_CHECKLIST.length,
    needsAction,
    allRequiredComplete: requiredCompleted === required.length,
  };
}

export function getAdjacentChecklistItems(docId) {
  const index = VEHICLE_DOCUMENT_CHECKLIST.findIndex((i) => i.id === docId);
  if (index < 0) return { prev: null, next: null, index: -1 };
  return {
    prev: index > 0 ? VEHICLE_DOCUMENT_CHECKLIST[index - 1] : null,
    next: index < VEHICLE_DOCUMENT_CHECKLIST.length - 1 ? VEHICLE_DOCUMENT_CHECKLIST[index + 1] : null,
    index,
    total: VEHICLE_DOCUMENT_CHECKLIST.length,
  };
}
