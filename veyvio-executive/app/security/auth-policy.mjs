const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PLATFORM_RESERVED_PATHS = new Set([
  "/signin-with-chatgpt",
  "/signout-with-chatgpt",
  "/callback",
]);

const APP_RESERVED_PATHS = new Set([
  ...PLATFORM_RESERVED_PATHS,
  "/login",
]);

function isSafeRelativePath(value) {
  if (typeof value !== "string") return false;
  if (!value.startsWith("/") || value.startsWith("//")) return false;

  try {
    return new URL(value, "https://app.local").origin === "https://app.local";
  } catch {
    return false;
  }
}

function normalizeSafePath(value) {
  const url = new URL(value, "https://app.local");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function safeRelativeReturnPath(value) {
  if (!isSafeRelativePath(value)) return "/";
  const url = new URL(value, "https://app.local");
  if (PLATFORM_RESERVED_PATHS.has(url.pathname)) return "/";
  return normalizeSafePath(value);
}

export function safeAppReturnPath(value) {
  if (!isSafeRelativePath(value)) return "/";
  const url = new URL(value, "https://app.local");
  if (
    APP_RESERVED_PATHS.has(url.pathname) ||
    url.pathname.startsWith("/api/auth/")
  ) {
    return "/";
  }
  return normalizeSafePath(value);
}

export function assessExecutiveAccess(input) {
  const applications = Array.isArray(input?.applications)
    ? input.applications.map((value) => String(value).toUpperCase())
    : [];

  if (
    !UUID_PATTERN.test(String(input?.userId ?? "")) ||
    !UUID_PATTERN.test(String(input?.companyId ?? "")) ||
    !UUID_PATTERN.test(String(input?.membershipId ?? ""))
  ) {
    return {
      allowed: false,
      code: "immutable_identity_required",
      message: "A verified Veyvio user, company and membership are required.",
    };
  }

  if (!applications.includes("EXECUTIVE")) {
    return {
      allowed: false,
      code: "executive_access_required",
      message: "This Veyvio account does not have Executive access.",
    };
  }

  return {
    allowed: true,
    code: "allowed",
    message: "Veyvio Executive access confirmed.",
  };
}

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeBase64Url(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signPayload(payload, secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("A session signing secret of at least 32 characters is required.");
  }

  const encodedPayload = encodeBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(secret),
    new TextEncoder().encode(encodedPayload),
  );
  return `${encodedPayload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifySignedPayload(value, secret) {
  if (typeof value !== "string" || typeof secret !== "string") return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret),
      decodeBase64Url(parts[1]),
      new TextEncoder().encode(parts[0]),
    );
    if (!valid) return null;
    return JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
  } catch {
    return null;
  }
}
