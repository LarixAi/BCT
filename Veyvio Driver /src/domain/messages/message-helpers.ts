import type { MessageFilter, MessagePriority, SenderTeam } from "@/types/messages";

export type MessageTone = "lime" | "teal" | "amber" | "red" | "grey";

export function priorityTone(priority: MessagePriority): MessageTone {
  switch (priority) {
    case "critical":
      return "red";
    case "urgent":
      return "amber";
    case "important":
      return "teal";
    default:
      return "grey";
  }
}

export function toneClasses(tone: MessageTone): { badge: string; border: string; bg: string; dot: string } {
  switch (tone) {
    case "lime":
      return { badge: "bg-ok/15 text-ok", border: "border-ok/30", bg: "bg-ok/5", dot: "bg-ok" };
    case "teal":
      return { badge: "bg-link/15 text-link", border: "border-link/30", bg: "bg-link/5", dot: "bg-primary" };
    case "amber":
      return { badge: "bg-warn/15 text-warn", border: "border-warn/30", bg: "bg-warn/5", dot: "bg-warn" };
    case "red":
      return { badge: "bg-vor/15 text-vor", border: "border-vor/30", bg: "bg-vor/5", dot: "bg-vor" };
    default:
      return { badge: "bg-secondary text-muted", border: "border-border", bg: "bg-card", dot: "bg-muted" };
  }
}

export function senderTeamLabel(team: SenderTeam): string {
  const labels: Record<SenderTeam, string> = {
    dispatch: "Dispatch",
    yard: "Yard Team",
    maintenance: "Maintenance",
    compliance: "Compliance",
    company: "Company update",
    driver: "You",
    system: "System",
  };
  return labels[team];
}

export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function filterLabel(filter: MessageFilter): string {
  const labels: Record<MessageFilter, string> = {
    all: "All",
    trips: "Trips",
    operations: "Operations",
    updates: "Updates",
  };
  return labels[filter];
}

export function quickRepliesForContext(type: "trip" | "vehicle" | "general"): string[] {
  if (type === "trip") return ["Understood", "Running late", "Please call me", "I have arrived"];
  if (type === "vehicle") return ["Vehicle located", "Issue remains", "Need assistance"];
  return ["Understood", "On my way", "I need assistance"];
}

/** "Running late" must open a structured delay form — never chat-only. */
export function isStructuredDelayQuickReply(reply: string): boolean {
  return reply === "Running late";
}
