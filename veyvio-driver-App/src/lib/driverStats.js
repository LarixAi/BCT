import {
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subWeeks,
} from "date-fns";
import { DEMAND_ZONES } from "@/lib/demandZones";
import { formatUkDate, formatUkDateWithWeekday } from "@/lib/uk-locale";

export const DRIVER_NET_SHARE = 0.85;

export function bookingGross(booking) {
  return booking?.final_fare ?? booking?.fare_estimate ?? 0;
}

export function bookingNet(booking) {
  return bookingGross(booking) * DRIVER_NET_SHARE;
}

export function bookingTime(booking) {
  if (booking?.completion_time) return new Date(booking.completion_time);
  if (booking?.created_date) return new Date(booking.created_date);
  return null;
}

export function isTodayBooking(booking, todayIso = new Date().toISOString().split("T")[0]) {
  const t = bookingTime(booking);
  return t ? t.toISOString().split("T")[0] === todayIso : false;
}

export function isInRange(booking, from, to) {
  const t = bookingTime(booking);
  return t ? t >= from && t <= to : false;
}

export function computeTodayStats(bookings, todayIso = new Date().toISOString().split("T")[0]) {
  const completed = bookings.filter(b => b.booking_status === "completed");
  const today = completed.filter(b => isTodayBooking(b, todayIso));
  const net = today.reduce((s, b) => s + bookingNet(b), 0);
  return { trips: today.length, net, gross: today.reduce((s, b) => s + bookingGross(b), 0) };
}

export function computeWeekStats(bookings, now = new Date()) {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const completed = bookings.filter(b => b.booking_status === "completed");
  const week = completed.filter(b => isInRange(b, weekStart, weekEnd));
  const net = week.reduce((s, b) => s + bookingNet(b), 0);
  return { trips: week.length, net, gross: week.reduce((s, b) => s + bookingGross(b), 0), weekStart, weekEnd };
}

export function lastCompletedTrip(bookings) {
  return bookings
    .filter(b => b.booking_status === "completed")
    .sort((a, b) => {
      const ta = bookingTime(a)?.getTime() ?? 0;
      const tb = bookingTime(b)?.getTime() ?? 0;
      return tb - ta;
    })[0] ?? null;
}

export function bestDayThisWeek(bookings, now = new Date()) {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let best = { label: "—", net: 0 };

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const from = startOfDay(d);
    const to = endOfDay(d);
    const dayBookings = bookings.filter(
      b => b.booking_status === "completed" && isInRange(b, from, to)
    );
    const net = dayBookings.reduce((s, b) => s + bookingNet(b), 0);
    if (net > best.net) best = { label: days[i], net };
  }

  return best;
}

export function nearestDemandZones(lat, lng, count = 2) {
  return [...DEMAND_ZONES]
    .map(z => ({
      ...z,
      distance: (z.lat - lat) ** 2 + (z.lng - lng) ** 2,
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

export function formatPromoDeadline(promo) {
  if (!promo?.valid_until) return "Ongoing";
  const end = new Date(promo.valid_until);
  if (Number.isNaN(end.getTime())) return "Ongoing";
  return `Until ${formatUkDateWithWeekday(promo.valid_until)}`;
}

export function computeMonthStats(bookings, monthDate = new Date()) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const completed = bookings.filter(b => b.booking_status === "completed");
  const month = completed.filter(b => isInRange(b, monthStart, monthEnd));
  const net = month.reduce((s, b) => s + bookingNet(b), 0);
  return {
    trips: month.length,
    net,
    gross: month.reduce((s, b) => s + bookingGross(b), 0),
    monthStart,
    monthEnd,
  };
}

export function computeLastWeekStats(bookings, now = new Date()) {
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const completed = bookings.filter(b => b.booking_status === "completed");
  const week = completed.filter(b => isInRange(b, lastWeekStart, lastWeekEnd));
  const net = week.reduce((s, b) => s + bookingNet(b), 0);
  return { trips: week.length, net, gross: week.reduce((s, b) => s + bookingGross(b), 0), weekStart: lastWeekStart, weekEnd: lastWeekEnd };
}

export function buildWeekDayChart(bookings, weekStart, now = new Date()) {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const completed = bookings.filter(b => b.booking_status === "completed");
  const todayIso = now.toISOString().split("T")[0];

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const from = startOfDay(d);
    const to = endOfDay(d);
    const dayJobs = completed.filter(b => isInRange(b, from, to));
    const net = dayJobs.reduce((s, b) => s + bookingNet(b), 0);
    const iso = d.toISOString().split("T")[0];
    return {
      label: days[i],
      net,
      trips: dayJobs.length,
      isToday: iso === todayIso,
      dateLabel: formatUkDateWithWeekday(d),
    };
  });
}

export function buildMonthlyChart(bookings, monthDate = new Date()) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const daysInMonth = monthEnd.getDate();
  const completed = bookings.filter(b => b.booking_status === "completed");

  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(monthStart);
    d.setDate(i + 1);
    const from = startOfDay(d);
    const to = endOfDay(d);
    const dayJobs = completed.filter(b => isInRange(b, from, to));
    const net = dayJobs.reduce((s, b) => s + bookingNet(b), 0);
    return { day: i + 1, net, trips: dayJobs.length };
  });
}

export function weekOverWeekChange(thisWeekNet, lastWeekNet) {
  if (lastWeekNet <= 0) return thisWeekNet > 0 ? 100 : 0;
  return Math.round(((thisWeekNet - lastWeekNet) / lastWeekNet) * 100);
}

export function driverOpportunityTitle(promo) {
  if (!promo) return "";
  if (promo.discount_type === "percentage") {
    return `${promo.discount_amount}% off rides — more demand near you`;
  }
  if (promo.discount_type === "fixed" && promo.discount_amount) {
    return `£${promo.discount_amount} off rides — boost your trips`;
  }
  return promo.title || "Active promotion";
}
