import { declarationStatusLabel, getDeclarationProgress } from "@/domain/more/declaration-compliance";
import type { DriverDeclaration } from "@/types/declarations";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

const statusTone: Partial<Record<DriverDeclaration["status"], string>> = {
  due: "text-warn",
  overdue: "text-vor",
  in_progress: "text-link",
  submitted: "text-link",
  on_file: "text-ok",
};

export function DeclarationRow({ declaration }: { declaration: DriverDeclaration }) {
  const progress = getDeclarationProgress(declaration);
  const actionable = declaration.status === "due" || declaration.status === "overdue" || declaration.status === "in_progress";

  return (
    <Link
      to={`/more/declarations/${declaration.id}`}
      className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-secondary/30"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold">{declaration.title}</p>
        <p className={cn("text-xs capitalize", statusTone[declaration.status] ?? "text-muted")}>
          {declarationStatusLabel(declaration.status)}
        </p>
        <p className="text-xs text-muted">{declaration.periodLabel}</p>
        {actionable ? (
          <p className="text-xs text-muted">
            Due {declaration.dueDate}
            {progress.total > 0 && ` · ${progress.confirmed}/${progress.total} confirmed`}
          </p>
        ) : (
          declaration.submittedAt && (
            <p className="text-xs text-muted">
              Submitted{" "}
              {new Date(declaration.submittedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )
        )}
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted" />
    </Link>
  );
}
