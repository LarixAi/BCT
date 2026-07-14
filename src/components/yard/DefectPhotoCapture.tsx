import { Camera, ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface DefectPhotoCaptureProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  max?: number;
}

function captureVideoFrame(video: HTMLVideoElement): string | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function DefectPhotoCapture({ photos, onChange, max = 3 }: DefectPhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraReady(false);
    setCameraError(null);
    setCameraOpen(false);
  };

  useEffect(() => {
    if (!cameraOpen) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setCameraReady(false);
      return;
    }

    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera not available — use upload instead.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setCameraReady(true);
        setCameraError(null);
      } catch {
        setCameraError("Could not access camera. Check permissions or upload a photo.");
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [cameraOpen]);

  const addDataUrl = (dataUrl: string) => {
    onChange([...photos, dataUrl].slice(0, max));
  };

  const addPhotoFromFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") return;
      addDataUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const dataUrl = captureVideoFrame(video);
    if (!dataUrl) return;
    addDataUrl(dataUrl);
    stopCamera();
  };

  const remove = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Photographs</span>
        <span className="text-[10px] text-muted">{photos.length}/{max}</span>
      </div>

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((src, i) => (
            <div key={i} className="relative size-16 rounded-xs border border-border overflow-hidden">
              <img src={src} alt={`Defect photo ${i + 1}`} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-0.5 right-0.5 grid size-5 place-items-center rounded-full bg-black/60 text-white"
                aria-label="Remove photo"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {cameraOpen && (
        <div className="rounded-xs border border-border overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="w-full aspect-[4/3] object-cover"
            playsInline
            muted
            autoPlay
          />
          {!cameraReady && !cameraError && (
            <p className="p-3 text-xs text-white/80 text-center">Starting camera…</p>
          )}
          {cameraError && (
            <p className="p-3 text-xs text-vor bg-vor/10 text-center">{cameraError}</p>
          )}
          <div className="flex gap-2 p-2 bg-white border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={stopCamera}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1 text-xs bg-primary text-white"
              onClick={capturePhoto}
              disabled={!cameraReady}
            >
              <Camera className="size-3.5 mr-1" />
              Capture
            </Button>
          </div>
        </div>
      )}

      {photos.length < max && !cameraOpen && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 border border-primary bg-primary/5 rounded-xs p-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/10"
          >
            <Camera className="size-4 shrink-0" />
            Take photo
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 border border-border rounded-xs px-3 py-2 text-xs text-muted hover:border-accent hover:text-foreground"
            aria-label="Upload from library"
          >
            <ImagePlus className="size-4 shrink-0" />
            <span className="hidden sm:inline">Upload</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) addPhotoFromFile(file);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}
