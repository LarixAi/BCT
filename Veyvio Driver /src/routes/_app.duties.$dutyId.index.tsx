import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy Duty Hub (`/duties/:id`) duplicated the Duties workspace sheet
 * (checklist + stacked action cards). Prep now lives on `/trips?dutyId=`.
 * Nested journey/nav/check routes under `/duties/$dutyId/*` stay as focused pages.
 */
export const Route = createFileRoute("/_app/duties/$dutyId/")({
  head: () => ({ meta: [{ title: "Duty — Veyvio Driver" }] }),
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/trips",
      search: { demo: "normal", dutyId: params.dutyId },
      replace: true,
    });
  },
});
