import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ClipboardCheck, FileText, Radio, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import DriverSectionTitle from "@/components/driver/operational/DriverSectionTitle";
import DriverStatusBanner from "@/components/driver/operational/DriverStatusBanner";
import { SettingsField } from "@/components/driver/settings/settings-shared";
import { op } from "@/lib/driver-operational-theme";
import {
  PHV_VEHICLE_DOC_OPTIONS,
  evaluatePcoDispatchReadiness,
  evaluatePcoSubmissionReadiness,
  loadDriverPhvCredentials,
  loadDriverPhvVehicle,
  loadPhvVehicleDocuments,
  loadPcoComplianceStatus,
  saveDriverPcoBadge,
  submitPcoComplianceForReview,
  uploadPhvVehicleDocument,
  upsertDriverPhvVehicle,
} from "@/services/driver-phv.service";
import { WORK_MODE } from "@/lib/driver-work-modes";

const EMPTY_VEHICLE = {
  registration: "",
  make: "",
  model: "",
  colour: "",
  phvVehicleLicenceNumber: "",
  phvVehicleLicenceExpiry: "",
  seats: "4",
};

function FeedbackMessage({ message }) {
  if (!message) return null;
  const isError =
    /could not|failed|denied|error|permission|required|complete all/i.test(message) &&
    !/saved|uploaded|submitted for compliance/i.test(message);
  return (
    <p className={`text-sm ${isError ? "text-red-600" : "text-muted-foreground"}`} role={isError ? "alert" : undefined}>
      {message}
    </p>
  );
}

