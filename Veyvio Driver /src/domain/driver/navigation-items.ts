import {
  ClipboardCheck,
  Home,
  ListChecks,
  MessageSquare,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { DriverPrimaryTab } from "./navigation-policy";

export interface DriverNavigationItem {
  id: DriverPrimaryTab;
  label: string;
  to: string;
  icon: LucideIcon;
}

export const DRIVER_NAVIGATION_ITEMS: readonly DriverNavigationItem[] = [
  { id: "home", label: "Home", to: "/", icon: Home },
  { id: "duties", label: "Duties", to: "/trips", icon: ListChecks },
  { id: "checks", label: "Checks", to: "/checks", icon: ClipboardCheck },
  { id: "messages", label: "Messages", to: "/messages", icon: MessageSquare },
  { id: "more", label: "More", to: "/more", icon: MoreHorizontal },
];
