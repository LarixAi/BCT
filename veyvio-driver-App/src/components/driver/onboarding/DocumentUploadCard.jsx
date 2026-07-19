import { CheckCircle2, Upload, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Single upload state at a time: idle | uploading | success | error
 * When error is set, success from a previous document is hidden until retry succeeds.
 */
export default function DocumentUploadCard({
  label,
  helper = "",
  document = null,
  status = "idle",
  error = null,
  onFile = undefined,
  onRetry = undefined,
  readOnly = false,
}) {
  const uploading = status === "uploading";
  const showSuccess = status === "success" || (status === "idle" && document && !error);
  const showError = status === "error" && error;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}

      {uploading ? (
        <div className="flex items-center gap-2 rounded-xl bg-muted/50 border border-border p-3 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
          <span>Uploading…</span>
        </div>
      ) : null}

      {!uploading && showSuccess ? (
        <div className="flex items-start gap-2 rounded-xl bg-[#8ec63f]/10 border border-[#8ec63f]/30 p-3 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#8ec63f]" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[#6fa82e]">Document uploaded</p>
            <p className="text-muted-foreground text-xs mt-0.5 truncate">
              {document.displayName ?? document.document_type?.replace(/_/g, " ")}
            </p>
          </div>
        </div>
      ) : null}

      {!readOnly && !uploading ? (
        <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-dashed border-[#1eaeae]/40 cursor-pointer hover:border-[#1eaeae] hover:bg-[#1eaeae]/5 active:bg-muted/50">
          <span className="text-sm text-foreground">
            {showSuccess && !showError ? "Replace document" : "Take photo / upload image"}
          </span>
          <Upload className="w-5 h-5 text-[#1eaeae] shrink-0" />
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile?.(file);
              e.target.value = "";
            }}
          />
        </label>
      ) : null}

      {showError ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 space-y-2">
          <p>{error}</p>
          {onRetry ? (
            <Button type="button" size="sm" variant="outline" className="border-red-300" onClick={onRetry}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Try again
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
