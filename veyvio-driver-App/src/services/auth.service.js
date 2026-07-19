import { getSupabaseClient } from "@/lib/supabase/client";
import { driverAuthRedirectPath } from "@/lib/driverAuthConfig";
import { isDriverNativeApp } from "@/lib/driverAppSurface";
import { linkDriverAccountIfNeeded } from "@/services/link-driver.service";

function friendlyAuthError(message, code) {
  const m = (message ?? "").toLowerCase();
  if (m.includes("user already registered")) {
    return "An account with this email already exists. Try signing in or reset your password.";
  }
  if (m.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }
  if (m.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (m.includes("email not confirmed") || code === "email_not_confirmed") {
    return "Your email is not verified yet. Check your inbox for the confirmation link, or resend it below.";
  }
  return message ?? "Something went wrong. Please try again.";
}

export function isEmailNotConfirmedError(message, code) {
  const m = (message ?? "").toLowerCase();
  return m.includes("email not confirmed") || code === "email_not_confirmed";
}

export async function signUpDriver({ email, password, fullName }) {
  const supabase = getSupabaseClient();
  const trimmedEmail = email.trim();
  const trimmedName = fullName.trim();

  if (!trimmedEmail || !password || !trimmedName) {
    return { ok: false, message: "Name, email and password are required." };
  }

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: { full_name: trimmedName },
      emailRedirectTo: driverAuthRedirectPath("/auth/verify"),
    },
  });

  if (error) return { ok: false, message: friendlyAuthError(error.message, error.code) };

  if (data.session) {
    await linkDriverAccountIfNeeded();
    return { ok: true, needsEmailConfirmation: false, email: trimmedEmail };
  }

  return {
    ok: true,
    needsEmailConfirmation: true,
    email: trimmedEmail,
    message: "Account created. Check your email to verify before signing in.",
  };
}

export async function resendSignupVerification(email) {
  const supabase = getSupabaseClient();
  const trimmed = email.trim();
  if (!trimmed) return { ok: false, message: "Email is required." };

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: trimmed,
    options: {
      emailRedirectTo: driverAuthRedirectPath("/auth/verify"),
    },
  });

  if (error) return { ok: false, message: friendlyAuthError(error.message, error.code) };

  return {
    ok: true,
    message: "Verification email sent. Check your inbox and spam folder.",
  };
}

export async function requestDriverPasswordReset(email) {
  const supabase = getSupabaseClient();
  const trimmed = email.trim();
  if (!trimmed) return { ok: false, message: "Email is required." };

  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: driverAuthRedirectPath("/auth/reset-password"),
  });

  if (error) return { ok: false, message: friendlyAuthError(error.message, error.code) };

  return {
    ok: true,
    message: "If an account exists for that email, you will receive a reset link shortly.",
  };
}

export async function updateDriverPassword(newPassword) {
  const supabase = getSupabaseClient();
  if (!newPassword || newPassword.length < 6) {
    return { ok: false, message: "Password must be at least 6 characters." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, message: friendlyAuthError(error.message, error.code) };

  return { ok: true, message: "Password updated. You can sign in with your new password." };
}

function phoneAuthError(message) {
  const m = (message ?? "").toLowerCase();
  if (m.includes("phone provider") || m.includes("sms provider") || m.includes("unsupported phone")) {
    return "SMS sign-in is not enabled yet. Continue with email or Google instead.";
  }
  if (m.includes("invalid phone")) {
    return "Enter a valid mobile number including country code.";
  }
  if (m.includes("otp") && m.includes("expired")) {
    return "That code has expired. Tap resend to get a new one.";
  }
  if (m.includes("invalid") || m.includes("token")) {
    return "Incorrect code. Check the message and try again.";
  }
  return message ?? "Something went wrong. Please try again.";
}

function oauthAuthError(message) {
  const m = (message ?? "").toLowerCase();
  if (m.includes("provider") || m.includes("oauth")) {
    return "This sign-in method is not enabled yet. Continue with mobile or email.";
  }
  return message ?? "Something went wrong. Please try again.";
}

export async function sendDriverPhoneOtp(phoneE164) {
  const supabase = getSupabaseClient();
  const trimmed = phoneE164?.trim();
  if (!trimmed) return { ok: false, message: "Mobile number is required." };

  const { error } = await supabase.auth.signInWithOtp({
    phone: trimmed,
    options: { channel: "sms" },
  });

  if (error) return { ok: false, message: phoneAuthError(error.message) };

  return { ok: true };
}

export async function verifyDriverPhoneOtp(phoneE164, token) {
  const supabase = getSupabaseClient();
  const trimmedPhone = phoneE164?.trim();
  const trimmedToken = token?.trim();
  if (!trimmedPhone || !trimmedToken) {
    return { ok: false, message: "Phone and verification code are required." };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: trimmedPhone,
    token: trimmedToken,
    type: "sms",
  });

  if (error) return { ok: false, message: phoneAuthError(error.message) };

  if (!data.session) {
    return { ok: false, message: "Sign-in could not be completed. Try again." };
  }

  return { ok: true, session: data.session };
}

export async function signInDriverWithGoogle() {
  return startDriverOAuth("google", { queryParams: { prompt: "select_account" } });
}

export async function signInDriverWithApple() {
  return startDriverOAuth("apple");
}

async function startDriverOAuth(provider, extraOptions = {}) {
  const supabase = getSupabaseClient();
  const redirectTo = driverAuthRedirectPath("/auth/verify");
  const useNativeFlow = isDriverNativeApp();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: useNativeFlow,
      ...extraOptions,
    },
  });

  if (error) return { ok: false, message: oauthAuthError(error.message) };

  if (useNativeFlow) {
    if (!data?.url) {
      return { ok: false, message: "Could not open sign-in. Try again." };
    }
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: data.url });
    } catch {
      return { ok: false, message: "Could not open sign-in browser." };
    }
  }

  return { ok: true };
}
