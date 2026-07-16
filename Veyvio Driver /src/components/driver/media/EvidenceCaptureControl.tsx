import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera, FileUp, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { DocumentFilePicker } from "@/components/driver/more/DocumentFilePicker";
import {
  captureDevicePhoto,
  EVIDENCE_IMAGE_ACCEPT,
  isMediaCancelled,
  pickDeviceImage,
} from "@/platform/media/capture-photo";
import { cn } from "@/lib/utils";

/**
 * Shared evidence control: device camera, gallery/upload, preview.
 * Works on Capacitor (native Camera plugin) and web (file input + capture).
 */
export function EvidenceCaptureControl({
  label,
  capturedLabel = "Photo captured",
  value,
  onChange,
  className,
}: {
  label: string;
  capturedLabel?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  className?: string;
}) {
  const isNative = Capacitor.isNativePlatform();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"camera" | "upload" | null>(null);

  useEffect(() => {
    if (!value || !value.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  async function runCapture(kind: "camera" | "upload", fn: () => Promise<File | null>) {
    setBusy(kind);
    try {
      const file = await fn();
      if (file) onChange(file);
    } catch (error) {
      if (!isMediaCancelled(error)) {
        toast.error(error instanceof Error ? error.message : "Could not open the camera.");
      }
    } finally {
      setBusy(null);
    }
  }

  function handlePicked(file: File) {
    if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
      toast.error("Use a photo (JPG or PNG).");
      return;
    }
    onChange(file);
  }

  return (
    <div className={cn("space-y-2", className)}>
      {previewUrl ? (
        <div className="relative overflow-hidden rounded-[14px] border border-border bg-background">
          <img
            src={previewUrl}
            alt={capturedLabel}
            className="h-40 w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-[rgba(11,21,38,0.72)] px-3 py-2 text-white">
            <span className="text-xs font-bold">{capturedLabel}</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-[11px] font-bold"
              onClick={() => onChange(null)}
            >
              <RotateCcw className="size-3.5" />
              Retake
            </button>
          </div>
        </div>
      ) : (
        <div className="flex h-28 flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-border bg-background px-3 text-center">
          <Camera className="size-7 text-muted" />
          <span className="text-sm font-medium text-muted">{label}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {isNative ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void runCapture("camera", captureDevicePhoto)}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-white text-sm font-bold disabled:opacity-50"
          >
            {busy === "camera" ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            Take photo
          </button>
        ) : (
          <DocumentFilePicker
            accept={EVIDENCE_IMAGE_ACCEPT}
            capture
            disabled={busy !== null}
            className="min-h-12 rounded-xl border border-border bg-white font-bold"
            onFile={handlePicked}
          >
            <Camera className="size-4" />
            Take photo
          </DocumentFilePicker>
        )}

        {isNative ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void runCapture("upload", pickDeviceImage)}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-white text-sm font-bold disabled:opacity-50"
          >
            {busy === "upload" ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
            Upload
          </button>
        ) : (
          <DocumentFilePicker
            accept={EVIDENCE_IMAGE_ACCEPT}
            disabled={busy !== null}
            className="min-h-12 rounded-xl border border-border bg-white font-bold"
            onFile={handlePicked}
          >
            <FileUp className="size-4" />
            Upload
          </DocumentFilePicker>
        )}
      </div>
    </div>
  );
}
