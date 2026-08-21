import { Link } from "react-router-dom";
import { PageIntro } from "@/components/layout/SiteLayout";
import { usePageMeta } from "@/hooks/usePageMeta";

/** Blueprint §5.3 — community-transport-led entry point (Open Decision #3) */
export function CommunityTransportLandingPage() {
  usePageMeta({
    title: "Community Transport | Veyvio",
    description:
      "Transport technology built around people, safety and community. Connect bookings, passengers, drivers, vehicles and compliance evidence.",
    path: "/community-transport",
  });

  return (
    <>
      <PageIntro
        eyebrow="Community transport"
        title="Transport technology built around people, safety and community."
        lead="Connect bookings, passengers, drivers, vehicles, compliance and community-service evidence — without replacing your operational judgement with generic software."
      >
        <Link to="/demo" className="btn-primary">
          Book a demo
        </Link>
        <Link to="/platform" className="btn-secondary">
          Explore the platform
        </Link>
      </PageIntro>

      <section className="section-container py-16">
        <div className="mx-auto grid max-w-4xl gap-8">
          <article>
            <h2 className="font-marketing text-2xl font-bold text-veyvio-deep">
              Replace paper without losing governance
            </h2>
            <p className="mt-3 text-lg text-veyvio-muted">
              Community transport teams run on limited staff and high expectations from funders and
              authorities. Veyvio connects daily workflows so evidence is produced as work happens —
              not assembled before an audit.
            </p>
          </article>
          <article>
            <h2 className="font-marketing text-2xl font-bold text-veyvio-deep">
              Built for volunteer and employed drivers
            </h2>
            <p className="mt-3 text-lg text-veyvio-muted">
              Drivers receive clear duties, checks and communication on mobile. Controllers see live
              status without chasing updates by phone.
            </p>
          </article>
          <article className="rounded-2xl border border-veyvio-border bg-veyvio-surface p-6">
            <h2 className="font-marketing text-xl font-bold text-veyvio-deep">Typical priorities</h2>
            <ul className="mt-4 space-y-2 text-veyvio-muted">
              <li>• Replacing paper and spreadsheets</li>
              <li>• Demonstrating responsible governance to funders</li>
              <li>• Vehicle and driver compliance with limited admin time</li>
              <li>• Accessible passenger transport with safeguarding-aware records</li>
            </ul>
          </article>
        </div>
      </section>
    </>
  );
}
