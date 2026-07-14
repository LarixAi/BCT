export const WELCOME_PAGES = [
  {
    title: "Start every duty with confidence",
    message:
      "See your assigned vehicle, complete walkaround checks and confirm readiness before you move.",
    cta: "Continue",
    next: "/welcome/2" as const,
  },
  {
    title: "Report what you see on the road",
    message:
      "Capture damage and defects with photos. Your report reaches the yard team immediately — no chasing, no guesswork.",
    cta: "Continue",
    next: "/welcome/3" as const,
  },
  {
    title: "One record for every journey",
    message:
      "Handover notes, defect reports and check history — accountable from depot departure to return.",
    cta: "Sign in",
    next: "/sign-in" as const,
  },
] as const;

export const DRIVER_ONBOARDING_PAGES = [
  {
    eyebrow: "Home",
    title: "See what needs doing before you move",
    message:
      "Your duty board shows the next action — walkaround due, assigned vehicle and departure time. No guessing at the start of shift.",
    cta: "Continue",
  },
  {
    eyebrow: "Trip",
    title: "Open your journey when ready",
    message:
      "Review your route, confirm the vehicle and complete readiness checks. Open journey when the vehicle is safe to enter service.",
    cta: "Continue",
  },
  {
    eyebrow: "Check",
    title: "Sign off your walkaround",
    message:
      "Complete the pre-use check section by section. Pass, record a defect, or mark N/A — with photos where needed.",
    cta: "Continue",
  },
  {
    eyebrow: "Navigation",
    title: "Follow pick ups and drop offs",
    message:
      "Each stop is labelled Pick up or Drop off with passenger detail and scheduled time. Use built-in nav or open external maps when you prefer.",
    cta: "Continue",
  },
  {
    eyebrow: "Messages",
    title: "Report issues and stay connected",
    message:
      "File defect reports with photos on the road. Messages from yard and ops reach you without chasing by radio or phone.",
    cta: "Get started",
  },
] as const;
