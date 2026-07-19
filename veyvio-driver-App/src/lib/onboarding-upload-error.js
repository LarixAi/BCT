/** Structured upload failure — storage vs metadata vs step update. */
export class OnboardingUploadError extends Error {
  constructor(message, { phase = "unknown", storageUploaded = false, cause = null } = {}) {
    super(message);
    this.name = "OnboardingUploadError";
    this.phase = phase;
    this.storageUploaded = storageUploaded;
    this.cause = cause;
  }
}

export function messageForUploadFailure(error) {
  if (error instanceof OnboardingUploadError) return error.message;
  return null;
}
