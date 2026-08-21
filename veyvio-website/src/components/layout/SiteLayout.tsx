import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { CookieConsent } from "./CookieConsent";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { trackEvent } from "@/lib/analytics";

export function SiteLayout() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/") {
      trackEvent("homepage_viewed", { page: "/" });
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <CookieConsent />
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-veyvio-border bg-veyvio-surface py-16 sm:py-20">
      <div className="section-container">
        {eyebrow ? (
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-veyvio-teal">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 font-marketing text-4xl font-bold tracking-tight text-veyvio-deep sm:text-5xl">
          {title}
        </h1>
        {lead ? <p className="section-lead">{lead}</p> : null}
        {children ? <div className="mt-8 flex flex-wrap gap-3">{children}</div> : null}
      </div>
    </section>
  );
}

export function SectionLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="font-semibold text-veyvio-teal underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
