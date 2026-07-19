/** Map Supabase / network errors to driver-friendly copy. Technical details go to console only. */
export function friendlyOnboardingError(error, context = "save") {
  const raw = error?.message ?? String(error ?? "");
  console.error(`[onboarding:${context}]`, error, error?.cause ?? "");

  if (error?.storageUploaded && context === "upload-metadata") {
    return "Your file was uploaded, but we couldn't save it to your onboarding record. Please try again or contact your transport manager.";
  }

  if (/row-level security|RLS|violates|permission denied|42501/i.test(raw)) {
    if (context === "upload" || context === "upload-metadata") {
      return context === "upload-metadata"
        ? "Your file was uploaded, but we couldn't save it to your onboarding record. Please try again or contact your transport manager."
        : "We couldn't upload your document. Please try again or contact your transport manager.";
    }
    return "We couldn't save your details. Please try again or contact your transport manager.";
  }
  if (/network|fetch|failed to fetch|timeout|offline/i.test(raw)) {
    return "Connection problem. Check your internet and try again.";
  }
  if (/duplicate|already exists|unique constraint/i.test(raw)) {
    return "This document is already on file. Try replacing it again.";
  }
  if (context === "upload" || context === "upload-metadata") {
    return "We couldn't upload your document. Please try again or contact your transport manager.";
  }
  return "Something went wrong. Please try again.";
}

export async function withFriendlyOnboardingError(context, fn) {
  try {
    return await fn();
  } catch (error) {
    throw new Error(friendlyOnboardingError(error, context));
  }
}
