/**
 * Driver SOS — quick issue picker (TfL-aligned categories).
 * Emergency routes to 999; other issues open the incident report form.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, Shield } from "lucide-react";
import { DRIVER_SOS_OPTIONS } from "@/lib/tflIncidentTypes";

export default function DriverSosModal({ open, onClose, activeBooking }) {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSelect = (option) => {
    if (option.action === "call_999") {
      window.location.href = "tel:999";
      return;
    }
    onClose();
    navigate("/incidents/new", {
      state: {
        sosType: option.id,
        complaintType: option.complaintType,
        sosLabel: option.label,
        bookingRef: activeBooking?.booking_reference || activeBooking?.bookingReference || "",
        bookingId: activeBooking?.id || "",
      },
    });
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-[200]"
          role="dialog"
          aria-modal="true"
          aria-label="SOS and safety"
        >
          <motion.button
            type="button"
            aria-label="Close SOS"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="pointer-events-auto flex w-full max-w-lg max-h-[85vh] flex-col rounded-t-3xl bg-card shadow-2xl"
            >
              <div className="flex shrink-0 justify-center pb-1 pt-2.5">
                <div className="h-1 w-9 rounded-full bg-muted" />
              </div>

              <div className="flex shrink-0 items-center justify-between px-4 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ridova-teal)]/15">
                    <Shield className="h-5 w-5 text-[var(--ridova-teal)]" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">SOS &amp; safety</p>
                    <p className="text-xs text-muted-foreground">Report an issue to your operator</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-full active:bg-muted"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <div className="shrink-0 px-4 pb-3">
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-xs leading-snug text-red-800">
                    Life-threatening emergency? Tap <strong>Emergency</strong> below or call <strong>999</strong> immediately.
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
                {DRIVER_SOS_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-transform active:scale-[0.99] ${
                      option.action === "call_999"
                        ? "border-red-300 bg-red-50"
                        : "border-border bg-muted/40 active:bg-muted"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-xl leading-none">{option.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-bold ${
                            option.action === "call_999" ? "text-red-700" : "text-foreground"
                          }`}
                        >
                          {option.label}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{option.subtitle}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <p className="shrink-0 px-4 pb-6 text-center text-[10px] leading-relaxed text-muted-foreground">
                Per TfL guidance, report assaults and accidents to the police and your operator within 24 hours.
                Non-emergency police: 101.
              </p>
            </motion.div>
          </div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
