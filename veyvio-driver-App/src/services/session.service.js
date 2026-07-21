import { getSupabaseClient } from "@/lib/supabase/client";
import { mapDriverRowToRecord, isDriverRestricted } from "@/lib/map-driver";
import { normalizeOnboardingStatus } from "@/lib/onboarding-status";
import { loadDriverComplianceReadiness } from "@/services/driver-compliance.service";
import { formatAuthError, isRateLimitError, markRateLimitCooldown } from "@/lib/auth-errors";
import {
  commandDriverBootstrap,
  commandDriverSession,
  commandLogin,
  commandSelectTenant,
} from "@/lib/command-api";
import {
  invalidateDriverBootstrapCache,
  seedDriverBootstrapCache,
} from "@/services/driver-bootstrap.service";
import { withTimeout } from "@/lib/withTimeout";
/** Map Command `driver_app_accounts.account_status` → fields the Ridova-shaped UI expects. */
export function mapAccountStatusToDriverFields(accountStatus) {
  const status = String(accountStatus ?? "active");
  if (["suspended", "temporarily_suspended", "locked"].includes(status)) {
    return { onboarding_status: "suspended", status: "suspended" };
  }
  if (["offboarded", "archived", "disabled"].includes(status)) {
    return { onboarding_status: "left_company", status: "inactive" };
  }
  if (status === "pending_approval") {
    return { onboarding_status: "compliance_review", status: "pending" };
  }
  if (["invitation_sent", "invitation_pending", "draft", "not_created"].includes(status)) {
    return { onboarding_status: "invited", status: "pending" };
  }
  // Driver can sign in but must finish app onboarding before the operational shell.
  if (["setup_incomplete", "registration_started"].includes(status)) {
    return { onboarding_status: "documents_pending", status: "pending" };
  }
  // Password reset stays in the app shell (auth recovery), not the onboarding wizard.
  if (status === "password_reset_required") {
    return { onboarding_status: "active", status: "active" };
  }
  if (status === "compliance_restricted") {
    return { onboarding_status: "active", status: "active" };
  }
  if (status === "active") {
    return { onboarding_status: "active", status: "active" };
  }
  // Unknown statuses: prefer onboarding over silently opening the ops shell.
  return { onboarding_status: "invited", status: "pending" };
}


function applyActivationPhaseToDriverRow(driverRow, sessionPayload) {
  const phase = sessionPayload?.activationPhase;
  const operationalStatus = String(sessionPayload?.operationalStatus ?? "");
  // Admin "Activate for dispatch" — open the ops shell even if checklist still looks incomplete.
  if (["eligible", "restricted"].includes(operationalStatus)) {
    driverRow.onboarding_status = "active";
    driverRow.status = "active";
    return;
  }
  if (phase === "activation_training") {
    driverRow.onboarding_status = "documents_pending";
    driverRow.status = "pending";
  } else if (phase === "awaiting_document_review") {
    driverRow.onboarding_status = "compliance_review";
    driverRow.status = "pending";
  }
}

function mapCommandSessionToDriver(commandSession, userId) {
  const fullName =
    [commandSession.firstName, commandSession.lastName].filter(Boolean).join(" ").trim() ||
    commandSession.email ||
    "Driver";
  const depot = commandSession.depots?.[0] ?? null;
  const fields = mapAccountStatusToDriverFields(commandSession.accountStatus);

  const row = {
    id: commandSession.driverId,
    user_id: userId,
    organisation_id: commandSession.companyId,
    full_name: fullName,
    email: commandSession.email ?? "",
    phone: commandSession.mobile ?? "",
    date_of_birth: commandSession.dateOfBirth ?? null,
    onboarding_status: fields.onboarding_status,
    status: fields.status,
    home_depot_id: depot?.id ?? null,
    compliance_band: "green",
    can_do_school_runs: false,
    can_do_private_hire: false,
    can_do_coach_work: false,
    right_to_work_verified: true,
    rejection_reason: null,
    license_no: "",
    employment_type: null,
    driver_role: null,
    temporary_access_scope: null,
    temporary_access_expires_at: null,
    temporary_access_reason: null,
    license_expiry: null,
    cpc_expiry: null,
    dbs_expiry: null,
    medical_expiry: null,
  };

  applyActivationPhaseToDriverRow(row, commandSession);

  return {
    driverRow: row,
    driver: mapDriverRowToRecord(row, { depotName: depot?.name ?? null }),
    organisationId: commandSession.companyId,
    organisationName: commandSession.companyName ?? null,
    depots: commandSession.depots ?? [],
    accountStatus: commandSession.accountStatus,
  };
}

