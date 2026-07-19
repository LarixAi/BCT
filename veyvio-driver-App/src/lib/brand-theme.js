import { RIDOVA_COLORS } from "@core-support/brand";

/** Ridova driver brand — shared with operational UI. */
export const BRAND = {
  navy: RIDOVA_COLORS.navy,
  navySoft: RIDOVA_COLORS.navySoft,
  teal: RIDOVA_COLORS.teal,
  tealDark: RIDOVA_COLORS.tealDark,
  lime: RIDOVA_COLORS.lime,
  limeDark: RIDOVA_COLORS.limeDark,
  gray: RIDOVA_COLORS.slateMuted,
  grayLight: RIDOVA_COLORS.background,
  white: RIDOVA_COLORS.white,
};

/** Shared onboarding / list surface classes (light Ridova). */
export const onboardingShell = {
  page: "min-h-dvh bg-background text-foreground",
  card: "rounded-2xl bg-card border border-border shadow-sm",
  cardMuted: "rounded-2xl bg-muted/40 border border-border",
  primaryBtn:
    "bg-[var(--ridova-lime)] hover:bg-[var(--ridova-lime-dark)] text-[var(--ridova-on-lime)] font-semibold",
  completedIcon: "text-[var(--ridova-lime)]",
  completedBg: "bg-[var(--ridova-lime)]/12",
  currentBg: "bg-[var(--ridova-teal)]/8",
  tealText: "text-[var(--ridova-teal)]",
};
