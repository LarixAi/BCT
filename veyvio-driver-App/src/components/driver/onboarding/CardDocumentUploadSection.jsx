import DocumentUploadCard from "@/components/driver/onboarding/DocumentUploadCard";
import { useDriverOnboarding } from "@/contexts/DriverOnboardingContext";

export function useCardDocumentUpload(stepKey, uploadSpec) {
  const { documentsByType, handleUpload, getUploadState, clearUploadError, isEditable } =
    useDriverOnboarding();

  return uploadSpec.map((spec) => {
    const { status, error } = getUploadState(spec.documentType);
    return {
      ...spec,
      doc: documentsByType[spec.documentType] ?? null,
      onFile: (file) => handleUpload(spec.documentType, stepKey, file),
      status,
      error,
      onRetry: () => clearUploadError(spec.documentType),
      readOnly: !isEditable,
    };
  });
}

export function CardDocumentUploadSection({ uploads }) {
  return (
    <div className="space-y-4 pt-2 border-t border-border">
      <p className="text-sm font-semibold text-foreground">Upload photos</p>
      {uploads.map((upload) => (
        <DocumentUploadCard
          key={upload.documentType}
          label={upload.label}
          helper={upload.helper}
          document={upload.doc}
          onFile={upload.onFile}
          status={upload.status}
          error={upload.error}
          onRetry={upload.onRetry}
          readOnly={upload.readOnly}
        />
      ))}
    </div>
  );
}
