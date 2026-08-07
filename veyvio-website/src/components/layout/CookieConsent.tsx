import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getConsentStatus } from "@/lib/analytics";

const CONSENT_KEY = "veyvio-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    setVisible(getConsentStatus() === "unknown");

    function onPreferencesOpen() {
      setVisible(true);
    }
    window.addEventListener("veyvio:cookie-preferences", onPreferencesOpen);
    return () => window.removeEventListener("veyvio:cookie-preferences", onPreferencesOpen);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = dialogRef.current;
    const focusables = root?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusables?.[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setConsent("denied");
        return;
      }
      if (event.key !== "Tab" || !focusables?.length) return;
      const list = Array.from(focusables);
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [visible]);

  function setConsent(value: "granted" | "denied") {
    localStorage.setItem(CONSENT_KEY, value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-x-4 bottom-4 z-[60] rounded-2xl border border-veyvio-border bg-white p-5 shadow-xl sm:inset-x-auto sm:right-6 sm:max-w-md"
    >
      <h2 id={titleId} className="font-marketing text-lg font-bold text-veyvio-deep">
        Cookie preferences
      </h2>
      <p id={descId} className="mt-2 text-sm text-veyvio-muted">
        We use essential cookies to run this site. Analytics cookies help us understand how visitors
        use the website — only if you accept. See our{" "}
        <Link to="/legal/cookies" className="text-veyvio-teal underline">
          cookie notice
        </Link>
        .
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={() => setConsent("granted")}>
          Accept analytics
        </button>
        <button type="button" className="btn-secondary" onClick={() => setConsent("denied")}>
          Essential only
        </button>
      </div>
    </div>
  );
}

export function openCookiePreferences() {
  localStorage.removeItem(CONSENT_KEY);
  window.dispatchEvent(new Event("veyvio:cookie-preferences"));
}
