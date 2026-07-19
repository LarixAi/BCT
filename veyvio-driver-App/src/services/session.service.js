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
/** Map Command `driver_app_accounts.account_status` → fields the Ridova-shaped UI expects. */
function mapAccountStatusToDriverFields(accountStatus) {
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
  if (["invitation_sent", "invitation_pending", "draft"].includes(status)) {
    return { onboarding_status: "invited", status: "pending" };
  }
  // active | registration_started | setup_incomplete | compliance_restricted → enter operational shell
  if (status === "compliance_restricted") {
    return { onboarding_status: "active", status: "active" };
  }
  return { onboarding_status: "active", status: "active" };
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

  return {
    driverRow: row,
    driver: mapDriverRowToRecord(row, { depotName: depot?.name ?? null }),
    organisationId: commandSession.companyId,
    organisationName: commandSession.companyName ?? null,
    depots: commandSession.depots ?? [],
    accountStatus: commandSession.accountStatus,
  };
}

async function ensureCompanyOnSession(supabase, accessToken, refreshToken) {
  let sessionResult = await commandDriverSession(accessToken);
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

    const { data: memberships } = await supabase
      .from("company_memberships")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("status", "active");

    const companyIds = (memberships ?? []).map((row) => String(row.company_id));
    for (const companyId of companyIds) {
      const selected = await commandSelectTenant(accessToken, refreshToken, companyId);
      if (!selected.ok || !selected.accessToken) continue;

      await supabase.auth.setSession({
        access_token: selected.accessToken,
        refresh_token: selected.refreshToken ?? refreshToken,
      });

      const retry = await commandDriverSession(selected.accessToken);
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
  const canonical = normalizeOnboardingStatus(driverRow.onboarding_status);
  const needsOnboarding =
    !["approved"].includes(canonical) && !["active", "temporary_access"].includes(driverRow.onboarding_status);
  const restrictedMode = isDriverRestricted(driverRow) || driverRow.status === "suspended";

  const compliance = await loadDriverComplianceReadiness(driver).catch(() => null);

  const depotId = mapped.depots?.[0]?.id ?? null;
  const bootstrapResult = await commandDriverBootstrap(ensured.accessToken, depotId).catch(() => null);
  const bootstrap = bootstrapResult?.ok ? bootstrapResult.bootstrap : null;
  // Prefer bootstrap identity depot when session depots were empty
  const activeDepotId = bootstrap?.identity?.activeDepotId ?? depotId;
  if (bootstrap) seedDriverBootstrapCache(bootstrap, activeDepotId);

  let routeTarget = "home";
  if (canonical === "submitted") routeTarget = "pending";
  else if (needsOnboarding && canonical !== "submitted") routeTarget = "onboarding";
  else if (restrictedMode || canonical === "rejected") routeTarget = "restricted";

  // Command drivers with a linked account enter the app even when Ridova onboarding tables are empty.
  if (bootstrap?.identity?.driverId && routeTarget === "onboarding" && !needsOnboarding) {
    routeTarget = "home";
  }
  if (
    bootstrap?.identity?.accessStatus === "active" ||
    bootstrap?.identity?.accessStatus === "restricted"
  ) {
    if (routeTarget === "onboarding" && driver) routeTarget = "home";
  }

  return {
    userId: user.id,
    organisationId: mapped.organisationId,
    organisationName: mapped.organisationName,
    membershipId: null,
    driver: bootstrap?.driver?.displayName
      ? { ...driver, fullName: bootstrap.driver.displayName, organisationName: bootstrap.operator?.companyName }
      : driver,
    driverRow,
    needsOnboarding,
    restrictedMode,
    routeTarget,
    onboardingStatus: driverRow.onboarding_status,
    resubmitItems: [],
    outdatedPolicies: compliance?.outdatedPolicies ?? [],
    dispatchBlockers: compliance?.blockers ?? [],
    temporaryAccess: null,
    depots: mapped.depots,
    accountStatus: mapped.accountStatus,
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

  const login = await commandLogin(email, password);
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
  if (context?.routeTarget === "not_driver") {
    await supabase.auth.signOut();
    return {
      ok: false,
      message: context.linkError ?? "This account is not registered as a driver.",
    };
  }
  if (!context?.driver) {
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
