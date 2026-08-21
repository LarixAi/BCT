import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageIntro } from "@/components/layout/SiteLayout";
import { submitDemoEnquiry } from "@/lib/demo-api";
import { trackEvent } from "@/lib/analytics";
import { usePageMeta } from "@/hooks/usePageMeta";

type FormState = "idle" | "submitting" | "success" | "error";

export function DemoPage() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);

  usePageMeta({
    title: "Book a demo | Veyvio",
    description:
      "Book a tailored Veyvio demonstration for your passenger transport operation. Sample data only — live records are not affected.",
    path: "/demo",
  });

  useEffect(() => {
    trackEvent("demo_form_started", { page: "/demo" });
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("submitting");
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      const result = await submitDemoEnquiry({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        organisation: String(form.get("organisation") ?? ""),
        serviceType: String(form.get("serviceType") ?? ""),
        fleetSize: String(form.get("fleetSize") ?? ""),
        consent: form.get("consent") === "on",
        honeypot: String(form.get("companyWebsite") ?? ""),
      });
      setReference(result.reference);
      setCalendarUrl(result.calendarUrl ?? null);
      trackEvent("demo_form_completed", { page: "/demo" });
      setFormState("success");
    } catch (submissionError) {
      setFormState("error");
      trackEvent("demo_form_error", { page: "/demo" });
      setError(submissionError instanceof Error ? submissionError.message : "Submission failed");
    }
  }

  if (formState === "success") {
    return (
      <>
        <PageIntro
          eyebrow="Enquiry received"
          title="Thank you — we will tailor your demonstration"
          lead={`Reference ${reference}. A confirmation has been sent if email delivery is configured.`}
        >
          {calendarUrl ? (
            <a href={calendarUrl} className="btn-primary" target="_blank" rel="noreferrer">
              Book a calendar slot
            </a>
          ) : (
            <Link to="/" className="btn-secondary">
              Return to homepage
            </Link>
          )}
        </PageIntro>
      </>
    );
  }

  return (
    <>
      <PageIntro
        eyebrow="Book a demonstration"
        title="Tell us about your transport operation"
        lead="No obligation. We review your services and operational priorities before the demonstration."
      />

      <section className="section-container py-16">
        <form className="mx-auto max-w-2xl space-y-5" onSubmit={onSubmit} noValidate>
          <div className="sr-only" aria-hidden="true">
            <label htmlFor="companyWebsite">Company website</label>
            <input id="companyWebsite" name="companyWebsite" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <div>
            <label htmlFor="demo-name" className="block text-sm font-medium text-veyvio-deep">
              Full name
            </label>
            <input
              id="demo-name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className="mt-2 min-h-11 w-full rounded-lg border border-veyvio-border px-3"
            />
          </div>
          <div>
            <label htmlFor="demo-email" className="block text-sm font-medium text-veyvio-deep">
              Work email
            </label>
            <input
              id="demo-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-2 min-h-11 w-full rounded-lg border border-veyvio-border px-3"
            />
          </div>
          <div>
            <label htmlFor="demo-organisation" className="block text-sm font-medium text-veyvio-deep">
              Organisation
            </label>
            <input
              id="demo-organisation"
              name="organisation"
              type="text"
              required
              autoComplete="organization"
              className="mt-2 min-h-11 w-full rounded-lg border border-veyvio-border px-3"
            />
          </div>
          <div>
            <label htmlFor="demo-service-type" className="block text-sm font-medium text-veyvio-deep">
              Service type
            </label>
            <select
              id="demo-service-type"
              name="serviceType"
              required
              className="mt-2 min-h-11 w-full rounded-lg border border-veyvio-border px-3"
              defaultValue=""
            >
              <option value="" disabled>
                Select a service type
              </option>
              <option value="community-transport">Community transport</option>
              <option value="dial-a-ride">Dial-a-Ride</option>
              <option value="school-transport">Home-to-school transport</option>
              <option value="local-authority">Local authority</option>
              <option value="healthcare">Healthcare transport</option>
              <option value="other">Other passenger transport</option>
            </select>
          </div>
          <div>
            <label htmlFor="demo-fleet-size" className="block text-sm font-medium text-veyvio-deep">
              Fleet size
            </label>
            <select
              id="demo-fleet-size"
              name="fleetSize"
              required
              className="mt-2 min-h-11 w-full rounded-lg border border-veyvio-border px-3"
              defaultValue=""
            >
              <option value="" disabled>
                Select fleet size
              </option>
              <option value="1-10">1–10 vehicles</option>
              <option value="11-30">11–30 vehicles</option>
              <option value="31-100">31–100 vehicles</option>
              <option value="100+">100+ vehicles</option>
            </select>
          </div>

          <label className="flex items-start gap-3 text-sm text-veyvio-muted">
            <input
              type="checkbox"
              name="consent"
              required
              className="mt-1 min-h-4 min-w-4"
            />
            <span>
              I agree that Veyvio may contact me about this enquiry. See the{" "}
              <Link to="/legal/privacy" className="text-veyvio-teal underline">
                privacy notice
              </Link>
              .
            </span>
          </label>

          {error ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn-primary" disabled={formState === "submitting"}>
            {formState === "submitting" ? "Submitting…" : "Submit enquiry"}
          </button>
        </form>
      </section>
    </>
  );
}