async function fetchDriverSessionWithRetry(accessToken, attempts = 2) {
  const timeoutMs = 20000;
  let last = { ok: false, status: 0, message: "Driver session timed out. Check your connection." };
  for (let i = 0; i < attempts; i += 1) {
    last = await withTimeout(
      commandDriverSession(accessToken),
      timeoutMs,
      { ok: false, status: 0, message: "Driver session timed out. Check your connection." },
    );
    if (last.ok) return last;
    // Retry cold Edge Function starts / transient network only.
    if (last.status !== 0) return last;
  }
  return last;
}

async function ensureCompanyOnSession(supabase, accessToken, refreshToken) {
  let sessionResult = await fetchDriverSessionWithRetry(accessToken);
  if (sessionResult.ok) return { accessToken, refreshToken, sessionResult };

  // 409 / company_required = JWT missing active_company_id — activate a membership.
  const needsCompany =
    sessionResult.status === 409 ||
    sessionResult.code === "company_required" ||
    /select a company/i.test(sessionResult.message ?? "");
  if (needsCompany && refreshToken) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { accessToken, refreshToken, sessionResult };

    // Ridova membership lookup can hang on network/RLS — never block sign-in forever.
    const membershipsResult = await withTimeout(
      supabase
        .from("company_memberships")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .then((result) => result),
      4000,
      { data: null, error: { message: "timeout" } },
    );
    const memberships = membershipsResult?.data ?? null;

    const companyIds = (memberships ?? []).map((row) => String(row.company_id));
    for (const companyId of companyIds) {
      const selected = await withTimeout(
        commandSelectTenant(accessToken, refreshToken, companyId),
        12000,
        { ok: false },
      );
      if (!selected.ok || !selected.accessToken) continue;

      await supabase.auth.setSession({
        access_token: selected.accessToken,
        refresh_token: selected.refreshToken ?? refreshToken,
      });

      const retry = await fetchDriverSessionWithRetry(selected.accessToken);
      if (retry.ok) {
        return {
          accessToken: selected.accessToken,
          refreshToken: selected.refreshToken ?? refreshToken,
          sessionResult: retry,
        };
      }
      sessionResult = retry;
    }
  }

  return { accessToken, refreshToken, sessionResult };
}

