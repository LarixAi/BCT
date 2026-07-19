/** How long a driver has to accept or decline a trip offer (seconds). */
export const JOB_OFFER_DURATION_SEC = 45;

/** Countdown from when the driver first saw the offer in the app. */
export function getOfferRemainingSec(seenAtMs, nowMs = Date.now()) {
  if (!seenAtMs) return JOB_OFFER_DURATION_SEC;
  const elapsed = (nowMs - seenAtMs) / 1000;
  return Math.max(0, JOB_OFFER_DURATION_SEC - elapsed);
}

export function isOfferExpired(seenAtMs, nowMs = Date.now()) {
  return getOfferRemainingSec(seenAtMs, nowMs) <= 0;
}
