import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { isBarcodeDetectorSupported } from "@/domain/scan/scan-ref";
import { normalizeScanInput } from "@/domain/scan/normalize-scan-input";

interface QrScannerPanelProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

const SCAN_COOLDOWN_MS = 2_500;

export function QrScannerPanel({ onScan, onClose }: QrScannerPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onScanRef = useRef(onScan);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  onScanRef.current = onScan;

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let lastFrameAt = 0;

    function emitScan(raw: string) {
      const value = normalizeScanInput(raw);
      if (!value) return;
      const now = Date.now();
      const last = lastScanRef.current;
      if (last && last.value === value && now - last.at < SCAN_COOLDOWN_MS) return;
      lastScanRef.current = { value, at: now };
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      onScanRef.current(value);
    }

    function decodeWithJsQr(video: HTMLVideoElement): string | null {
      if (video.videoWidth <= 0 || video.videoHeight <= 0) return null;
      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(image.data, image.width, image.height, {
        inversionAttempts: "attemptBoth",
      });
      return result?.data ?? null;
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera access is not available in this browser. Use manual entry below.");
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
        setActive(true);

        const useNative = isBarcodeDetectorSupported();
        const detector = useNative ? new window.BarcodeDetector!({ formats: ["qr_code"] }) : null;

        const tick = async (now: number) => {
          if (cancelled || !videoRef.current) return;
          const videoEl = videoRef.current;
          if (videoEl.readyState < 2) {
            raf = requestAnimationFrame(tick);
            return;
          }

          if (now - lastFrameAt >= 180) {
            lastFrameAt = now;
            try {
              if (detector) {
                const codes = await detector.detect(videoEl);
                const value = codes[0]?.rawValue;
                if (value) {
                  emitScan(value);
                  return;
                }
              } else {
                const value = decodeWithJsQr(videoEl);
                if (value) {
                  emitScan(value);
                  return;
                }
              }
            } catch {
              // ignore transient detect errors
            }
          }

          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setError("Could not access camera. Check permissions or enter the code manually below.");
      }
    }

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      canvasRef.current = null;
    };
  }, []);

  return (
    <div className="relative bg-black rounded-xs overflow-hidden border border-border">
      <video ref={videoRef} className="w-full aspect-[4/3] object-cover" playsInline muted autoPlay />
      {!active && !error && (
        <div className="absolute inset-0 grid place-items-center text-white text-xs bg-black/60">
          Starting camera…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 grid place-items-center p-4 text-center text-xs text-white bg-black/80">
          {error}
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none border-2 border-primary/50 m-8 rounded-xs" />
      <div className="absolute bottom-3 left-0 right-0 text-center text-[10px] font-bold uppercase tracking-widest text-white/80 pointer-events-none">
        Point at equipment or vehicle QR
      </div>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        onClick={onClose}
        className="absolute top-2 right-2 size-8 rounded-full"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
