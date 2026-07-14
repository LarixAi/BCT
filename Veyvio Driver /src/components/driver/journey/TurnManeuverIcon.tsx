import {
  ArrowUp,
  CornerDownLeft,
  CornerDownRight,
  CornerUpLeft,
  CornerUpRight,
  GitMerge,
  LogIn,
  LogOut,
  Navigation,
  RotateCw,
  Split,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function TurnManeuverIcon({
  maneuverType,
  modifier,
  className,
  size = "md",
}: {
  maneuverType: string;
  modifier?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const iconClass = cn(
    size === "lg" ? "size-8" : size === "sm" ? "size-4" : "size-6",
    className,
  );

  if (maneuverType === "arrive") return <LogIn className={iconClass} aria-hidden />;
  if (maneuverType === "depart") return <Navigation className={iconClass} aria-hidden />;
  if (maneuverType === "merge") return <GitMerge className={iconClass} aria-hidden />;
  if (maneuverType === "fork") return <Split className={iconClass} aria-hidden />;
  if (maneuverType === "roundabout" || maneuverType === "rotary") {
    return <RotateCw className={iconClass} aria-hidden />;
  }
  if (maneuverType === "on ramp") return <LogIn className={iconClass} aria-hidden />;
  if (maneuverType === "off ramp") return <LogOut className={iconClass} aria-hidden />;

  if (modifier?.includes("left")) {
    if (modifier.includes("sharp")) return <CornerDownLeft className={iconClass} aria-hidden />;
    if (modifier.includes("slight")) return <CornerUpLeft className={iconClass} aria-hidden />;
    return <CornerUpLeft className={iconClass} aria-hidden />;
  }

  if (modifier?.includes("right")) {
    if (modifier.includes("sharp")) return <CornerDownRight className={iconClass} aria-hidden />;
    if (modifier.includes("slight")) return <CornerUpRight className={iconClass} aria-hidden />;
    return <CornerUpRight className={iconClass} aria-hidden />;
  }

  if (modifier === "uturn") return <RotateCw className={iconClass} aria-hidden />;

  return <ArrowUp className={iconClass} aria-hidden />;
}
