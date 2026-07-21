/**
 * Merge server prefill into the in-progress onboarding form without wiping fields
 * the driver has typed but not saved yet (e.g. DQC number before photo upload).
 */
export function mergeOnboardingFormFromPrefill(previous, incoming) {
  const prev = previous ?? {};
  const next = { ...prev };

  for (const [key, value] of Object.entries(incoming ?? {})) {
    if (value === undefined || value === null) continue;

    if (typeof value === "boolean") {
      if (value) next[key] = value;
      continue;
    }

    const prevText = String(prev[key] ?? "").trim();
    const incomingText = String(value ?? "").trim();

    if (!incomingText && prevText) continue;
    if (incomingText) next[key] = value;
  }

  return next;
}
