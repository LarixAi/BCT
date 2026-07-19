import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Upload } from "lucide-react";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { op } from "@/lib/driver-operational-theme";
import { loadDriverDocuments, uploadDriverDocument } from "@/services/driver-documents.service";

const UPLOAD_TYPES = [
  { value: "driving_licence", label: "Driving licence" },
  { value: "phv_licence", label: "PCO licence (TfL PHV badge)" },
  { value: "dqc", label: "DQC / CPC" },
  { value: "dbs", label: "DBS certificate" },
  { value: "right_to_work", label: "Right to work" },
  { value: "medical", label: "Medical certificate" },
  { value: "other", label: "Other" },
];

const DOC_TYPE_LABELS = Object.fromEntries(UPLOAD_TYPES.map((t) => [t.value, t.label]));

function documentTypeLabel(documentType) {
  return DOC_TYPE_LABELS[documentType] ?? String(documentType ?? "").replace(/_/g, " ");
}

function statusLabel(status) {
  return String(status ?? "pending").replace(/_/g, " ");
}

export default function DriverSupabaseDocuments({ driver }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [docType, setDocType] = useState("driving_licence");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
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

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadMsg("");
    try {
      await uploadDriverDocument(driver, { documentType: docType, file });
      setUploadMsg("Document uploaded — pending review.");
      setFile(null);
      await refresh();
    } catch (e) {
      setUploadMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <DriverOperationalHeader title="Documents" subtitle="Licences and compliance uploads" backTo="/more" />
      <div className="px-4 pb-8">
        <CommandBackendNotice
          status="partial"
          title="Documents sync to Command for review"
          description="Submissions appear in Admin for verification. File binary storage is metadata-first for now — your operator still confirms the evidence."
        />
        {loading ? <DriverPageLoader label="Loading documents…" /> : null}
        {error ? <p className="mt-6 text-red-600 text-sm">{error}</p> : null}

        <div className="mt-4 space-y-3">
          {documents.length === 0 && !loading ? (
            <p className="text-muted-foreground text-sm">No documents on file yet.</p>
          ) : null}
          {documents.map((doc) => (
            <div key={doc.id} className={`p-4 ${op.card} flex gap-3`}>
              <FileText className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate text-foreground">{doc.displayName}</p>
                <p className="text-xs text-muted-foreground">{documentTypeLabel(doc.document_type)}</p>
                <p className="text-xs text-muted-foreground mt-1 capitalize">{statusLabel(doc.status)}</p>
                {doc.expires_on ? (
                  <p className="text-xs text-amber-700 mt-1">Expires {doc.expires_on.slice(0, 10)}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className={`mt-6 p-4 space-y-3 ${op.card}`}>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Upload className="w-4 h-4" />
            Upload document
          </div>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className={`w-full rounded-xl px-4 py-3 text-sm ${op.input}`}>
            {UPLOAD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {docType === "phv_licence"
              ? "Upload a clear photo of your TfL PCO driver badge (PHV driver licence) — front and expiry visible."
              : "Upload a clear photo or PDF. Compliance will review before approval."}
          </p>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-foreground"
          />
          {uploadMsg ? <p className="text-sm text-muted-foreground">{uploadMsg}</p> : null}
          <Button onClick={() => void handleUpload()} disabled={!file || uploading} className={`w-full h-11 ${op.primaryBtn}`}>
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>
    </div>
  );
}
