import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

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
    <div className="space-y-5 animate-in-up pb-4">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> More
      </Link>
      <header>
        {eyebrow ? (
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-2xl font-extrabold tracking-tight">{title}</h1>
      </header>
      {children}
    </div>
  );
}
