import DriverStatusBanner from "@/components/driver/operational/DriverStatusBanner";

export default function RemovedJobNotice({ transfers }) {
  if (!transfers?.length) return null;

  return (
    <div className="space-y-3">
      {transfers.map((transfer) => (
        <DriverStatusBanner
          key={transfer.transferId}
          variant="warning"
          title="Job transferred away"
        >
          <p>
            <strong>{transfer.routeName}</strong>
            {transfer.jobNumber ? ` (#${transfer.jobNumber})` : ""} has been transferred to another driver.
          </p>
          {transfer.reason ? <p className="mt-1">Reason: {transfer.reason}</p> : null}
          {transfer.handoverNote ? <p className="mt-1">Note: {transfer.handoverNote}</p> : null}
          <p className="mt-1 text-xs opacity-80">You no longer need to complete this job.</p>
        </DriverStatusBanner>
      ))}
    </div>
  );
}
