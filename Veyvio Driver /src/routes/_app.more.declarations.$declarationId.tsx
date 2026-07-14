import { createFileRoute } from "@tanstack/react-router";
import { MoreSubpageLayout, MoreField } from "@/components/driver/more/MoreLayout";
import { DeclarationFlowPanel } from "@/components/driver/more/DeclarationFlowPanel";
import { declarationStatusLabel } from "@/domain/more/declaration-compliance";
import { useMoreStore } from "@/store/more";

export const Route = createFileRoute("/_app/more/declarations/$declarationId")({
  head: () => ({ meta: [{ title: "Declaration — Veyvio Driver" }] }),
  component: DeclarationDetailPage,
});

function DeclarationDetailPage() {
  const { declarationId } = Route.useParams();
  const declaration = useMoreStore((s) => s.declarations.find((item) => item.id === declarationId));

  if (!declaration) {
    return (
      <MoreSubpageLayout title="Declaration" backTo="/more/declarations">
        <p className="text-sm text-muted">Declaration not found.</p>
      </MoreSubpageLayout>
    );
  }

  return (
    <MoreSubpageLayout title={declaration.title} backTo="/more/declarations">
      <div className="rounded-xl border border-border bg-card">
        <MoreField label="Period" value={declaration.periodLabel} />
        <MoreField label="Status" value={declarationStatusLabel(declaration.status)} />
        <MoreField label="Due date" value={declaration.dueDate} />
        <MoreField label="Declaration version" value={declaration.version} />
      </div>

      <DeclarationFlowPanel declaration={declaration} />
    </MoreSubpageLayout>
  );
}
