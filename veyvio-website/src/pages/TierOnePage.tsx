import { useEffect } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { PageIntro } from "@/components/layout/SiteLayout";
import { getTierOnePage } from "@/content/tier-one-pages";
import { usePageMeta } from "@/hooks/usePageMeta";
import { trackCta } from "@/lib/analytics";
import { openDecisions } from "@/lib/open-decisions";

const classificationLabels = {
  pilot: "Pilot",
  "in-development": "In development",
  planned: "Planned",
  available: "Available",
  exploratory: "Exploratory",
} as const;

export function TierOnePage() {
  const { pathname } = useLocation();
  const page = getTierOnePage(pathname);

  usePageMeta({
    title: page?.title ?? "Veyvio",
    description: page?.lead,
    path: pathname,
  });

  if (!page) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <PageIntro eyebrow={page.eyebrow} title={page.title} lead={page.lead}>
        {page.path.startsWith("/legal/") && openDecisions.legalCompanyName.status === "provisional" ? (
          <p className="rounded-lg border border-veyvio-border bg-veyvio-surface px-3 py-2 text-xs text-veyvio-muted">
            Notices effective 28 July 2026. Registered company name is provisional until Companies House
            confirmation.
          </p>
        ) : null}
        {page.classification ? (
          <span className="rounded-full border border-veyvio-teal/30 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-veyvio-teal">
            {classificationLabels[page.classification]}
          </span>
        ) : null}
        {page.cta ? (
          page.cta.href === "/sign-in" ? (
            <a
              href={openDecisions.signInUrl.value}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              {page.cta.label}
            </a>
          ) : (
            <Link to={page.cta.href} className="btn-primary">
              {page.cta.label}
            </Link>
          )
        ) : null}
      </PageIntro>

      <section className="section-container py-16">
        <div className="mx-auto max-w-3xl space-y-10">
          {page.sections.map((section) => (
            <article key={section.heading}>
              <h2 className="font-marketing text-2xl font-bold text-veyvio-deep">{section.heading}</h2>
              <p className="mt-3 text-lg text-veyvio-muted">{section.body}</p>
            </article>
          ))}

          {page.relatedLinks && page.relatedLinks.length > 0 ? (
            <nav aria-label="Related pages">
              <h2 className="font-marketing text-xl font-bold text-veyvio-deep">Related</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {page.relatedLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="block rounded-xl border border-veyvio-border px-4 py-3 text-veyvio-deep transition hover:border-veyvio-teal/40 hover:shadow-sm"
                      onClick={() => trackCta("navigation_selected", link.label, { page: page.path })}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </section>
    </>
  );
}

export function SignInRedirect() {
  useEffect(() => {
    window.location.href = openDecisions.signInUrl.value;
  }, []);

  return (
    <PageIntro
      eyebrow="Sign in"
      title="Redirecting to Veyvio Command"
      lead="Staff sign-in is handled by your organisation's Veyvio application."
    >
      <a href={openDecisions.signInUrl.value} className="btn-primary">
        Continue to sign in
      </a>
    </PageIntro>
  );
}
