import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { HubPageHeader, hubPageShellClass } from "@/features/hub/HubPageHeader";

export function MoreSubpageLayout({
  title,
  eyebrow,
  children,
  backTo = "/more",
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  backTo?: string;
}) {
  return (
    <div className={hubPageShellClass}>
      <Link
        to={backTo}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#667085] transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to More
      </Link>
      <HubPageHeader title={title} description={eyebrow} showSync={false} />
      {children}
    </div>
  );
}
