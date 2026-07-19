/** UK (en-GB) date, time, and number formatting — 24-hour clock, DD/MM/YYYY dates. */

import { format } from "date-fns";
import { enGB } from "date-fns/locale";

export const UK_LOCALE = "en-GB";

const UK_TIME_OPTS = { hour: "2-digit", minute: "2-digit", hour12: false };
const UK_DATE_SHORT_OPTS = { day: "2-digit", month: "2-digit", year: "numeric" };
const UK_DATE_MEDIUM_OPTS = { day: "numeric", month: "short", year: "numeric" };
const UK_DATE_LONG_OPTS = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
const UK_DATETIME_OPTS = { ...UK_DATE_SHORT_OPTS, ...UK_TIME_OPTS };

export function parseUkInstant(value) {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatUkTime(value, fallback = "—") {
  const d = parseUkInstant(value);
  if (!d) return fallback;
  return d.toLocaleTimeString(UK_LOCALE, UK_TIME_OPTS);
}

export function formatUkDate(value, style = "medium", fallback = "—") {
  const d = parseUkInstant(value);
  if (!d) return fallback;
  const opts =
    style === "short" ? UK_DATE_SHORT_OPTS : style === "long" ? UK_DATE_LONG_OPTS : UK_DATE_MEDIUM_OPTS;
  return d.toLocaleDateString(UK_LOCALE, opts);
}

export function formatUkDateTime(value, fallback = "—") {
  const d = parseUkInstant(value);
  if (!d) return fallback;
  return d.toLocaleString(UK_LOCALE, UK_DATETIME_OPTS);
}

export function formatUkWeekdayShort(value, fallback = "—") {
  const d = parseUkInstant(value);
  if (!d) return fallback;
  return d.toLocaleDateString(UK_LOCALE, { weekday: "short" });
}

export function formatUkDateWithWeekday(value, fallback = "—") {
  const d = parseUkInstant(value);
  if (!d) return fallback;
  return d.toLocaleDateString(UK_LOCALE, { weekday: "short", day: "numeric", month: "short" });
}

export function formatUkNumber(value, fallback = "—") {
  if (value == null || !Number.isFinite(value)) return fallback;
  return value.toLocaleString(UK_LOCALE);
}

/** date-fns with en-GB locale (e.g. "17/06/2026 14:30"). */
export function formatUkPattern(value, pattern) {
  const d = parseUkInstant(value);
  if (!d) return "—";
  return format(d, pattern, { locale: enGB });
}
