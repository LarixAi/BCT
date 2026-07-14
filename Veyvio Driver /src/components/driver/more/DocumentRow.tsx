import { documentStatusLabel } from "@/domain/more/more-helpers";
import { getDocumentTypeDefinition } from "@/domain/more/document-catalog";
import { getCaptureProgress } from "@/domain/more/document-compliance";
import type { ComplianceDocument } from "@/types/more";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

const statusTone: Partial<Record<ComplianceDocument["status"], string>> = {
  draft: "text-warn",
  expiring_soon: "text-warn",
  expired: "text-vor",
  rejected: "text-vor",
  pending_review: "text-link",
  approved: "text-ok",
};

export function DocumentRow({ document }: { document: ComplianceDocument }) {
  const typeDef = getDocumentTypeDefinition(document.documentTypeId);
  const progress = getCaptureProgress(document);

  return (
    <Link
      to={`/more/documents/${document.id}`}
      className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-secondary/30"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold">{document.name}</p>
        <p className={cn("text-xs capitalize", statusTone[document.status] ?? "text-muted")}>
          {documentStatusLabel(document.status)}
        </p>
        <p className="text-xs text-muted">{typeDef.captureLabel}</p>
        {typeDef.sides.length > 1 && (
          <p className="text-xs text-muted">{progress.label}</p>
        )}
        {document.expiryDate && (
          <p className="text-xs text-muted">Expires {document.expiryDate}</p>
        )}
        {document.actionRequired && (
          <p className="mt-0.5 text-xs font-medium text-warn">{document.actionRequired}</p>
        )}
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted" />
    </Link>
  );
}
