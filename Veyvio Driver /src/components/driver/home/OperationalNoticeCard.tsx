import { Link } from "@tanstack/react-router";
import type { OperationalNotice } from "@/types/home";
import { HomeCard, HomeCardLabel, HomeCardTitle } from "./HomeCard";
import { Button } from "@/components/ui/button";

export function OperationalNoticeCard({
  notice,
  onAcknowledge,
}: {
  notice: OperationalNotice;
  onAcknowledge?: () => void;
}) {
  return (
    <HomeCard tone="teal">
      <HomeCardLabel>Operations update</HomeCardLabel>
      <HomeCardTitle>{notice.title}</HomeCardTitle>
      <p className="mt-2 text-sm text-muted">{notice.body}</p>
      <div className="mt-4 flex flex-col gap-2">
        {notice.requiresAcknowledgement && !notice.acknowledged && (
          <Button className="h-11 w-full font-bold uppercase tracking-widest" onClick={onAcknowledge}>
            Acknowledge
          </Button>
        )}
        <Button asChild variant="outline" className="h-11 w-full">
          <Link to="/messages">Open messages</Link>
        </Button>
      </div>
    </HomeCard>
  );
}
