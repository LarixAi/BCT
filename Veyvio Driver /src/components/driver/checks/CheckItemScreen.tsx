import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { CheckItemDefinition } from "@/types/vehicle-check";
import { getSectionById } from "@/domain/vehicle-check/check-template";

export function CheckItemScreen({
  item,
  sectionIndex,
  itemIndex,
  sectionTotal,
  onPass,
  onDefect,
  onNotFitted,
}: {
  item: CheckItemDefinition;
  sectionIndex: number;
  itemIndex: number;
  sectionTotal: number;
  onPass: () => void;
  onDefect: () => void;
  onNotFitted?: () => void;
}) {
  const section = getSectionById(item.sectionId);

  return (
    <div className="flex min-h-[70vh] flex-col">
      <p className="text-xs font-medium text-muted">
        {itemIndex + 1} of {sectionTotal} · {section?.title}
      </p>

      {item.wheelPosition && (
        <p className="mt-2 rounded-md border border-link/20 bg-link/5 px-3 py-2 text-center text-sm font-semibold text-link">
          {item.wheelPosition}
        </p>
      )}

      <h2 className="mt-4 font-display text-xl font-extrabold uppercase tracking-tight">
        {item.title}
      </h2>

      <div className="mt-4 flex-1 space-y-2">
        <p className="text-sm font-medium text-muted">Check that:</p>
        <ul className="list-inside list-disc space-y-1 text-sm">
          {item.instructions.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        {item.hasKnownIssue && item.knownIssueLabel && (
          <Link
            to="/checks/known-issues"
            className="mt-3 block rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs text-muted"
          >
            Known issue: {item.knownIssueLabel}
          </Link>
        )}
      </div>

      <div className="sticky bottom-20 space-y-2 pt-4">
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" className="h-14 text-base font-bold" onClick={onPass}>
            Pass
          </Button>
          <Button size="lg" variant="destructive" className="h-14 text-base font-bold" onClick={onDefect}>
            Report defect
          </Button>
        </div>
        {item.allowNotFitted && onNotFitted && (
          <Button variant="outline" className="w-full" onClick={onNotFitted}>
            Not fitted
          </Button>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1 text-xs">
            Add photo
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 text-xs">
            Voice note
          </Button>
        </div>
      </div>
    </div>
  );
}
