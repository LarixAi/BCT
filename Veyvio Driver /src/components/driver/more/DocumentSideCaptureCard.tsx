import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera, CheckCircle2, FileUp, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DocumentFilePicker } from "@/components/driver/more/DocumentFilePicker";
import { driverCopy } from "@/copy/driver-messages";
import type { DocumentSideDefinition } from "@/domain/more/document-catalog";
import {
  DOCUMENT_CAMERA_ACCEPT,
  DOCUMENT_UPLOAD_ACCEPT,
  isImageUpload,
  validateDocumentUpload,
} from "@/domain/more/document-upload";
import { isDocumentPickerCancelled, pickDocumentPhoto } from "@/platform/documents/pick-document-file";
import type { ComplianceDocument, DocumentSideCapture, DocumentSideId } from "@/types/more";
import { useMoreStore } from "@/store/more";
import { cn } from "@/lib/utils";
import { documentSideStatusLabel } from "@/domain/more/more-helpers";

export function DocumentSideCaptureCard({
  document,
  side,
  definition,
}: {
  document: ComplianceDocument;
  side: DocumentSideCapture;
  definition: DocumentSideDefinition;
}) {
  const submitDocumentSideUpload = useMoreStore((s) => s.submitDocumentSideUpload);
  const isNative = Capacitor.isNativePlatform();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [openingCamera, setOpeningCamera] = useState(false);
  const [replacing, setReplacing] = useState(false);

  const isUploading = side.status === "uploading" || submitting || openingCamera;
  const isComplete = side.status === "approved" || side.status === "pending_review";
  const showCapture = replacing || (!isComplete && !selectedFile);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function resetSelection() {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }

  function handleFilePicked(file: File) {
    const validation = validateDocumentUpload(file);
    if (!validation.ok) {
      resetSelection();
      toast.error(validation.reason);
      return;
    }

    resetSelection();
    setSelectedFile(file);
    setPreviewUrl(isImageUpload(file) ? URL.createObjectURL(file) : null);
  }

  async function handlePhotographPress(sideId: DocumentSideId) {
    setOpeningCamera(true);
    try {
      const file = await pickDocumentPhoto();
      if (file) handleFilePicked(file);
    } catch (pickerError) {
      if (!isDocumentPickerCancelled(pickerError)) {
        toast.error(
          pickerError instanceof Error ? pickerError.message : driverCopy.documents.uploadFailed,
        );
      }
    } finally {
      setOpeningCamera(false);
    }
  }

  async function handleSubmit() {
    if (!selectedFile || isUploading) return;

    setSubmitting(true);
    const result = await submitDocumentSideUpload(
      document.id,
      side.sideId,
      { name: selectedFile.name, type: selectedFile.type, size: selectedFile.size },
      selectedFile,
    );
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.reason);
      return;
    }

    resetSelection();
    setReplacing(false);
    toast.success(driverCopy.documents.sideSubmitted(definition.label), {
      description: driverCopy.documents.sideSubmittedHint(document.name, definition.label),
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{definition.label}</p>
          <p className="mt-0.5 text-xs text-muted">{definition.hint}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            side.status === "approved" && "bg-ok/10 text-ok",
            side.status === "pending_review" && "bg-link/10 text-link",
            side.status === "uploading" && "bg-secondary text-muted",
            side.status === "rejected" && "bg-vor/10 text-vor",
            side.status === "missing" && "bg-warn/10 text-warn",
          )}
        >
          {documentSideStatusLabel(side.status)}
        </span>
      </div>

      {side.status === "uploading" && (
        <div className="flex items-center gap-2 px-4 py-3 text-sm">
          <Loader2 className="size-4 animate-spin text-link" aria-hidden />
          <span>{driverCopy.documents.uploading}</span>
        </div>
      )}

      {isComplete && !replacing && !selectedFile && (
        <div className="space-y-3 px-4 py-3">
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium">
                {side.status === "approved"
                  ? driverCopy.documents.sideOnFile(definition.label)
                  : driverCopy.documents.sideAwaitingReview(definition.label)}
              </p>
              {side.fileName && <p className="mt-0.5 truncate text-xs text-muted">{side.fileName}</p>}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => setReplacing(true)}
          >
            <RotateCcw className="size-4" />
            {driverCopy.documents.replaceSide(definition.label)}
          </Button>
        </div>
      )}

      {selectedFile && (
        <div className="space-y-3 px-4 py-3">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={driverCopy.documents.previewAlt(selectedFile.name)}
              className="max-h-48 w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-border px-3 py-4">
              <FileUp className="size-5 text-muted" aria-hidden />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{selectedFile.name}</p>
                <p className="text-xs text-muted">Ready to submit</p>
              </div>
            </div>
          )}
          <Button className="h-12 w-full" onClick={handleSubmit} disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {driverCopy.documents.submitting}
              </>
            ) : (
              driverCopy.documents.submitSide(definition.label)
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full"
            onClick={() => {
              resetSelection();
              setReplacing(false);
            }}
            disabled={isUploading}
          >
            {driverCopy.documents.chooseDifferent}
          </Button>
        </div>
      )}

      {showCapture && side.status !== "uploading" && (
        <div className="space-y-2 px-4 py-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {isNative ? (
              <Button
                type="button"
                className="h-12 w-full"
                disabled={isUploading}
                onClick={() => handlePhotographPress(side.sideId)}
              >
                <Camera className="size-4" />
                {definition.photographLabel}
              </Button>
            ) : (
              <DocumentFilePicker
                accept={DOCUMENT_CAMERA_ACCEPT}
                capture
                disabled={isUploading}
                onFile={handleFilePicked}
                className="bg-primary text-primary-foreground shadow hover:bg-primary/90"
              >
                <Camera className="size-4" />
                {definition.photographLabel}
              </DocumentFilePicker>
            )}
            <DocumentFilePicker
              accept={DOCUMENT_UPLOAD_ACCEPT}
              disabled={isUploading}
              onFile={handleFilePicked}
              className="border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground"
            >
              <FileUp className="size-4" />
              {driverCopy.documents.uploadFile}
            </DocumentFilePicker>
          </div>
        </div>
      )}
    </section>
  );
}
