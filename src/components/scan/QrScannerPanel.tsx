import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface QrScannerPanelProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export function QrScannerPanel({ onScan, onClose }: QrScannerPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;

    async function start() {
      if (!("BarcodeDetector" in window)) {
        setError("Camera QR scanning is not supported in this browser. Use simulate scan below.");
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

        const detector = new window.BarcodeDetector!({ formats: ["qr_code"] });

        const tick = async () => {
          if (cancelled || !videoRef.current || videoRef.current.readyState < 2) {
            raf = requestAnimationFrame(tick);
            return;
          }
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue;
            if (value) {
              onScan(value);
              return;
            }
          } catch {
            // ignore transient detect errors
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setError("Could not access camera. Check permissions or use simulate scan.");
      }
    }

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [onScan]);

  return (
    <div className="relative bg-black rounded-xs overflow-hidden border border-border">
      <video ref={videoRef} className="w-full aspect-[4/3] object-cover" playsInline muted />
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
