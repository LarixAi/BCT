import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";
import DriverEmptyState from "@/components/driver/operational/DriverEmptyState";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import { op } from "@/lib/driver-operational-theme";
import { formatUkDate } from "@/lib/uk-locale";
import {
  acknowledgeCorrectiveAction,
  acknowledgeDebriefNotice,
  listPendingCorrectiveActions,
  listPendingDebriefNotices,
} from "@/services/acknowledgements.service";
import {
  advanceJourneySequenceAcknowledgement,
  listJourneySequenceAcknowledgements,
} from "@/services/command-driver-ops.service";

/** Hide PostgREST / schema messages from drivers. */
function toDriverError(raw) {
  const message = String(raw ?? "").trim();
  if (!message) return "";
  if (/schema cache|could not find the table|does not exist|PGRST205|42P01/i.test(message)) {
    return "";
  }
  return message;
}

function journeyStatusLabel(status) {
  const value = String(status ?? "").toLowerCase();
  if (value === "viewed") return "Viewed — confirm when ready";
  if (value === "delivered" || value === "sent") return "Stop order changed";
  return status || "Pending";
}

export default function DriverAcknowledgements({ driver }) {
  const [debriefs, setDebriefs] = useState([]);
  const [actions, setActions] = useState([]);
  const [journeyAcks, setJourneyAcks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [listsUnavailable, setListsUnavailable] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [d, a, journey] = await Promise.all([
        listPendingDebriefNotices(driver.id),
        listPendingCorrectiveActions(driver.id),
        listJourneySequenceAcknowledgements(),
      ]);
      setDebriefs(d.items);
      setActions(a.items);
      setJourneyAcks(journey.ok ? journey.acknowledgements ?? [] : []);
      setListsUnavailable(Boolean(d.unavailable && a.unavailable && !journey.ok));
      if (!journey.ok && journey.message) {
        const journeyMessage = toDriverError(journey.message);
        if (journeyMessage) setError(journeyMessage);
      }
    } catch (e) {
      const driverMessage = toDriverError(e instanceof Error ? e.message : String(e));
      if (driverMessage) {
        setError(driverMessage);
      } else {
        setDebriefs([]);
        setActions([]);
        setJourneyAcks([]);
        setListsUnavailable(true);
      }
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
      setError(toDriverError(result.message) || result.message);
      return;
    }
    await refresh();
  };

  const ackAction = async (id) => {
    setBusyId(id);
    const result = await acknowledgeCorrectiveAction(driver, id);
    setBusyId(null);
    if (!result.ok) {
      setError(toDriverError(result.message) || result.message);
      return;
    }
    await refresh();
  };

  const ackJourney = async (tripId, status) => {
    setBusyId(tripId);
    const result = await advanceJourneySequenceAcknowledgement(tripId, { status });
    setBusyId(null);
    if (!result.ok) {
      setError(toDriverError(result.message) || result.message);
      return;
    }
    await refresh();
  };

  const empty =
    !loading && debriefs.length === 0 && actions.length === 0 && journeyAcks.length === 0;
  const visibleError = toDriverError(error);

  return (
    <div>
      <DriverOperationalHeader
        title="Acknowledgements"
        subtitle="Sequence changes, debriefs, and corrective actions"
        backTo="/"
      />
      <div className="px-4 pb-8">
        {loading ? <DriverPageLoader label="Loading…" /> : null}
        {visibleError ? <p className="mt-4 text-sm text-red-600">{visibleError}</p> : null}

        {empty ? (
          <DriverEmptyState
            icon={ClipboardList}
            title={listsUnavailable ? "Nothing to acknowledge" : "Nothing pending"}
            description={
              listsUnavailable
                ? "Duty acknowledgements live under Trips. Other notices will appear here when your operator issues them."
                : "You're up to date. Duty acknowledgements live under Trips when a new duty is published."
            }
            action={
              <Button asChild variant="outline" className="h-11 min-h-[44px]">
                <Link to="/jobs">Go to Trips</Link>
              </Button>
            }
          />
        ) : null}

        {journeyAcks.length > 0 ? (
          <section className="mt-4">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Journey sequence</h2>
            <div className="space-y-3">
              {journeyAcks.map((ack) => {
                const tripId = ack.tripId ?? ack.id;
                const needsConfirm = String(ack.status ?? "").toLowerCase() !== "viewed";
                return (
                  <div key={tripId} className={`p-4 ${op.card}`}>
                    <p className="text-sm font-semibold text-foreground">
                      {journeyStatusLabel(ack.status)}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {ack.summary || "Your stop order changed. Confirm you have the latest sequence before continuing."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {needsConfirm ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-11 min-h-[44px]"
                          disabled={busyId === tripId}
                          onClick={() => void ackJourney(tripId, "viewed")}
                        >
                          {busyId === tripId ? "Saving…" : "Mark viewed"}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        className={`h-11 min-h-[44px] ${op.primaryBtn}`}
                        disabled={busyId === tripId}
                        onClick={() => void ackJourney(tripId, "acknowledged")}
                      >
                        {busyId === tripId ? "Acknowledging…" : "Acknowledge sequence"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {debriefs.length > 0 ? (
          <section className="mt-4">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Debrief notices</h2>
            <div className="space-y-3">
              {debriefs.map((n) => (
                <div key={n.id} className={`p-4 ${op.card}`}>
                  <p className="text-sm font-semibold text-foreground">{n.notice_title}</p>
                  <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
                    {n.notice_body}
                  </p>
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
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Corrective actions</h2>
            <div className="space-y-3">
              {actions.map((a) => (
                <div key={a.id} className={`p-4 ${op.card}`}>
                  <p className="text-sm font-semibold text-foreground">{a.title}</p>
                  {a.description ? (
                    <p className="mt-2 text-sm text-muted-foreground">{a.description}</p>
                  ) : null}
                  {a.due_at ? (
                    <p className="mt-2 text-xs text-amber-700">Due {formatUkDate(a.due_at)}</p>
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
