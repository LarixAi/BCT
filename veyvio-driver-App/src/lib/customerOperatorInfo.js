/** Operator branding and support for the customer (rider) app. */

export const CUSTOMER_APP_VERSION = "1.0.0";

export const CUSTOMER_OPERATOR_INFO = {
  name: import.meta.env.VITE_OPERATOR_NAME || "Core Support Fleet",
  tagline: "Private hire · TfL licensed operator",
  tflOperatorLicence: import.meta.env.VITE_OPERATOR_TFL_LICENCE || "",
  supportPhone: import.meta.env.VITE_OPERATOR_SUPPORT_PHONE || "",
  supportEmail:
    import.meta.env.VITE_OPERATOR_SUPPORT_EMAIL || "support@coresupportfleet.com",
  website: import.meta.env.VITE_OPERATOR_WEBSITE || "",
  officeHours: "Mon–Fri, 9:00–18:00 · 24/7 support for active trips",
};

export const CUSTOMER_HELP_FAQ = [
  {
    id: "book",
    question: "How do I book a ride?",
    answer:
      "Tap Where to? on the home screen, enter pickup and drop-off, choose your vehicle type, and confirm. You'll see live updates once a driver is assigned.",
  },
  {
    id: "track",
    question: "How do I track my driver?",
    answer:
      "Open Trips and select your active booking, or stay on the tracking screen after booking. You'll see status updates as your driver is assigned and en route.",
  },
  {
    id: "cancel",
    question: "Can I cancel my booking?",
    answer:
      "Yes — open Trips, select the booking, and tap Cancel before your driver arrives. Cancellation fees may apply depending on your operator's policy.",
  },
  {
    id: "payment",
    question: "How do I pay?",
    answer:
      "Choose cash or card when booking. Your receipt is available in Trips after the journey completes.",
  },
  {
    id: "lost",
    question: "I left something in the vehicle",
    answer:
      "Open Trips, find the completed journey, and tap Report lost property. Our team will contact you if the item is found.",
  },
];