export async function getDriverSessionContext() {
  const supabase = getSupabaseClient();
  const {
    data: { session: authSession },
  } = await supabase.auth.getSession();

  if (!authSession?.user || !authSession.access_token) return null;

  const user = authSession.user;
  const ensured = await ensureCompanyOnSession(
    supabase,
    authSession.access_token,
    authSession.refresh_token,
  );
  const { sessionResult } = ensured;

  if (!sessionResult.ok) {
    if (sessionResult.status === 403) {
      return {
        userId: user.id,
        routeTarget: "onboarding",
        driver: null,
        needsOnboarding: true,
        linkError: sessionResult.message,
      };
    }
    if (sessionResult.status === 0) {
      return {
        userId: user.id,
        routeTarget: "session_error",
        driver: null,
        linkError: sessionResult.message ?? "Could not reach Command. Check your connection and try again.",
      };
    }
    if (sessionResult.status === 409) {
      return {
        userId: user.id,
        routeTarget: "not_driver",
        driver: null,
        linkError: sessionResult.message,
      };
    }
    return {
      userId: user.id,
      routeTarget: "not_driver",
      driver: null,
      linkError: sessionResult.message,
    };
  }

  const mapped = mapCommandSessionToDriver(sessionResult.session, user.id);
  const driverRow = mapped.driverRow;
  const driver = mapped.driver;

  // Prefer Command session fields; fall back to shared tables when API is behind.
  let operationalStatus = String(sessionResult.session?.operationalStatus ?? "");
  let accountStatus = String(mapped.accountStatus ?? sessionResult.session?.accountStatus ?? "");
  // Always read operational status from shared table — Command session may lag behind deploys.
  {
    const { data: driverOps } = await withTimeout(
      supabase
        .from("drivers")
        .select("operational_status")
        .eq("id", driverRow.id)
        .maybeSingle()
        .then((result) => result),
      3000,
      { data: null },
    );
    if (driverOps?.operational_status) operationalStatus = String(driverOps.operational_status);
  }
  if (!accountStatus || accountStatus === "setup_incomplete") {
    const { data: appRow } = await withTimeout(
      supabase
        .from("driver_app_accounts")
        .select("account_status")
        .eq("driver_id", driverRow.id)
        .maybeSingle()
        .then((result) => result),
      3000,
      { data: null },
    );
    if (appRow?.account_status) accountStatus = String(appRow.account_status);
  }

  // Re-apply activation mapping with the resolved operational status.
  applyActivationPhaseToDriverRow(driverRow, {
    ...sessionResult.session,
    operationalStatus,
    activationPhase: sessionResult.session?.activationPhase,
  });
  if (["eligible", "restricted"].includes(operationalStatus)) {
    mapped.accountStatus = "active";
    accountStatus = "active";
  } else {
    mapped.accountStatus = accountStatus || mapped.accountStatus;
  }

  // Rebuild driver record after mutating onboarding/account fields.
  const refreshedDriver = mapDriverRowToRecord(driverRow, {
    depotName: mapped.depots?.[0]?.name ?? null,
  });
  mapped.driver = refreshedDriver;

  const canonical = normalizeOnboardingStatus(driverRow.onboarding_status);
  const needsOnboarding =
    !["approved"].includes(canonical) && !["active", "temporary_access"].includes(driverRow.onboarding_status);
  const restrictedMode = isDriverRestricted(driverRow) || driverRow.status === "suspended";

  const compliance = await withTimeout(
    loadDriverComplianceReadiness(refreshedDriver).catch(() => null),
    2500,
    null,
  );

  const depotId = mapped.depots?.[0]?.id ?? null;
  const bootstrapResult = await withTimeout(
    commandDriverBootstrap(ensured.accessToken, depotId).catch(() => null),
    8000,
    null,
  );
  const bootstrap = bootstrapResult?.ok ? bootstrapResult.bootstrap : null;
  // Prefer bootstrap identity depot when session depots were empty
  const activeDepotId = bootstrap?.identity?.activeDepotId ?? depotId;
  if (bootstrap) seedDriverBootstrapCache(bootstrap, activeDepotId);

  let routeTarget = "home";
  const activationPhase = sessionResult.session?.activationPhase;
  const dispatchActivated = ["eligible", "restricted"].includes(operationalStatus);

  if (dispatchActivated) {
    routeTarget = restrictedMode || canonical === "rejected" ? "restricted" : "home";
    try {
      sessionStorage.removeItem("veyvio.driver.forceAppShell");
    } catch {
      /* ignore */
    }
  } else if (activationPhase === "activation_training") {
    routeTarget = "onboarding";
  } else if (canonical === "submitted") {
    routeTarget = "pending";
  } else if (needsOnboarding && canonical !== "submitted") {
    routeTarget = "onboarding";
  } else if (restrictedMode || canonical === "rejected") {
    routeTarget = "restricted";
  }

  // Bootstrap `accessStatus` is broadly "active" for setup_incomplete too — do not use it
  // to skip Driver onboarding. Only Command `active` / ops-restricted accounts open Home.
  const commandAccountReady = ["active", "compliance_restricted"].includes(accountStatus);
  if (
    !dispatchActivated &&
    commandAccountReady &&
    bootstrap?.identity?.driverId &&
    routeTarget === "onboarding" &&
    !needsOnboarding
  ) {
    routeTarget = "home";
  }

  return {
    userId: user.id,
    accessToken: ensured.accessToken ?? authSession.access_token,
    driverId: refreshedDriver.id,
    organisationId: mapped.organisationId,
    organisationName: mapped.organisationName,
    membershipId: null,
    driver: bootstrap?.driver?.displayName
      ? {
          ...refreshedDriver,
          fullName: bootstrap.driver.displayName,
          organisationName: bootstrap.operator?.companyName,
          operationalStatus,
        }
      : { ...refreshedDriver, operationalStatus },
    driverRow,
    needsOnboarding: dispatchActivated ? false : needsOnboarding,
    restrictedMode,
    routeTarget,
    onboardingStatus: driverRow.onboarding_status,
    operationalStatus,
    activationPhase: activationPhase ?? null,
    resubmitItems: [],
    outdatedPolicies: compliance?.outdatedPolicies ?? [],
    dispatchBlockers: compliance?.blockers ?? [],
    temporaryAccess: null,
    depots: mapped.depots,
    accountStatus,
    bootstrap,
    homeSummary: bootstrap?.legacy?.homeSummary ?? null,
    activeDepotId,
  };
}

