import { useSessionStore } from "@/platform/auth/session-store";

export function getActorName(): string {
  const user = useSessionStore.getState().user;
  if (!user) return "Unknown";
  const initial = user.firstName.charAt(0).toUpperCase();
  return `${initial}. ${user.lastName}`;
}
