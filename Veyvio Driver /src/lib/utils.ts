import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.includes("T")) {
    return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  return value.slice(0, 5);
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