async function applyCommandTokens(supabase, accessToken, refreshToken) {
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) return { ok: false, message: formatAuthError(error.message) };
  return { ok: true };
}

export async function signInDriver(email, password) {
  const supabase = getSupabaseClient();

  const login = await withTimeout(
    commandLogin(email, password),
    15000,
    { ok: false, message: "Sign-in timed out. Check your connection and try again." },
  );
  if (!login.ok) {
    if (isRateLimitError(login.message)) markRateLimitCooldown();
    return { ok: false, message: formatAuthError(login.message) };
  }

  if (login.requiresMfaChallenge) {
    return {
      ok: false,
      message: "This account needs a verification code. Finish sign-in in Veyvio Driver, or ask your office to disable MFA for testing.",
    };
  }

  let accessToken = login.accessToken;
  let refreshToken = login.refreshToken;

  if (!accessToken || !refreshToken) {
    return { ok: false, message: "Sign in did not return a session. Try again." };
  }

  if (login.requiresTenantSelection && Array.isArray(login.memberships) && login.memberships.length) {
    let linked = null;
    for (const membership of login.memberships) {
      const companyId = membership.companyId ?? membership.tenantId;
      if (!companyId) continue;
      const selected = await commandSelectTenant(accessToken, refreshToken, companyId);
      if (!selected.ok || !selected.accessToken) continue;
      const probe = await commandDriverSession(selected.accessToken);
      if (probe.ok) {
        linked = selected;
        break;
      }
      // Keep tokens for next attempt
      accessToken = selected.accessToken;
      refreshToken = selected.refreshToken ?? refreshToken;
    }
    if (!linked) {
      // Fall back to first company so JWT has company context
      const first = login.memberships[0];
      const companyId = first.companyId ?? first.tenantId;
      const selected = await commandSelectTenant(accessToken, refreshToken, companyId);
      if (selected.ok && selected.accessToken) {
        accessToken = selected.accessToken;
        refreshToken = selected.refreshToken ?? refreshToken;
      }
    } else {
      accessToken = linked.accessToken;
      refreshToken = linked.refreshToken ?? refreshToken;
    }
  }

  const applied = await applyCommandTokens(supabase, accessToken, refreshToken);
  if (!applied.ok) return applied;

  const context = await getDriverSessionContext();
  if (context?.routeTarget === "session_error") {
    await supabase.auth.signOut().catch(() => undefined);
    return {
      ok: false,
      message: context.linkError ?? "Could not finish signing in. Check your connection and try again.",
    };
  }
  if (context?.routeTarget === "not_driver") {
    await supabase.auth.signOut();
    return {
      ok: false,
      message: context.linkError ?? "This account is not registered as a driver.",
    };
  }
  if (!context?.driver) {
    await supabase.auth.signOut().catch(() => undefined);
    return {
      ok: false,
      message:
        context?.linkError ??
        "No Driver account is linked to this login. Ask your transport manager to invite this email in Veyvio Command.",
    };
  }

  return { ok: true, context };
}

export async function signOutDriver() {
  invalidateDriverBootstrapCache();
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}
