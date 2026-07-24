import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { HubPageHeader, hubPageShellClass } from "@/features/hub/HubPageHeader";

export function HubOpsPageLayout({
  title,
  description,
  children,
  backTo = "/more",
  backLabel = "More",
  primaryAction,
  secondaryAction,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
}) {
  return (
    <div className={hubPageShellClass}>
      <Link
        to={backTo}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#667085] transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to {backLabel}
      </Link>
      <HubPageHeader
        title={title}
        description={description}
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
      />
      {children}
    </div>
  );
}
