import { listDocumentsViaCommand } from "@/services/command-driver-ops.service";
import { loadDriverTrainingCentre, formatTrainingDue } from "@/services/training.service";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const due = new Date(`${String(dateStr).slice(0, 10)}T23:59:59.000Z`);
  if (Number.isNaN(due.getTime())) return null;
  return Math.ceil((due.getTime() - Date.now()) / 86_400_000);
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(`${String(dateStr).slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateStr).slice(0, 10);
  }
}

function findDoc(documents, types) {
  const set = new Set(types);
  return (documents ?? []).find((d) => set.has(String(d.requirementType ?? d.documentType ?? "").toLowerCase())) ?? null;
}

function docStatus(doc) {
  if (!doc) return { label: "Missing", tone: "blocked", detail: "Not on file — upload in Documents" };
  const status = String(doc.verificationStatus ?? doc.status ?? "").toLowerCase();
  const expiry = doc.expiryDate ?? doc.expiresOn ?? null;
  const days = daysUntil(expiry);
  if (["rejected", "declined"].includes(status)) {
    return { label: "Rejected", tone: "blocked", detail: "Resubmit from Documents" };
  }
  if (days != null && days < 0) {
    return {
      label: "Expired",
      tone: "blocked",
      detail: `Expired ${formatDisplayDate(expiry)}`,
    };
  }
  if (days != null && days <= 30) {
    return {
      label: "Expiring",
      tone: "warning",
      detail: `Expires ${formatDisplayDate(expiry)}`,
    };
  }
  if (["pending", "submitted", "awaiting_review"].includes(status)) {
    return {
      label: "In review",
      tone: "warning",
      detail: expiry ? `On file · expires ${formatDisplayDate(expiry)}` : "Submitted for operator review",
    };
  }
  return {
    label: "On file",
    tone: "good",
    detail: expiry ? `Valid until ${formatDisplayDate(expiry)}` : "On file with your operator",
  };
}

function equipmentKey(driverId, reg) {
  return `veyvio.equipment.v1.${driverId || "driver"}.${reg || "vehicle"}`;
}

function loadEquipmentState(driverId, reg) {
  try {
    const raw = localStorage.getItem(equipmentKey(driverId, reg));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Aggregate Command-backed readiness for the Driver Readiness screen.
 */
export async function loadDriverReadinessSnapshot({ driver, session, bootstrap, homeSummary }) {
  const accessStatus = bootstrap?.identity?.accessStatus || session?.accountStatus || "active";
  const eligibilityAllowed = bootstrap?.eligibility?.allowed !== false;
  const duties = bootstrap?.duties ?? [];
  const hasDuty = duties.length > 0;
  const duty = duties[0] ?? null;
  const vehicleReg =
    duty?.vehicle?.registrationNumber ||
    duty?.vehicle?.registration ||
    homeSummary?.vehicleAssignment?.registration ||
    null;

  const checkStatus = String(
    duty?.vehicleCheck?.status ?? homeSummary?.vehicleAssignment?.checkStatus ?? "",
  ).toLowerCase();
  const checkComplete = checkStatus === "complete" || checkStatus === "passed";
  const checkFailed = checkStatus === "failed";

  const signedOn = Boolean(homeSummary?.duty?.signOnAt || duty?.actualSignOnAt);
  const signOnAt = homeSummary?.duty?.signOnAt || duty?.actualSignOnAt || null;

  const [docsResult, trainingResult] = await Promise.all([
    listDocumentsViaCommand().catch(() => ({ ok: false, documents: [] })),
    loadDriverTrainingCentre({
      ...session,
      driverId: driver?.id ?? session?.driverId,
    }).catch(() => ({ ok: false })),
  ]);

  const documents = docsResult?.ok ? docsResult.documents ?? [] : [];
  const licenceDoc = findDoc(documents, ["driving_licence", "licence", "licence_front", "dvla_check"]);
  const medicalDoc = findDoc(documents, ["medical", "medical_certificate", "medical_declaration"]);

  const licenceExpiry = licenceDoc?.expiryDate || driver?.licenceExpiryDate || driver?.licenceExpiry || null;
  const medicalExpiry = medicalDoc?.expiryDate || driver?.medicalExpiryDate || null;

  const licence = licenceDoc
    ? docStatus(licenceDoc)
    : licenceExpiry
      ? docStatus({ verificationStatus: "verified", expiryDate: licenceExpiry })
      : { label: "On file", tone: "good", detail: "On file with your operator" };

  // Prefer document row; fall back to driver profile medical expiry.
  let medical;
  if (medicalDoc) {
    medical = docStatus(medicalDoc);
  } else if (medicalExpiry) {
    medical = docStatus({ verificationStatus: "verified", expiryDate: medicalExpiry });
  } else {
    medical = {
      label: "Operator",
      tone: "neutral",
      detail: "Managed by your transport team in Command",
    };
  }

  let training = {
    label: "Up to date",
    tone: "good",
    detail: "No required training outstanding",
  };
  if (!trainingResult?.ok) {
    training = {
      label: "Unavailable",
      tone: "warning",
      detail: trainingResult?.message || "Could not load training from Command",
    };
  } else {
    const summary = trainingResult.summary ?? {};
    const overdue = Number(summary.overdue ?? 0);
    const dueSoon = Number(summary.dueSoon ?? 0);
    const requiredOpen = Number(summary.requiredOpen ?? 0);
    const urgent = trainingResult.urgent;
    if (overdue > 0) {
      training = {
        label: "Overdue",
        tone: "blocked",
        detail: urgent
          ? `${urgent.title} overdue${urgent.dueAt ? ` · was due ${formatTrainingDue(urgent.dueAt)}` : ""}`
          : `${overdue} course${overdue === 1 ? "" : "s"} overdue`,
      };
    } else if (dueSoon > 0 || requiredOpen > 0) {
      training = {
        label: dueSoon > 0 ? "Due soon" : "Required",
        tone: "warning",
        detail: urgent
          ? `${urgent.title}${urgent.dueAt ? ` · due ${formatTrainingDue(urgent.dueAt)}` : ""} · ${summary.compliancePercent ?? 0}% complete`
          : `${requiredOpen} required · ${summary.compliancePercent ?? 0}% complete`,
      };
    } else if ((trainingResult.assignments ?? []).some((a) => a.status === "completed")) {
      const nextExpiry = (trainingResult.assignments ?? [])
        .filter((a) => a.status === "completed" && a.expiresAt)
        .map((a) => a.expiresAt)
        .sort()[0];
      training = {
        label: "Complete",
        tone: "good",
        detail: nextExpiry
          ? `All required complete · next refresher ${formatTrainingDue(nextExpiry)}`
          : "All required training complete",
      };
    }
  }

  const equipment = loadEquipmentState(driver?.id, vehicleReg);
  let equipmentCheck;
  if (!vehicleReg) {
    equipmentCheck = {
      label: "Waiting",
      tone: "warning",
      detail: "Confirm equipment after a vehicle is assigned",
    };
  } else if (equipment?.confirmedAt) {
    equipmentCheck = {
      label: "Confirmed",
      tone: "good",
      detail: `${vehicleReg} confirmed ${formatDisplayDate(equipment.confirmedAt.slice(0, 10)) || "today"}`,
    };
  } else {
    equipmentCheck = {
      label: "Review",
      tone: "warning",
      detail: `Confirm equipment for ${vehicleReg} before release`,
    };
  }

  const checks = [
    {
      id: "licence",
      label: "Driving licence",
      detail: licence.detail,
      status: { label: licence.label, tone: licence.tone },
      to: "/documents",
    },
    {
      id: "account",
      label: "Account status",
      detail: `Command access: ${accessStatus}`,
      status: {
        label: eligibilityAllowed ? "Allowed" : "Blocked",
        tone: eligibilityAllowed ? "good" : "blocked",
      },
      to: "/sync",
    },
    {
      id: "duty",
      label: "Published duty",
      detail: hasDuty
        ? duty?.runName || duty?.label || duty?.routeName
          ? `${duty.runName || duty.label || duty.routeName}${vehicleReg ? ` · ${vehicleReg}` : ""}`
          : `Duty available${vehicleReg ? ` · ${vehicleReg}` : ""}`
        : "No duty published today",
      status: { label: hasDuty ? "Assigned" : "None", tone: hasDuty ? "good" : "warning" },
      to: "/jobs",
    },
    {
      id: "medical",
      label: "Medical / fitness",
      detail: medical.detail,
      status: { label: medical.label, tone: medical.tone },
      to: "/documents",
    },
    {
      id: "training",
      label: "Training",
      detail: training.detail,
      status: { label: training.label, tone: training.tone },
      to: "/training",
    },
    {
      id: "working_time",
      label: "Working time",
      detail: signedOn
        ? `Signed on${signOnAt ? ` · ${new Date(signOnAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}`
        : "Sign on from My duty — Admin sees the same duty",
      status: {
        label: signedOn ? "On duty" : "Sign on",
        tone: signedOn ? "good" : "warning",
      },
      to: "/duty",
    },
    {
      id: "walkaround",
      label: "Vehicle walkaround",
      detail: vehicleReg
        ? checkComplete
          ? `${vehicleReg} checked today`
          : checkFailed
            ? `${vehicleReg} failed — report defects and recheck`
            : `Vehicle ${vehicleReg} — complete before release`
        : "Complete after a vehicle is assigned",
      status: {
        label: checkComplete ? "Complete" : checkFailed ? "Failed" : vehicleReg ? "Required" : "Waiting",
        tone: checkComplete ? "good" : checkFailed ? "blocked" : "warning",
      },
      to: "/check",
    },
    {
      id: "equipment",
      label: "Driver equipment",
      detail: equipmentCheck.detail,
      status: { label: equipmentCheck.label, tone: equipmentCheck.tone },
      to: "/vehicle/equipment",
    },
  ];

  const blockers = checks.filter((c) => c.status.tone === "blocked");
  const warnings = checks.filter((c) => c.status.tone === "warning");

  let overallBand = "ready";
  let overallTitle = "Ready for duty";
  let overallDetail = "Command shows no blockers for this account.";

  if (!eligibilityAllowed || blockers.length > 0) {
    overallBand = "blocked";
    overallTitle = "Not cleared for dispatch";
    overallDetail = blockers[0]?.detail || "Resolve the items marked blocked before release.";
  } else if (!hasDuty) {
    overallBand = "conditional";
    overallTitle = "Conditionally ready";
    overallDetail = "Waiting for dispatch to publish a duty to this account.";
  } else if (!checkComplete || warnings.some((w) => ["training", "walkaround", "equipment"].includes(w.id))) {
    overallBand = "conditional";
    overallTitle = "Conditionally ready";
    if (!checkComplete) {
      overallDetail = "Acknowledge your published duty, then complete the vehicle walkaround.";
    } else if (warnings.find((w) => w.id === "training")) {
      overallDetail = warnings.find((w) => w.id === "training").detail;
    } else {
      overallDetail = "Duty published — finish remaining readiness items before release.";
    }
  } else if (checkComplete && hasDuty) {
    overallBand = "ready";
    overallTitle = "Ready for duty";
    overallDetail = "Duty published and today’s walkaround is complete.";
  }

  return {
    asOf: todayIso(),
    asOfLabel: new Date().toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    overallBand,
    overallTitle,
    overallDetail,
    eligibilityAllowed,
    checks,
    trainingSummary: trainingResult?.ok ? trainingResult.summary : null,
    documentCount: documents.length,
    synced: Boolean(docsResult?.ok || trainingResult?.ok || bootstrap),
  };
}
