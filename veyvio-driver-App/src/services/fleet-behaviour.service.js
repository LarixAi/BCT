import { getSupabaseClient } from "@/lib/supabase/client";
import {
  DEFAULT_FLEET_TRACKING_SETTINGS,
  EVENT_SCORE_DEDUCTIONS,
  clampScore,
  speedingSeverity,
} from "@/lib/fleet-tracking-rules";

const lastPingBySession = new Map();

function headingDelta(a, b) {
  if (typeof a !== "number" || typeof b !== "number") return 0;
  let diff = Math.abs(a - b) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

async function recentEventExists(sessionId, eventType) {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("fleet_driving_events")
    .select("id")
    .eq("session_id", sessionId)
    .eq("event_type", eventType)
    .gte("recorded_at", new Date(Date.now() - 60_000).toISOString())
    .limit(1);
  return (data ?? []).length > 0;
}

async function insertEvent(input) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("fleet_driving_events")
    .insert({
      organisation_id: input.organisationId,
      depot_id: input.depotId ?? null,
      session_id: input.sessionId,
      driver_id: input.driverId,
      vehicle_id: input.vehicleId ?? null,
      job_id: input.jobId ?? null,
      event_type: input.eventType,
      severity: input.severity,
      recorded_at: input.recordedAt ?? new Date().toISOString(),
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      speed_mph: input.speedMph ?? null,
      speed_limit_mph: input.speedLimitMph ?? null,
      measured_value: input.measuredValue ?? null,
      threshold_value: input.thresholdValue ?? null,
      description: input.description ?? null,
    })
    .select("id")
    .single();

  if (error) return null;

  if (input.severity === "major" || input.severity === "critical") {
    await supabase.from("fleet_tracking_alerts").insert({
      organisation_id: input.organisationId,
      depot_id: input.depotId ?? null,
      driver_id: input.driverId,
      vehicle_id: input.vehicleId ?? null,
      job_id: input.jobId ?? null,
      session_id: input.sessionId,
      event_id: data.id,
      alert_type: input.eventType,
      severity: input.severity === "critical" ? "critical" : "warning",
      title: `${input.eventType.replace(/_/g, " ")} alert`,
      message: input.description ?? `${input.eventType} detected`,
    });
  }

  return data.id;
}

export async function analyseDrivingPing({
  session,
  driver,
  latitude,
  longitude,
  speedMph,
  heading,
  speedLimitMph,
  settings = DEFAULT_FLEET_TRACKING_SETTINGS,
}) {
  if (!session?.id) return;

  const prev = lastPingBySession.get(session.id);
  const now = {
    speedMph: typeof speedMph === "number" ? speedMph : null,
    heading: typeof heading === "number" ? heading : null,
    at: Date.now(),
    lat: latitude,
    lng: longitude,
  };

  const base = {
    organisationId: session.organisationId ?? driver.organisationId,
    depotId: session.depotId ?? driver.homeDepotId ?? null,
    sessionId: session.id,
    driverId: driver.id,
    vehicleId: session.vehicleId,
    jobId: session.jobId,
    lat: latitude,
    lng: longitude,
    speedMph: now.speedMph,
    speedLimitMph,
  };

  if (typeof speedLimitMph === "number" && typeof now.speedMph === "number") {
    const over = now.speedMph - speedLimitMph;
    const severity = speedingSeverity(over, settings);
    if (severity && severity !== "info") {
      const deduped = await recentEventExists(session.id, "speeding");
      if (!deduped) {
        await insertEvent({
          ...base,
          eventType: "speeding",
          severity,
          measuredValue: over,
          thresholdValue: speedLimitMph,
          description: `Speed ${Math.round(now.speedMph)} mph in ${Math.round(speedLimitMph)} mph zone (+${Math.round(over)} mph)`,
        });
      }
    }
  }

  if (prev && typeof prev.speedMph === "number" && typeof now.speedMph === "number") {
    const delta = now.speedMph - prev.speedMph;
    const seconds = Math.max(1, (now.at - prev.at) / 1000);

    if (delta <= -settings.harshBrakeMphDrop && seconds <= 35) {
      const deduped = await recentEventExists(session.id, "harsh_braking");
      if (!deduped) {
        await insertEvent({
          ...base,
          eventType: "harsh_braking",
          severity: Math.abs(delta) >= settings.harshBrakeMphDrop * 1.5 ? "major" : "minor",
          measuredValue: Math.abs(delta),
          thresholdValue: settings.harshBrakeMphDrop,
          description: `Harsh braking: ${Math.round(Math.abs(delta))} mph drop`,
        });
      }
    }

    if (delta >= settings.harshAccelMphGain && seconds <= 35) {
      const deduped = await recentEventExists(session.id, "harsh_acceleration");
      if (!deduped) {
        await insertEvent({
          ...base,
          eventType: "harsh_acceleration",
          severity: delta >= settings.harshAccelMphGain * 1.5 ? "major" : "minor",
          measuredValue: delta,
          thresholdValue: settings.harshAccelMphGain,
          description: `Harsh acceleration: +${Math.round(delta)} mph`,
        });
      }
    }
  }

  if (prev && typeof prev.heading === "number" && typeof now.heading === "number") {
    const turn = headingDelta(prev.heading, now.heading);
    if (turn >= settings.sharpTurnDegrees && typeof now.speedMph === "number" && now.speedMph >= 15) {
      const deduped = await recentEventExists(session.id, "sharp_turn");
      if (!deduped) {
        await insertEvent({
          ...base,
          eventType: "sharp_turn",
          severity: turn >= settings.sharpTurnDegrees * 1.5 ? "major" : "minor",
          measuredValue: turn,
          thresholdValue: settings.sharpTurnDegrees,
          description: `Sharp turn at ${Math.round(now.speedMph)} mph`,
        });
      }
    }
  }

  if (typeof now.speedMph === "number" && now.speedMph < 3) {
    const idleStart = prev?.idleSince ?? now.at;
    const idleMinutes = (now.at - idleStart) / 60_000;
    if (idleMinutes >= settings.longIdleMinutes) {
      const deduped = await recentEventExists(session.id, "long_idle");
      if (!deduped) {
        await insertEvent({
          ...base,
          eventType: "long_idle",
          severity: "info",
          measuredValue: idleMinutes,
          thresholdValue: settings.longIdleMinutes,
          description: `Vehicle idle for ${Math.round(idleMinutes)} minutes`,
        });
      }
    }
    lastPingBySession.set(session.id, { ...now, idleSince: idleStart });
    return;
  }

  lastPingBySession.set(session.id, { ...now, idleSince: null });
}

