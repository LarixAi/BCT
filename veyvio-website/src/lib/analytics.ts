/**
 * Homepage blueprint §15 — analytics events.
 * Events are only sent when consent allows (see CookieConsent).
 */

export type AnalyticsEvent =
  | "homepage_viewed"
  | "demo_cta_selected"
  | "platform_cta_selected"
  | "navigation_selected"
  | "application_card_selected"
  | "industry_selected"
  | "solution_selected"
  | "trust_centre_selected"
  | "sign_in_selected"
  | "contact_selected"
  | "resource_selected"
  | "demo_form_started"
  | "demo_form_completed"
  | "demo_form_abandoned"
  | "demo_form_error"
  | "consultation_band_viewed"
  | "consultation_cta_clicked"
  | "final_cta_clicked";

export type AnalyticsPayload = {
  page?: string;
  section?: string;
  ctaLabel?: string;
  ctaPosition?: string;
  deviceCategory?: "mobile" | "tablet" | "desktop";
  referrerCategory?: string;
  consentStatus?: "granted" | "denied" | "unknown";
};

const CONSENT_KEY = "veyvio-cookie-consent";

export function getConsentStatus(): "granted" | "denied" | "unknown" {
  if (typeof window === "undefined") return "unknown";
  const value = localStorage.getItem(CONSENT_KEY);
  if (value === "granted" || value === "denied") return value;
  return "unknown";
}

function deviceCategory(): AnalyticsPayload["deviceCategory"] {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function trackEvent(event: AnalyticsEvent, payload: AnalyticsPayload = {}) {
  const consentStatus = getConsentStatus();
  const body = {
    event,
    ...payload,
    consentStatus,
    deviceCategory: payload.deviceCategory ?? deviceCategory(),
    timestamp: new Date().toISOString(),
  };

  // Development visibility
  if (import.meta.env.DEV) {
    console.info("[analytics]", body);
  }

  if (consentStatus !== "granted") return;

  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  if (endpoint) {
    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      // Analytics must never block UX
    });
  }
}

export function trackCta(
  event: AnalyticsEvent,
  label: string,
  options: Omit<AnalyticsPayload, "ctaLabel"> = {},
) {
  trackEvent(event, { ...options, ctaLabel: label });
}
