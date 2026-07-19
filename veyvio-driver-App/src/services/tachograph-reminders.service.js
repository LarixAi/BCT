import { getSupabaseClient } from "@/lib/supabase/client";

const REMINDER_DAYS = 30;

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Tachograph card expiry reminders for the signed-in driver. */
export async function getTachographReminders(driverId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("drivers")
    .select("tacho_card_number, tacho_card_expiry")
    .eq("id", driverId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const reminders = [];
  const expiry = data?.tacho_card_expiry?.slice(0, 10) ?? null;
  const hasCard = Boolean(data?.tacho_card_number?.trim());

  if (!hasCard) {
    reminders.push({
      type: "missing",
      message: "Tachograph card number is not on file — update with your transport manager.",
      daysUntil: null,
    });
    return reminders;
  }

  if (!expiry) {
    reminders.push({
      type: "missing_expiry",
      message: "Tachograph card expiry date is missing — ask your transport manager to update it.",
      daysUntil: null,
    });
    return reminders;
  }

  const days = daysUntil(expiry);
  if (days < 0) {
    reminders.push({
      type: "expired",
      message: `Tachograph card expired on ${expiry}.`,
      expiryDate: expiry,
      daysUntil: days,
    });
  } else if (days <= REMINDER_DAYS) {
    reminders.push({
      type: "expiring",
      message: `Tachograph card expires on ${expiry} (${days} day${days === 1 ? "" : "s"} remaining).`,
      expiryDate: expiry,
      daysUntil: days,
    });
  }

  return reminders;
}
