import { onboardingShell } from "@/lib/brand-theme";

/**
 * Unified driver app theme — Ridova navy, teal accents, lime CTAs.
 * Use `op` across operational screens for consistency with auth/onboarding.
 */
export const op = {
  pageBg: "bg-background",
  text: "text-foreground",
  textMuted: "text-muted-foreground",
  textSubtle: "text-muted-foreground/80",

  card: onboardingShell.card,
  cardMuted: onboardingShell.cardMuted,
  cardInteractive: `${onboardingShell.card} active:bg-muted/30 transition-colors`,

  primaryBtn: `${onboardingShell.primaryBtn} rounded-full shadow-sm`,
  secondaryBtn:
    "bg-[var(--ridova-teal)] hover:bg-[var(--ridova-teal-dark)] text-white font-semibold rounded-full shadow-sm",
  appLabel: "text-[11px] uppercase tracking-wide text-[var(--ridova-teal)] font-semibold",

  tealAccent: onboardingShell.tealText,
  limeAccent: "text-[var(--ridova-lime)]",

  input: "bg-background border-border text-foreground placeholder:text-muted-foreground",

  navBar: "border-t border-border bg-card/95 backdrop-blur-md",
  header: "border-b border-border bg-card/95 backdrop-blur-md",

  iconWrap: "w-10 h-10 rounded-xl bg-[var(--ridova-teal)]/12 flex items-center justify-center shrink-0",
  iconWrapLime: "w-10 h-10 rounded-xl bg-[var(--ridova-lime)]/15 flex items-center justify-center shrink-0",
  iconTeal: "text-[var(--ridova-teal)]",
  iconLime: "text-[var(--ridova-lime-dark)]",

  listCard: "rounded-2xl bg-card border border-border shadow-sm overflow-hidden",

  accountHero:
    "rounded-2xl border border-[var(--ridova-teal)]/20 bg-gradient-to-br from-[var(--ridova-teal)]/10 to-[var(--ridova-lime)]/5 p-4",
  tabActive: "border-[var(--ridova-teal)] bg-[var(--ridova-teal)]/10 text-[var(--ridova-teal-dark)] font-semibold",
  toggleOn: "bg-[var(--ridova-teal)]",
  linkAccent: "text-[var(--ridova-teal)] font-semibold",
};

export function greetingForHour(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