export default function DriverPcoDocumentsTab({ driver }) {
  const mode = WORK_MODE.pco;
  const [loading, setLoading] = useState(true);
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE);
  const [vehicleId, setVehicleId] = useState(null);
  const [pcoNumber, setPcoNumber] = useState("");
  const [pcoExpiry, setPcoExpiry] = useState("");
  const [phvEnabled, setPhvEnabled] = useState(false);
  const [complianceStatus, setComplianceStatus] = useState(null);
  const [submissionReadiness, setSubmissionReadiness] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [savingBadge, setSavingBadge] = useState(false);
  const [badgeMsg, setBadgeMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [vehicleMsg, setVehicleMsg] = useState("");
  const [uploadType, setUploadType] = useState(PHV_VEHICLE_DOC_OPTIONS[0]?.value ?? "phv_licence");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [vehicle, credentials, ready, compliance] = await Promise.all([
        loadDriverPhvVehicle(driver.id),
        loadDriverPhvCredentials(driver.id),
        evaluatePcoDispatchReadiness(driver),
        loadPcoComplianceStatus().catch(() => null),
      ]);

      setPcoNumber(compliance?.pco_number ?? credentials.pcoNumber ?? "");
      setPcoExpiry(
        compliance?.pco_expiry?.slice?.(0, 10) ?? credentials.driver?.phv_driver_licence_expiry?.slice?.(0, 10) ?? "",
      );
      setPhvEnabled(Boolean(credentials.driver?.can_do_private_hire));
      setComplianceStatus(compliance);
      setSubmissionReadiness(compliance ? await evaluatePcoSubmissionReadiness(compliance) : null);
      setReadiness(ready);

      if (vehicle) {
        setVehicleId(vehicle.id);
        setVehicleForm({
          registration: vehicle.registration ?? "",
          make: vehicle.make ?? "",
          model: vehicle.model ?? "",
          colour: vehicle.vehicle_colour ?? "",
          phvVehicleLicenceNumber: vehicle.phv_vehicle_licence_number ?? "",
          phvVehicleLicenceExpiry: vehicle.phv_vehicle_licence_expiry?.slice?.(0, 10) ?? "",
          seats: String(vehicle.seats ?? 4),
        });
        const docs = await loadPhvVehicleDocuments(vehicle.id);
        setDocuments(docs);
      } else {
        setVehicleId(null);
        setDocuments([]);
      }
    } finally {
      setLoading(false);
    }
  }, [driver]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveBadge = async () => {
    setSavingBadge(true);
    setBadgeMsg("");
    try {
      await saveDriverPcoBadge({ pcoNumber, pcoExpiry });
      setBadgeMsg("PCO badge saved.");
      await reload();
    } catch (e) {
      setBadgeMsg(e instanceof Error ? e.message : "Could not save PCO badge");
    } finally {
      setSavingBadge(false);
    }
  };

  const submitForReview = async () => {
    setSubmitting(true);
    setSubmitMsg("");
    try {
      const result = await submitPcoComplianceForReview();
      setSubmitMsg(result.message ?? "Submitted for compliance review.");
      await reload();
    } catch (e) {
      setSubmitMsg(e instanceof Error ? e.message : "Could not submit for review");
    } finally {
      setSubmitting(false);
    }
  };

  const saveVehicle = async () => {
    setSavingVehicle(true);
    setVehicleMsg("");
    try {
      const result = await upsertDriverPhvVehicle(driver, vehicleForm);
      setVehicleId(result.vehicle_id);
      setVehicleMsg("Vehicle saved — you can now upload PHV documents.");
      await reload();
    } catch (e) {
      setVehicleMsg(e instanceof Error ? e.message : "Could not save vehicle");
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !vehicleId) return;
    setUploading(true);
    setUploadMsg("");
    try {
      await uploadPhvVehicleDocument(driver, vehicleId, {
        documentType: uploadType,
        file: uploadFile,
      });
      setUploadFile(null);
      setUploadMsg("Document uploaded — pending compliance review.");
      await reload();
    } catch (e) {
      setUploadMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading && !readiness) {
    return <DriverPageLoader label="Loading PCO details…" />;
  }

  const submission = submissionReadiness?.submission;

  return (
    <div className="space-y-6">
      <div className={`p-4 ${op.card}`}>
        <div className="flex items-center gap-2">
          <Radio className={`w-5 h-5 ${op.iconTeal}`} />
          <h2 className="text-[15px] font-semibold text-foreground">{mode.label}</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mt-2">{mode.description}</p>
      </div>

      {submissionReadiness?.approved ? (
        <DriverStatusBanner variant="success" title="PCO package approved">
          Compliance has approved your PCO badge, vehicle and documents. Complete today&apos;s vehicle check to go
          online.
        </DriverStatusBanner>
      ) : submissionReadiness?.awaitingReview ? (
        <DriverStatusBanner variant="info" title="Awaiting compliance review">
          Submitted {submission?.submitted_at ? new Date(submission.submitted_at).toLocaleString("en-GB") : ""}. Your
          operator will review your PCO badge, vehicle and documents.
        </DriverStatusBanner>
      ) : submissionReadiness?.rejected ? (
        <DriverStatusBanner variant="warning" title="Changes requested">
          {submission?.reviewer_notes ?? "Update your details and documents, then submit again for review."}
        </DriverStatusBanner>
      ) : readiness?.ready ? (
        <DriverStatusBanner variant="success" title="Ready for PCO trips">
          Your PCO badge, vehicle documents and today&apos;s vehicle check are complete.
        </DriverStatusBanner>
      ) : readiness?.blockers?.length ? (
        <DriverStatusBanner variant="warning" title="Complete these steps for PCO trips">
          <ul className="space-y-1 mt-1">
            {readiness.blockers.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </DriverStatusBanner>
      ) : null}

      <section>
        <DriverSectionTitle>Driver PCO badge</DriverSectionTitle>
        <div className={`p-4 space-y-3 ${op.card}`}>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your TfL PCO driver badge must be valid before you can accept on-demand private hire trips.
          </p>
          <SettingsField label="PCO badge number">
            <input
              className={`w-full rounded-xl px-4 py-3 text-sm font-mono ${op.input}`}
              value={pcoNumber}
              onChange={(e) => setPcoNumber(e.target.value.toUpperCase())}
              placeholder="PCO-123456"
              disabled={!phvEnabled}
            />
          </SettingsField>
          <SettingsField label="PCO badge expiry">
            <input
              type="date"
              className={`w-full rounded-xl px-4 py-3 text-sm ${op.input}`}
              value={pcoExpiry}
              onChange={(e) => setPcoExpiry(e.target.value)}
              disabled={!phvEnabled}
            />
          </SettingsField>
          <p className="text-xs text-muted-foreground">
            PCO private hire:{" "}
            <span className="font-medium text-foreground">
              {phvEnabled ? "Enabled" : "Not enabled — contact operator"}
            </span>
          </p>
          <Button
            className={`w-full h-11 ${op.primaryBtn}`}
            disabled={!phvEnabled || savingBadge || !pcoNumber.trim()}
            onClick={() => void saveBadge()}
          >
            {savingBadge ? "Saving…" : "Save PCO badge"}
          </Button>
          <FeedbackMessage message={badgeMsg} />
          <Link to="/documents" className={`text-xs font-semibold ${op.tealAccent}`}>
            Upload your PCO badge document →
          </Link>
        </div>
      </section>

      <section>
        <DriverSectionTitle>Your PCO vehicle</DriverSectionTitle>
        <div className={`p-4 space-y-3 ${op.card}`}>
          <p className="text-xs text-muted-foreground leading-relaxed">
            PCO trips use your own TfL-licensed private hire vehicle — not operator fleet vehicles used for school and
            airport routes.
          </p>
          <SettingsField label="Registration">
            <input
              className={`w-full rounded-xl px-4 py-3 text-sm ${op.input}`}
              value={vehicleForm.registration}
              onChange={(e) => setVehicleForm((p) => ({ ...p, registration: e.target.value.toUpperCase() }))}
              placeholder="AB12 CDE"
            />
          </SettingsField>
          <div className="grid grid-cols-2 gap-3">
            <SettingsField label="Make">
              <input
                className={`w-full rounded-xl px-4 py-3 text-sm ${op.input}`}
                value={vehicleForm.make}
                onChange={(e) => setVehicleForm((p) => ({ ...p, make: e.target.value }))}
                placeholder="Mercedes-Benz"
              />
            </SettingsField>
            <SettingsField label="Model">
              <input
                className={`w-full rounded-xl px-4 py-3 text-sm ${op.input}`}
                value={vehicleForm.model}
                onChange={(e) => setVehicleForm((p) => ({ ...p, model: e.target.value }))}
                placeholder="EQA"
              />
            </SettingsField>
          </div>
          <SettingsField label="Colour">
            <input
              className={`w-full rounded-xl px-4 py-3 text-sm ${op.input}`}
              value={vehicleForm.colour}
              onChange={(e) => setVehicleForm((p) => ({ ...p, colour: e.target.value }))}
              placeholder="Black"
            />
          </SettingsField>
          <SettingsField label="PHV vehicle licence no.">
            <input
              className={`w-full rounded-xl px-4 py-3 text-sm font-mono ${op.input}`}
              value={vehicleForm.phvVehicleLicenceNumber}
              onChange={(e) => setVehicleForm((p) => ({ ...p, phvVehicleLicenceNumber: e.target.value }))}
              placeholder="VL-123456"
            />
          </SettingsField>
          <SettingsField label="PHV licence expiry">
            <input
              type="date"
              className={`w-full rounded-xl px-4 py-3 text-sm ${op.input}`}
              value={vehicleForm.phvVehicleLicenceExpiry}
              onChange={(e) => setVehicleForm((p) => ({ ...p, phvVehicleLicenceExpiry: e.target.value }))}
            />
          </SettingsField>
          <Button className={`w-full h-11 ${op.primaryBtn}`} disabled={savingVehicle} onClick={() => void saveVehicle()}>
            {savingVehicle ? "Saving…" : vehicleId ? "Update vehicle" : "Register vehicle"}
          </Button>
          <FeedbackMessage message={vehicleMsg} />
        </div>
      </section>

      <section>
        <DriverSectionTitle>Vehicle documents</DriverSectionTitle>
        {documents.length > 0 ? (
          <div className={`${op.listCard} mb-3`}>
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-b-0 bg-card">
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize text-foreground">{doc.document_type?.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{doc.status}</p>
                </div>
                {doc.status === "approved" || doc.status === "valid" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-3 px-1">No vehicle documents uploaded yet.</p>
        )}

        {!vehicleId ? (
          <div className={`p-4 ${op.cardMuted}`}>
            <p className="text-xs text-muted-foreground">Save your vehicle details above before uploading documents.</p>
          </div>
        ) : (
          <div className={`p-4 space-y-3 ${op.card}`}>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Upload className="w-4 h-4" />
              Upload document
            </div>
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
              className={`w-full rounded-xl px-4 py-3 text-sm ${op.input}`}
            >
              {PHV_VEHICLE_DOC_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {PHV_VEHICLE_DOC_OPTIONS.find((o) => o.value === uploadType)?.description}
            </p>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-foreground"
            />
            <FeedbackMessage message={uploadMsg} />
            <Button
              className={`w-full h-11 ${op.primaryBtn}`}
              disabled={!uploadFile || uploading}
              onClick={() => void handleUpload()}
            >
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        )}
      </section>

      <section>
        <DriverSectionTitle>Submit for review</DriverSectionTitle>
        <div className={`p-4 space-y-3 ${op.card}`}>
          <p className="text-xs text-muted-foreground leading-relaxed">
            When your PCO badge, vehicle details and documents are complete, submit everything to your operator for
            approval. You cannot receive PCO trip offers until compliance approves your package.
          </p>
          {complianceStatus?.missing_items?.length > 0 && !submissionReadiness?.awaitingReview ? (
            <ul className="text-xs text-muted-foreground space-y-1">
              {complianceStatus.missing_items.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          ) : null}
          <Button
            className={`w-full h-11 ${op.primaryBtn}`}
            disabled={
              submitting ||
              !submissionReadiness?.canSubmit ||
              submissionReadiness?.awaitingReview ||
              submissionReadiness?.approved
            }
            onClick={() => void submitForReview()}
          >
            {submitting
              ? "Submitting…"
              : submissionReadiness?.awaitingReview
                ? "Awaiting review"
                : submissionReadiness?.approved
                  ? "Already approved"
                  : "Submit PCO package for review"}
          </Button>
          <FeedbackMessage message={submitMsg} />
        </div>
      </section>

      <section>
        <DriverSectionTitle>Go online</DriverSectionTitle>
        <div className={`p-4 space-y-3 ${op.card}`}>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Complete a daily walkaround on your PCO vehicle, then sign on to receive short private hire trip offers.
          </p>
          <div className="grid gap-2">
            <Link
              to={mode.checkPath}
              className={`flex items-center justify-center gap-2 h-11 rounded-full font-semibold text-sm ${op.primaryBtn}`}
            >
              <ClipboardCheck className="w-4 h-4" />
              {readiness?.checkDone ? "PCO vehicle check done today" : mode.checkLabel}
            </Link>
            <Link
              to={mode.onlinePath}
              className={`flex items-center justify-center gap-2 h-11 rounded-full font-semibold text-sm border border-border bg-card text-foreground ${
                readiness?.ready ? "" : "opacity-60 pointer-events-none"
              }`}
              aria-disabled={!readiness?.ready}
            >
              <Radio className="w-4 h-4" />
              {mode.onlineLabel}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
