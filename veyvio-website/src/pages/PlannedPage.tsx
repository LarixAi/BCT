import { Link, useLocation } from "react-router-dom";
import { PageIntro } from "@/components/layout/SiteLayout";
import { usePageMeta } from "@/hooks/usePageMeta";

function titleFromPath(pathname: string) {
  const segment = pathname.split("/").filter(Boolean).at(-1) ?? "page";
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function PlannedPage() {
  const { pathname } = useLocation();
  const title = titleFromPath(pathname);

  usePageMeta({
    title: `${title} | Veyvio`,
    description: "This Veyvio destination is planned. Content is not yet published.",
    path: pathname,
    noIndex: true,
  });

  return (
    <PageIntro
      eyebrow="Planned page"
      title={title}
      lead="This destination is part of the homepage information architecture (blueprint Part F). Content is not yet published."
    >
      <Link to="/" className="btn-secondary">
        Return to homepage
      </Link>
      <Link to="/demo" className="btn-primary">
        Book a demo
      </Link>
    </PageIntro>
  );
}
