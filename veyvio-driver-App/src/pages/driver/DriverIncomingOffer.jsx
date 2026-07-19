import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  acceptJobOffer,
  declineJobOffer,
  getOfferSecondsRemaining,
} from "@/services/job-offers.service";
import { op } from "@/lib/driver-operational-theme";

export default function DriverIncomingOffer() {
  const { offerId } = useParams();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { getSupabaseClient } = await import("@/lib/supabase/client");
        const supabase = getSupabaseClient();
        const { data, error: qErr } = await supabase
          .from("job_offers")
          .select(`
            id, expires_at, offer_status,
            job:jobs(id, route_name, job_type, job_number, service_date, scheduled_start_at, passenger_count)
          `)
          .eq("id", offerId)
          .maybeSingle();
        if (qErr) throw qErr;
        setOffer(data);
        setSecondsLeft(getOfferSecondsRemaining(data?.expires_at));
      } catch (e) {
        setError(e.message ?? "Failed to load offer");
      } finally {
        setLoading(false);
      }
    }
    if (offerId) load();
  }, [offerId]);

  useEffect(() => {
    if (!offer?.expires_at) return undefined;
    const t = setInterval(() => setSecondsLeft(getOfferSecondsRemaining(offer.expires_at)), 1000);
    return () => clearInterval(t);
  }, [offer?.expires_at]);

  async function onAccept() {
    setBusy(true);
    setError(null);
    try {
      const result = await acceptJobOffer(offerId);
      navigate(`/job/${result.job_id}`, { replace: true });
    } catch (e) {
      setError(e.message ?? "Accept failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDecline() {
    setBusy(true);
    setError(null);
    try {
      await declineJobOffer(offerId, "Declined by driver");
      navigate("/", { replace: true });
    } catch (e) {
      setError(e.message ?? "Decline failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className={`p-6 ${op.text}`}>Loading offer…</div>;
  }

  if (!offer?.job) {
    return <div className={`p-6 ${op.text}`}>{error ?? "Offer not available"}</div>;
  }

  const job = offer.job;
  const expired = secondsLeft === 0;

  return (
    <div className={`min-h-dvh ${op.pageBg} ${op.text} p-4`}>
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="text-xs font-bold uppercase text-muted-foreground">Incoming job offer</p>
        <h1 className="mt-1 text-xl font-bold">{job.route_name}</h1>
        {job.job_number ? <p className="text-sm text-muted-foreground">{job.job_number}</p> : null}
        <p className="mt-3 text-sm">{job.service_date}</p>
        {secondsLeft != null ? (
          <p className={`mt-2 text-sm font-semibold ${expired ? "text-destructive" : op.tealAccent}`}>
            {expired ? "Offer expired" : `Respond within ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`}
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={busy || expired}
            onClick={onAccept}
            className="flex-1 rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDecline}
            className="flex-1 rounded-lg border border-border py-3 text-sm font-bold"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
