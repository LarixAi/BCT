import { AlertTriangle, BadgeCheck, Bus, ClipboardCheck, FileBadge, GraduationCap, HeartPulse, ShieldCheck, Timer } from "lucide-react";
import { OperationalPage, InfoRow, DriverSectionTitle } from "./DriverOperationalPageParts";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";

export default function DriverReadiness({ driver }) {
  const { bootstrap, homeSummary } = useDriverSupabaseAuth();
  const accessStatus = bootstrap?.identity?.accessStatus || "active";
  const eligibilityAllowed = bootstrap?.eligibility?.allowed !== false;
  const hasDuty = (bootstrap?.duties?.length ?? 0) > 0;
  const vehicleReg =
    bootstrap?.duties?.[0]?.vehicle?.registrationNumber ||
    homeSummary?.vehicleAssignment?.registration ||
    null;

  const checkStatus = String(
    bootstrap?.duties?.[0]?.vehicleCheck?.status ?? homeSummary?.vehicleAssignment?.checkStatus ?? "",
  );
  const checkComplete = checkStatus === "complete" || checkStatus === "passed";
  const checkFailed = checkStatus === "failed";

  const items = [
    [FileBadge, "Driving licence", driver?.licenceExpiry ? `Expires ${driver.licenceExpiry}` : "On file with your operator", { label: "On file", tone: "good" }, "/documents"],
    [ShieldCheck, "Account status", `Command access: ${accessStatus}`, { label: eligibilityAllowed ? "Allowed" : "Blocked", tone: eligibilityAllowed ? "good" : "blocked" }, "/sync"],
    [BadgeCheck, "Published duty", hasDuty ? "Duty available in Trips" : "No duty published today", { label: hasDuty ? "Assigned" : "None", tone: hasDuty ? "good" : "warning" }, "/jobs"],
    [HeartPulse, "Medical / fitness", "Managed by your transport team in Command", { label: "Operator", tone: "neutral" }, "/documents"],
    [GraduationCap, "Training", "Training modules are not on Command yet", { label: "Pending API", tone: "warning" }, "/training"],
    [
      Timer,
      "Working time",
      homeSummary?.duty?.signOnAt || bootstrap?.duties?.[0]?.actualSignOnAt
        ? "Signed on in Command"
        : "Sign on from My duty — Admin sees the same duty",
      {
        label: homeSummary?.duty?.signOnAt || bootstrap?.duties?.[0]?.actualSignOnAt ? "On duty" : "Sign on",
        tone: homeSummary?.duty?.signOnAt || bootstrap?.duties?.[0]?.actualSignOnAt ? "good" : "warning",
      },
      "/duty",
    ],
    [
      ClipboardCheck,
      "Vehicle walkaround",
      vehicleReg
        ? checkComplete
          ? `${vehicleReg} checked today`
          : checkFailed
            ? `${vehicleReg} failed — report defects and recheck`
            : `Vehicle ${vehicleReg} — complete before release`
        : "Complete after a vehicle is assigned",
      {
        label: checkComplete ? "Complete" : checkFailed ? "Failed" : vehicleReg ? "Required" : "Waiting",
        tone: checkComplete ? "good" : checkFailed ? "blocked" : "warning",
      },
      "/check",
    ],
    [Bus, "Driver equipment", "Confirm equipment before release", { label: "Review", tone: "good" }, "/vehicle/equipment"],
  ];

  return (
    <OperationalPage title="Driver readiness" subtitle="What Command knows about your eligibility to work.">
      <CommandBackendNotice
        status="partial"
        title={eligibilityAllowed ? "Account can operate" : "Account blocked"}
        description="Vehicle checks, documents, duty sign-on and ops messages sync to Command. Full weekly WTD segments are still partial."
      />
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-100 p-2.5">
            <ShieldCheck className="h-6 w-6 text-emerald-700" />
          </div>
          <div>
            <p className="font-semibold text-emerald-900">
              {eligibilityAllowed ? "Conditionally ready" : "Not cleared for dispatch"}
            </p>
            <p className="mt-1 text-sm text-emerald-800">
              {hasDuty
                ? checkComplete
                  ? "Duty published and today’s walkaround is complete."
                  : "Acknowledge your published duty in Trips, then complete the vehicle walkaround."
                : "Waiting for dispatch to publish a duty to this account."}
            </p>
          </div>
        </div>
      </div>
      <DriverSectionTitle>Readiness checks</DriverSectionTitle>
      <div className={op.listCard}>
        {items.map(([I, l, d, s, t]) => (
          <InfoRow key={l} icon={I} label={l} detail={d} status={s} to={t} />
        ))}
      </div>
      <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <p className="text-sm leading-relaxed text-amber-900">
          Admin release decisions use Command account status, published duties, and today’s vehicle checks. A new expiry or open safety defect can block release.
        </p>
      </div>
    </OperationalPage>
  );
}
