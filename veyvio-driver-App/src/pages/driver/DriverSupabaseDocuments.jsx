import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Upload } from "lucide-react";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { op } from "@/lib/driver-operational-theme";
import {
  CORE_COMPLIANCE_DOCUMENTS,
  buildCoreComplianceSlots,
  coreSlotStatusLabel,
  coreSlotStatusTone,
  definitionKeyForDocumentType,
  formatDocumentExpiry,
} from "@/lib/compliance-documents";
import { loadDriverDocuments, uploadDriverDocument } from "@/services/driver-documents.service";
import { listDocumentsViaCommand } from "@/services/command-driver-ops.service";

const STATUS_TONE_CLASS = {
  good: "bg-emerald-100 text-emerald-900",
  info: "bg-sky-100 text-sky-950",
  attention: "bg-amber-100 text-amber-950",
  critical: "bg-red-100 text-red-900",
  muted: "bg-slate-100 text-slate-700",
};

const CORE_LABELS = Object.fromEntries(CORE_COMPLIANCE_DOCUMENTS.map((d) => [d.type, d.label]));

function StatusBadge({ status }) {
  const tone = coreSlotStatusTone(status);
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE_CLASS[tone] ?? STATUS_TONE_CLASS.muted}`}
    >
      {coreSlotStatusLabel(status)}
    </span>
  );
}

function documentTypeLabel(documentType) {
  const key = definitionKeyForDocumentType(documentType);
  if (CORE_LABELS[key]) return CORE_LABELS[key];
  return String(documentType ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function verificationLabel(doc) {
  const status = String(doc.verificationStatus ?? doc.status ?? "").toLowerCase();
  if (status === "verified" || status === "approved" || status === "valid") return "Verified";
  if (status === "rejected") return "Declined";
  if (status === "expired") return "Expired";
  if (status === "expiring_soon") return "Expiring soon";
  return "Under review";
}

export default function DriverSupabaseDocuments({ driver }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wired, setWired] = useState(false);
  const [error, setError] = useState("");
  const [activeUploadKey, setActiveUploadKey] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  const coreSlots = useMemo(() => buildCoreComplianceSlots(documents), [documents]);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const command = await listDocumentsViaCommand();
      setWired(Boolean(command.ok));
      const rows = await loadDriverDocuments(driver.id);
      setDocuments(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [driver.id]);

  const handleUpload = async (definitionKey) => {
    if (!file) return;
    setUploading(true);
    setUploadMsg("");
    try {
      await uploadDriverDocument(driver, { documentType: definitionKey, file });
      setUploadMsg("Document uploaded — Command will review it.");
      setFile(null);
      setActiveUploadKey(null);
      await refresh();
    } catch (e) {
      setUploadMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const missingCount = coreSlots.filter((s) => s.status === "missing" || s.status === "rejected").length;
  const reviewCount = coreSlots.filter((s) => s.status === "under_review").length;

  return (
    <div>
      <DriverOperationalHeader
        title="Documents"
        subtitle="Required compliance evidence for Command"
        backTo="/more"
      />
      <div className="px-4 pb-8">
        <CommandBackendNotice
          status={wired ? "live" : "partial"}
          title={wired ? "Connected to Command" : "Command not connected"}
          description={
            wired
              ? "Uploads sync to Admin Compliance for verification — same six required documents."
              : "Sign in again so uploads reach your transport manager for review."
          }
        />

        {!loading && (missingCount > 0 || reviewCount > 0) ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {missingCount > 0
              ? `${missingCount} required document${missingCount === 1 ? "" : "s"} still need a clear photo.`
              : null}
            {missingCount > 0 && reviewCount > 0 ? " " : null}
            {reviewCount > 0
              ? `${reviewCount} awaiting operator review.`
              : null}
          </p>
        ) : null}

        {loading ? <DriverPageLoader label="Loading documents…" /> : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

        <section className="mt-5">
          <h2 className="text-sm font-semibold text-foreground">Required compliance documents</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            These six documents always appear — even before you upload. Matching Admin Compliance.
          </p>

          <ul className="mt-3 space-y-3">
            {coreSlots.map((slot) => {
              const uploadingThis = activeUploadKey === slot.definitionKey;
              const expiry = formatDocumentExpiry(slot.primary?.expires_on ?? slot.primary?.expiryDate);
              return (
                <li key={slot.definitionKey} className={`p-4 ${op.card}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{slot.label}</p>
                        <StatusBadge status={slot.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{slot.helper}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Expiry: <span className="font-medium text-foreground">{expiry}</span>
                        {slot.primary?.displayName ? (
                          <>
                            {" · "}
                            File:{" "}
                            <span className="font-medium text-foreground">{slot.primary.displayName}</span>
                          </>
                        ) : (
                          " · No file yet"
                        )}
                      </p>
                      {slot.primary?.rejection_reason || slot.primary?.rejectionReason ? (
                        <p className="mt-2 text-xs text-red-800">
                          {slot.primary.rejection_reason || slot.primary.rejectionReason}
                        </p>
                      ) : null}
                    </div>
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  </div>

                  {uploadingThis ? (
                    <div className="mt-3 space-y-2 border-t border-border pt-3">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-foreground"
                      />
                      {uploadMsg && activeUploadKey === slot.definitionKey ? (
                        <p className="text-sm text-muted-foreground">{uploadMsg}</p>
                      ) : null}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          disabled={!file || uploading}
                          className={`h-11 flex-1 ${op.primaryBtn}`}
                          onClick={() => void handleUpload(slot.definitionKey)}
                        >
                          {uploading ? "Uploading…" : "Submit for review"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11"
                          disabled={uploading}
                          onClick={() => {
                            setActiveUploadKey(null);
                            setFile(null);
                            setUploadMsg("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border text-sm font-semibold ${
                        slot.status === "verified" ? "text-muted-foreground" : op.tealAccent
                      }`}
                      onClick={() => {
                        setActiveUploadKey(slot.definitionKey);
                        setFile(null);
                        setUploadMsg("");
                      }}
                    >
                      <Upload className="h-4 w-4" />
                      {slot.status === "missing"
                        ? "Upload"
                        : slot.status === "rejected" || slot.status === "expired"
                          ? "Re-upload"
                          : slot.status === "verified"
                            ? "Replace file"
                            : "Update upload"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-foreground">All uploaded files</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Every submission Command can see — including front/back card photos.
          </p>

          {!loading && documents.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No files uploaded yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {documents.map((doc) => (
                <li key={doc.id} className={`flex gap-3 p-3 ${op.card}`}>
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {doc.displayName || documentTypeLabel(doc.document_type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {documentTypeLabel(doc.document_type)}
                      {doc.created_at
                        ? ` · ${formatDocumentExpiry(String(doc.created_at).slice(0, 10))}`
                        : ""}
                      {" · "}
                      {verificationLabel(doc)}
                    </p>
                    {doc.expires_on ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Expires {formatDocumentExpiry(doc.expires_on)}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
