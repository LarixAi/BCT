import { Link } from "react-router-dom";
import { PageIntro } from "@/components/layout/SiteLayout";
import { usePageMeta } from "@/hooks/usePageMeta";
import { openDecisions, siteContact } from "@/lib/open-decisions";

export function ContactPage() {
  usePageMeta({
    title: "Contact Veyvio",
    description:
      "Speak with the Veyvio team about demonstrations, sales enquiries and customer support for passenger transport operations.",
    path: "/contact",
  });

  return (
    <>
      <PageIntro
        eyebrow="Contact"
        title="Speak with the Veyvio team"
        lead="Book a demonstration for product enquiries. Existing customers should sign in to their Veyvio application for operational support."
      >
        <Link to="/demo" className="btn-primary">
          Book a demo
        </Link>
        <a href={`mailto:${siteContact.salesEmail}`} className="btn-secondary">
          Email {siteContact.salesEmail}
        </a>
      </PageIntro>

      <section className="section-container py-16">
        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-veyvio-border bg-veyvio-surface p-6">
            <h2 className="font-marketing text-lg font-bold text-veyvio-deep">Sales and demonstrations</h2>
            <p className="mt-3 text-veyvio-muted">
              <a href={`mailto:${siteContact.salesEmail}`} className="font-semibold text-veyvio-teal">
                {siteContact.salesEmail}
              </a>
            </p>
            {openDecisions.salesEmail.status === "provisional" ? (
              <p className="mt-2 text-xs text-veyvio-muted">Provisional address — confirm with Commercial.</p>
            ) : null}
          </article>
          <article className="rounded-2xl border border-veyvio-border bg-veyvio-surface p-6">
            <h2 className="font-marketing text-lg font-bold text-veyvio-deep">Customer support</h2>
            <p className="mt-3 text-veyvio-muted">
              <a href={`mailto:${siteContact.supportEmail}`} className="font-semibold text-veyvio-teal">
                {siteContact.supportEmail}
              </a>
            </p>
            <p className="mt-3 text-sm text-veyvio-muted">
              Operational issues are handled through your organisation&apos;s Veyvio apps and support route.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
