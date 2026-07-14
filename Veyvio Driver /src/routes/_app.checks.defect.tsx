import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { DefectReportForm } from "@/components/driver/checks/DefectReportForm";
import { applyCheckSubmissionToDriverState } from "@/domain/vehicle-check/complete-check-flow";
import { useVehicleCheckStore } from "@/store/vehicle-check";

export const Route = createFileRoute("/_app/checks/defect")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (search.mode as "duty" | "check" | "damage" | undefined) ?? "check",
    itemId: (search.itemId as string | undefined) ?? undefined,
    sectionId: (search.sectionId as string | undefined) ?? undefined,
    component: (search.component as string | undefined) ?? "Vehicle defect",
    position: (search.position as string | undefined) ?? undefined,
    returnTo: (search.returnTo as string | undefined) ?? "/checks",
  }),
  head: () => ({ meta: [{ title: "Report defect — Veyvio Driver" }] }),
  component: DefectPage,
});

function DefectPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const checksHome = useVehicleCheckStore((s) => s.checksHome);
  const addDefect = useVehicleCheckStore((s) => s.addDefect);
  const setItemResult = useVehicleCheckStore((s) => s.setItemResult);
  const setDeclarationHeld = useVehicleCheckStore((s) => s.setDeclarationHeld);
  const submitCheck = useVehicleCheckStore((s) => s.submitCheck);

  function submitSafetyCriticalResult() {
    setDeclarationHeld(true);
    submitCheck();
    const { activeSession, checksHome: home } = useVehicleCheckStore.getState();
    if (activeSession?.outcome) {
      applyCheckSubmissionToDriverState(activeSession.outcome, home, activeSession);
    }
    void navigate({ to: "/checks/result", replace: true });
  }

  return (
    <div className="animate-in-up space-y-4">
      <Link to={search.returnTo} className="text-sm text-link">
        ← Back
      </Link>
      <DefectReportForm
        vehicleRegistration={checksHome.vehicle.registration}
        component={search.component}
        position={search.position}
        onSubmit={(data) => {
          const itemId = search.itemId ?? `duty_defect_${Date.now()}`;
          addDefect({
            id: `def_${Date.now()}`,
            itemId,
            sectionId: search.sectionId ?? "duty",
            component: search.component,
            position: search.position,
            description: data.description,
            timing: data.timing,
            driverAssessment: data.assessment,
            severity: data.severity,
            photoTaken: data.photoTaken,
            synced: false,
          });
          if (search.itemId) {
            setItemResult(search.itemId, "defect");
          }
          if (data.severity === "safety_critical") {
            submitSafetyCriticalResult();
          } else if (search.returnTo === "/checks/walkaround") {
            void navigate({ to: "/checks/walkaround" });
          } else {
            void navigate({ to: "/checks" });
          }
        }}
      />
    </div>
  );
}
