import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";
import DriverEmptyState from "@/components/driver/operational/DriverEmptyState";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { op } from "@/lib/driver-operational-theme";
import {
  acknowledgeCorrectiveAction,
  acknowledgeDebriefNotice,
  listPendingCorrectiveActions,
  listPendingDebriefNotices,
} from "@/services/acknowledgements.service";

export default function DriverAcknowledgements({ driver }) {
  const [debriefs, setDebriefs] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [d, a] = await Promise.all([
        listPendingDebriefNotices(driver.id),
        listPendingCorrectiveActions(driver.id),
      ]);
      setDebriefs(d);
      setActions(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load acknowledgements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [driver.id]);

  const ackDebrief = async (id) => {
    setBusyId(id);
    const result = await acknowledgeDebriefNotice(driver, id);
    setBusyId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    await refresh();
  };

  const ackAction = async (id) => {
    setBusyId(id);
    const result = await acknowledgeCorrectiveAction(driver, id);
    setBusyId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    await refresh();
  };

  const empty = !loading && debriefs.length === 0 && actions.length === 0;

  return (
    <div>
      <DriverOperationalHeader
        title="Acknowledgements"
        subtitle="Debriefs and corrective actions"
        backTo="/"
      />
      <div className="px-4 pb-8">
        <CommandBackendNotice
          status="missing"
          title="Debriefs are not on Command yet"
          description="Duty acknowledgement is live under Trips. Debrief / corrective-action lists still use legacy tables."
        />
        {loading ? <DriverPageLoader label="Loading…" /> : null}
        {error ? <p className="mt-6 text-red-600 text-sm">{error}</p> : null}

        {empty ? (
          <DriverEmptyState icon={ClipboardList} title="Nothing pending" description="You're up to date." />
        ) : null}

        {debriefs.length > 0 ? (
          <section className="mt-4">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Debrief notices</h2>
            <div className="space-y-3">
              {debriefs.map((n) => (
                <div key={n.id} className={`p-4 ${op.card}`}>
                  <p className="font-semibold text-sm text-foreground">{n.notice_title}</p>
                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap line-clamp-4">{n.notice_body}</p>
                  <Button
                    size="sm"
                    className={`mt-4 ${op.primaryBtn}`}
                    disabled={busyId === n.id}
                    onClick={() => void ackDebrief(n.id)}
                  >
                    {busyId === n.id ? "Acknowledging…" : "Acknowledge debrief"}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {actions.length > 0 ? (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Corrective actions</h2>
            <div className="space-y-3">
              {actions.map((a) => (
                <div key={a.id} className={`p-4 ${op.card}`}>
                  <p className="font-semibold text-sm text-foreground">{a.title}</p>
                  {a.description ? <p className="text-sm text-muted-foreground mt-2">{a.description}</p> : null}
                  {a.due_at ? (
                    <p className="text-xs text-amber-700 mt-2">Due {a.due_at.slice(0, 10)}</p>
                  ) : null}
                  <Button
                    size="sm"
                    className={`mt-4 ${op.primaryBtn}`}
                    disabled={busyId === a.id}
                    onClick={() => void ackAction(a.id)}
                  >
                    {busyId === a.id ? "Acknowledging…" : "Acknowledge action"}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
