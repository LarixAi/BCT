import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId")({
  component: DutyLayout,
});

function DutyLayout() {
  const { dutyId } = Route.useParams();
  const loadDuty = useDriverStore((s) => s.loadDuty);
  const setActiveDuty = useDriverStore((s) => s.setActiveDuty);

  useEffect(() => {
    setActiveDuty(dutyId);
    void loadDuty(dutyId);
    return () => setActiveDuty(null);
  }, [dutyId, loadDuty, setActiveDuty]);

  return <Outlet />;
}
