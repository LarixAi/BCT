import type { NavigateOptions, RegisteredRouter } from "@tanstack/react-router";

type AppNavigate = (opts: NavigateOptions<RegisteredRouter>) => unknown;

/**
 * Resolve sheet CTA / secondary hrefs into typed TanStack navigations.
 * Dynamic `/duties/${id}/…` strings break typed `<Link to={href}>`.
 */
export function navigateSheetHref(navigate: AppNavigate, href: string): void {
  // Trips workspace with duty focus: `/trips?dutyId=…`
  if (href.startsWith("/trips")) {
    try {
      const url = new URL(href, "https://veyvio.local");
      const dutyId = url.searchParams.get("dutyId") ?? undefined;
      void navigate({
        to: "/trips",
        search: { demo: "normal", dutyId: dutyId || undefined },
      });
    } catch {
      void navigate({ to: "/trips", search: { demo: "normal", dutyId: undefined } });
    }
    return;
  }

  if (href === "/" || href === "/checks" || href === "/messages" || href === "/more") {
    if (href === "/checks") {
      void navigate({ to: "/checks", search: { demo: "normal" } });
      return;
    }
    if (href === "/messages") {
      void navigate({ to: "/messages", search: { demo: "normal", conversationId: undefined } });
      return;
    }
    if (href === "/more") {
      void navigate({ to: "/more", search: { demo: "normal" } });
      return;
    }
    void navigate({ to: "/" });
    return;
  }

  if (href === "/more/support") {
    void navigate({ to: "/more/support" });
    return;
  }

  if (href === "/more/training") {
    void navigate({ to: "/more/training" });
    return;
  }

  if (href === "/incidents/report") {
    void navigate({ to: "/incidents/report" });
    return;
  }

  const dutyMatch = href.match(/^\/duties\/([^/?#]+)(?:\/(.+))?$/);
  if (dutyMatch) {
    const dutyId = dutyMatch[1]!;
    const rest = (dutyMatch[2] ?? "").replace(/\/$/, "");

    if (!rest) {
      void navigate({ to: "/trips", search: { demo: "normal", dutyId } });
      return;
    }

    const table: Record<string, () => void> = {
      nav: () => void navigate({ to: "/duties/$dutyId/nav", params: { dutyId } }),
      passengers: () => void navigate({ to: "/duties/$dutyId/passengers", params: { dutyId } }),
      vehicle: () => void navigate({ to: "/duties/$dutyId/vehicle", params: { dutyId } }),
      help: () => void navigate({ to: "/duties/$dutyId/help", params: { dutyId } }),
      eligibility: () => void navigate({ to: "/duties/$dutyId/eligibility", params: { dutyId } }),
      run: () => void navigate({ to: "/duties/$dutyId/run", params: { dutyId } }),
      "journey/open": () => void navigate({ to: "/duties/$dutyId/journey/open", params: { dutyId } }),
      "journey/return": () => void navigate({ to: "/duties/$dutyId/journey/return", params: { dutyId } }),
      "journey/end": () => void navigate({ to: "/duties/$dutyId/journey/end", params: { dutyId } }),
      "journey/swap": () => void navigate({ to: "/duties/$dutyId/journey/swap", params: { dutyId } }),
      "journey/delay": () => void navigate({ to: "/duties/$dutyId/journey/delay", params: { dutyId } }),
      "journey/defect": () => void navigate({ to: "/duties/$dutyId/journey/defect", params: { dutyId } }),
      "journey/note": () => void navigate({ to: "/duties/$dutyId/journey/note", params: { dutyId } }),
      "journey/active": () =>
        void navigate({
          to: "/duties/$dutyId/journey/active",
          params: { dutyId },
          search: { demo: undefined },
        }),
    };

    const go = table[rest];
    if (go) {
      go();
      return;
    }
  }
}