function periodBounds(periodType, date = new Date()) {
  const iso = date.toISOString().slice(0, 10);
  if (periodType === "week") {
    const d = new Date(`${iso}T12:00:00`);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    const start = d.toISOString().slice(0, 10);
    d.setDate(d.getDate() + 6);
    return { periodStart: start, periodEnd: d.toISOString().slice(0, 10) };
  }
  return { periodStart: iso, periodEnd: iso };
}

function scoreFromEvents(events) {
  let safetyScore = 100;
  const counts = {
    speedingCount: 0,
    harshBrakingCount: 0,
    harshAccelerationCount: 0,
    sharpTurnCount: 0,
    routeDeviationCount: 0,
  };

  for (const event of events) {
    safetyScore -= EVENT_SCORE_DEDUCTIONS[event.severity] ?? 0;
    if (event.event_type === "speeding") counts.speedingCount += 1;
    if (event.event_type === "harsh_braking") counts.harshBrakingCount += 1;
    if (event.event_type === "harsh_acceleration") counts.harshAccelerationCount += 1;
    if (event.event_type === "sharp_turn") counts.sharpTurnCount += 1;
    if (event.event_type === "route_deviation") counts.routeDeviationCount += 1;
  }

  return { safetyScore: clampScore(safetyScore), ...counts };
}

export async function rollupSessionScores(sessionId) {
  const supabase = getSupabaseClient();
  const { data: session } = await supabase
    .from("fleet_tracking_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return null;

  const { data: events } = await supabase
    .from("fleet_driving_events")
    .select("severity, event_type")
    .eq("session_id", sessionId);

  const scored = scoreFromEvents(events ?? []);
  await supabase.from("fleet_tracking_sessions").update({ safety_score: scored.safetyScore }).eq("id", sessionId);

  const week = periodBounds("week");
  const tripEnd = (session.ended_at ?? session.started_at).slice(0, 10);

  const upsertScore = async (periodType, periodStart, periodEnd, withSession) => {
    await supabase.from("fleet_driver_scores").upsert(
      {
        organisation_id: session.organisation_id,
        depot_id: session.depot_id,
        driver_id: session.driver_id,
        session_id: withSession ? session.id : null,
        period_type: periodType,
        period_start: periodStart,
        period_end: periodEnd,
        safety_score: scored.safetyScore,
        smoothness_score: scored.safetyScore,
        speed_score: scored.safetyScore,
        braking_score: scored.safetyScore,
        cornering_score: scored.safetyScore,
        speeding_count: scored.speedingCount,
        harsh_braking_count: scored.harshBrakingCount,
        harsh_acceleration_count: scored.harshAccelerationCount,
        sharp_turn_count: scored.sharpTurnCount,
        route_deviation_count: scored.routeDeviationCount,
        total_sessions: 1,
        total_distance_miles: Number(session.distance_miles ?? 0),
      },
      { onConflict: "driver_id,period_type,period_start,period_end,session_id" },
    );
  };

  await upsertScore("trip", session.started_at.slice(0, 10), tripEnd, true);
  await upsertScore("week", week.periodStart, week.periodEnd, false);

  return scored.safetyScore;
}

export async function getTrackingConsent(driverId) {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("driver_tracking_permissions")
    .select("telematics_consent_at")
    .eq("driver_id", driverId)
    .order("last_checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return Boolean(data?.telematics_consent_at);
}

export async function saveTrackingConsent(driver, { platform = "web", deviceId = "browser" } = {}) {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("driver_tracking_permissions").upsert(
    {
      organisation_id: driver.organisationId,
      driver_id: driver.id,
      device_id: deviceId,
      platform,
      fine_location_granted: true,
      telematics_consent_at: now,
      last_checked_at: now,
    },
    { onConflict: "driver_id,device_id" },
  );
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
