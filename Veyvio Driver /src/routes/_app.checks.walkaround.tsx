import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckItemScreen } from "@/components/driver/checks/CheckItemScreen";
import { SectionProgressList } from "@/components/driver/checks/SectionProgressList";
import { BodyworkReview } from "@/components/driver/checks/BodyworkReview";
import { overallProgress } from "@/domain/vehicle-check/check-helpers";
import { getAllItems, getApplicableSections } from "@/domain/vehicle-check/check-template";
import { useVehicleCheckStore } from "@/store/vehicle-check";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/checks/walkaround")({
  validateSearch: (search: Record<string, unknown>) => ({
    section: (search.section as string | undefined) ?? undefined,
    item: (search.item as string | undefined) ?? undefined,
    step: (search.step as "bodywork" | undefined) ?? undefined,
  }),
  head: () => ({ meta: [{ title: "Vehicle walkaround — Veyvio Driver" }] }),
  component: WalkaroundPage,
});

function WalkaroundPage() {
  const navigate = useNavigate();
  const { section, item, step } = Route.useSearch();
  const session = useVehicleCheckStore((s) => s.activeSession);
  const checksHome = useVehicleCheckStore((s) => s.checksHome);
  const setItemResult = useVehicleCheckStore((s) => s.setItemResult);
  const setBodyworkConfirmation = useVehicleCheckStore((s) => s.setBodyworkConfirmation);

  const accessible = checksHome.vehicle.accessibilityCapable;
  const progress = session ? overallProgress(session, accessible) : { answered: 0, total: 0, defects: 0 };

  if (!session) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">No check in progress.</p>
        <Button asChild>
          <Link to="/checks/verify">Start verification</Link>
        </Button>
      </div>
    );
  }

  if (step === "bodywork") {
    return (
      <div className="animate-in-up">
        <Link to="/checks/walkaround" className="text-sm text-link">
          ← Walkaround
        </Link>
        <div className="mt-4">
          <BodyworkReview
            records={checksHome.knownIssues.bodyworkRecords}
            onNoNewDamage={() => {
              setBodyworkConfirmation(true);
              void navigate({ to: "/checks/review" });
            }}
            onReportNew={() => {
              void navigate({
                to: "/checks/defect",
                search: {
                  mode: "damage",
                  component: "New bodywork damage",
                  returnTo: "/checks/walkaround",
                },
              });
            }}
          />
        </div>
      </div>
    );
  }

  const currentItem = (() => {
    if (item) return getAllItems(accessible).find((i) => i.id === item);
    if (section) {
      const sec = getApplicableSections(accessible).find((s) => s.id === section);
      return sec?.items.find((i) => session.itemResults[i.id]?.result === undefined || session.itemResults[i.id]?.result === "unanswered");
    }
    return getAllItems(accessible).find(
      (i) => session.itemResults[i.id]?.result === undefined || session.itemResults[i.id]?.result === "unanswered",
    );
  })();

  if (!section && !item) {
    return (
      <div className="animate-in-up space-y-4">
        <header>
          <Link to="/checks" className="text-sm text-link">
            ← Checks
          </Link>
          <h1 className="mt-2 font-display text-xl font-extrabold">Guided vehicle check</h1>
          <p className="text-sm text-muted">
            {progress.answered} of {progress.total} items answered
            {progress.defects > 0 ? ` · ${progress.defects} defect${progress.defects === 1 ? "" : "s"}` : ""}
          </p>
        </header>

        <SectionProgressList session={session} accessibilityCapable={accessible} />

        {progress.answered === progress.total && (
          <Button
            className="w-full"
            onClick={() => void navigate({ to: "/checks/walkaround", search: { step: "bodywork" } })}
          >
            Continue to bodywork review
          </Button>
        )}
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">Section complete.</p>
        <Button asChild>
          <Link to="/checks/walkaround">Back to sections</Link>
        </Button>
      </div>
    );
  }

  const sectionDef = getApplicableSections(accessible).find((s) => s.id === currentItem.sectionId);
  const sectionItems = sectionDef?.items ?? [];
  const itemIndex = sectionItems.findIndex((i) => i.id === currentItem.id);

  function goNext() {
    const items = getAllItems(accessible);
    const idx = items.findIndex((i) => i.id === currentItem.id);
    const answered = new Set(["pass", "not_fitted", "defect"]);
    const next = items.slice(idx + 1).find((i) => !answered.has(session.itemResults[i.id]?.result ?? "unanswered"));
    if (next) {
      void navigate({ to: "/checks/walkaround", search: { item: next.id } });
    } else if (progress.answered + 1 >= progress.total) {
      void navigate({ to: "/checks/walkaround", search: { step: "bodywork" } });
    } else {
      void navigate({ to: "/checks/walkaround" });
    }
  }

  return (
    <div className="animate-in-up">
      <Link to="/checks/walkaround" className="text-sm text-link">
        ← Sections
      </Link>
      <div className="mt-4">
        <CheckItemScreen
          item={currentItem}
          sectionIndex={sectionDef?.order ?? 0}
          itemIndex={itemIndex}
          sectionTotal={sectionItems.length}
          onPass={() => {
            setItemResult(currentItem.id, "pass");
            goNext();
          }}
          onDefect={() => {
            void navigate({
              to: "/checks/defect",
              search: {
                itemId: currentItem.id,
                sectionId: currentItem.sectionId,
                component: currentItem.title,
                position: currentItem.wheelPosition,
                returnTo: "/checks/walkaround",
              },
            });
          }}
          onNotFitted={
            currentItem.allowNotFitted
              ? () => {
                  setItemResult(currentItem.id, "not_fitted");
                  goNext();
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
