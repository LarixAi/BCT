type ClientErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type ClientErrorReporter = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: ClientErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __veyvioReportError?: ClientErrorReporter["captureException"];
  }
}

/** Report client errors to an optional host hook (e.g. Sentry) or console in dev. */
export function reportClientError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const payload = {
    source: "react_error_boundary",
    route: window.location.pathname,
    ...context,
  };

  if (window.__veyvioReportError) {
    window.__veyvioReportError(error, payload, {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    });
    return;
  }

  if (import.meta.env.DEV) {
    console.error("[Veyvio Yard]", error, payload);
  }
}
