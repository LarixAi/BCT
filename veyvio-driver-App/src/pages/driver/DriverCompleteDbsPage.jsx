import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DocumentUploadCard from "@/components/driver/onboarding/DocumentUploadCard";
import { OnboardingFormField } from "@/components/driver/onboarding/OnboardingFormField";
import DriverPageContainer from "@/components/driver/operational/DriverPageContainer";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import { op } from "@/lib/driver-operational-theme";
import { getDriverOnboardingPrefill, updateDbsDetailsForComplianceGap } from "@/services/onboarding.service";
import { ON_FILE_DOC_STATUSES, uploadDriverDocument as uploadDriverDocumentRaw } from "@/services/driver-documents.service";
import { friendlyOnboardingError } from "@/lib/onboarding-errors";
import { OnboardingUploadError } from "@/lib/onboarding-upload-error";

export default function DriverCompleteDbsPage({ driver, organisationId, onComplete }) {
  const navigate = useNavigate();
  const [dbsExpiry, setDbsExpiry] = useState("");
  const [existingDoc, setExistingDoc] = useState(null);
  const [uploadDoc, setUploadDoc] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadError, setUploadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    void getDriverOnboardingPrefill(driver.id)
      .then((prefill) => {
        setDbsExpiry(prefill.form?.dbsExpiry ?? "");
        const dbsDoc =
          prefill.documentsByType?.dbs ??
          prefill.documentsByType?.dbs_safeguarding ??
          prefill.documentsByType?.safeguarding ??
          null;
        setExistingDoc(dbsDoc && ON_FILE_DOC_STATUSES.has(dbsDoc.status) ? dbsDoc : null);
      })
      .finally(() => setLoading(false));
  }, [driver.id]);

  async function handleUpload(file) {
    setUploadStatus("uploading");
    setUploadError(null);
    try {
      const doc = await uploadDriverDocumentRaw(driver, {
        file,
        documentType: "dbs",
      });
      setUploadDoc(doc);
      setUploadStatus("success");
    } catch (err) {
      setUploadStatus("error");
      const context =
        err instanceof OnboardingUploadError && err.storageUploaded ? "upload-metadata" : "upload";
      setUploadError(
        err instanceof OnboardingUploadError ? err.message : friendlyOnboardingError(err, context),
      );
    }
  }

  async function handleSave() {
    if (!dbsExpiry.trim()) {
      setError("Please enter your DBS certificate expiry date.");
      return;
    }
    if (!existingDoc && !uploadDoc) {
      setError("Please upload your DBS certificate.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await updateDbsDetailsForComplianceGap(driver.id, organisationId, {
        dbsExpiry,
        skipDocumentCheck: Boolean(existingDoc || uploadDoc),
      });
      await onComplete?.();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save DBS details");
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className={`min-h-[50vh] ${op.pageBg} flex items-center justify-center`}>
        <DriverPageLoader label="Loading…" />
      </div>
    );
  }

  const docForCard = uploadDoc ?? existingDoc;

  return (
    <DriverPageContainer>
      <div className={`${op.card} p-5 space-y-4`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compliance</p>
          <h1 className="text-xl font-bold text-foreground mt-1">DBS certificate required</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Your profile is approved for school transport work, but your DBS expiry date is missing. Add it here to
            unlock jobs, vehicle checks, and messages.
          </p>
        </div>

        <OnboardingFormField
          label="DBS certificate expiry"
          type="date"
          value={dbsExpiry}
          onChange={setDbsExpiry}
        />

        <DocumentUploadCard
          label="DBS certificate"
          document={docForCard}
          onFile={handleUpload}
          status={uploadStatus}
          error={uploadError}
          onRetry={() => setUploadStatus("idle")}
          readOnly={false}
        />

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button className={op.primaryBtn} onClick={() => void handleSave()} disabled={pending}>
            {pending ? "Saving…" : "Save and continue"}
          </Button>
          <Button asChild variant="secondary">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </DriverPageContainer>
  );
}
