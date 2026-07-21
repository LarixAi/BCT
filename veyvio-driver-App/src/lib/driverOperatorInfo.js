/** Operator branding and support details for the driver app. */

export const DRIVER_APP_VERSION = "1.0.0";

export const DRIVER_OPERATOR_INFO = {
  name: import.meta.env.VITE_OPERATOR_NAME || "Veyvio",
  tagline: "Private hire · TfL licensed operator",
  tflOperatorLicence: import.meta.env.VITE_OPERATOR_TFL_LICENCE || "",
  supportPhone: import.meta.env.VITE_OPERATOR_SUPPORT_PHONE || "",
  supportEmail:
    import.meta.env.VITE_OPERATOR_SUPPORT_EMAIL || "support@veyvio.com",
  website: import.meta.env.VITE_OPERATOR_WEBSITE || "",
  officeHours: "Mon–Fri, 9:00–18:00 · Emergency line 24/7 for active incidents",
};

export const DRIVER_HELP_FAQ = [
  {
    id: "go-online",
    question: "Why can't I go online?",
    answer:
      "You need an assigned vehicle, verified documents, and accepted operator terms. Complete your daily safety check and ensure your PHV licence and insurance are valid. Check Account & Documents for anything flagged by compliance.",
  },
  {
    id: "earnings",
    question: "When do I get paid?",
    answer:
      "Earnings from completed jobs are processed according to your operator's payout schedule. Add or update your bank details under Bank Details in the menu. Contact support if a payout is missing after the expected date.",
  },
  {
    id: "documents",
    question: "How do I upload or renew documents?",
    answer:
      "Open Account & Documents from the menu. Upload PHV licence, driving licence, insurance, DBS, and other certificates before they expire. Compliance will review uploads and notify you if anything needs attention.",
  },
  {
    id: "daily-check",
    question: "Do I need a daily safety check?",
    answer:
      "Yes. TfL requires a daily vehicle inspection before carrying passengers. Complete the Daily Safety Check in the menu. Do not drive if the check fails — notify your operator immediately.",
  },
  {
    id: "incident",
    question: "How do I report an incident?",
    answer:
      "For emergencies call 999 first. Then use Incident Report in the menu or Help & Support to log accidents, safety concerns, or lost property. Reports must be submitted to your operator within 24 hours.",
  },
  {
    id: "account",
    question: "My account is suspended or pending — what now?",
    answer:
      "Suspended or pending accounts cannot accept jobs. Message your operator via Help & Support for the reason and steps to resolve. Keep your contact details up to date in Account & Documents.",
  },
];

export const DRIVER_OPERATOR_TERMS_SUMMARY = `PRIVATE HIRE VEHICLE DRIVER TERMS

1. COMPLIANCE — Hold a valid TfL PHV driver licence; ensure your vehicle has valid PHV licence, MOT, and hire & reward insurance.

2. DAILY SAFETY CHECKS — Complete a daily vehicle check before any journey. Do not drive a failed vehicle until defects are fixed.

3. CONDUCT — Professional behaviour at all times. Discrimination, harassment, or unsafe driving may result in suspension.

4. DATA & PRIVACY — Location is recorded during active jobs. Do not retain or share customer data outside the platform.

5. FARES & PAYMENTS — Fares follow the operator's published schedule. No extra charges without operator approval.

6. REPORTING — Report accidents, incidents, complaints, and lost property within 24 hours via the driver app.

7. TERMINATION — The operator may suspend or remove platform access for non-compliance or breach of law.`;

export const DRIVER_PRIVACY_SUMMARY = `We collect account details, licence and compliance documents, location during active jobs, trip and earnings data, and support messages. Data is used to operate the service, meet TfL requirements, process payments, and keep drivers and passengers safe. Contact your operator to request access to or correction of your personal data.`;
