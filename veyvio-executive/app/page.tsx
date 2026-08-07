import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ExecutiveApp from "./ExecutiveApp";
import { isLocalDemoRequest, requireChatGPTUser } from "./chatgpt-auth";
import {
  isCommandIdentityConfigured,
  getVerifiedExecutiveSession,
} from "./security/veyvio-session";

export const metadata: Metadata = {
  title: "CEO Today | Veyvio",
  description: "Company-wide decisions, branch performance, governance and controlled records for Veyvio leadership.",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const outerUser = await requireChatGPTUser("/");
  const session = await getVerifiedExecutiveSession(
    outerUser,
    "executive.dashboard.read",
  );

  if (!session) {
    // UI-only demo when Command identity is not wired.
    // When Command is configured, always send the user through company login.
    if ((await isLocalDemoRequest()) && !isCommandIdentityConfigured()) {
      return (
        <ExecutiveApp
          identity={{
            displayName: outerUser.displayName,
            role: "Chief Executive (local demo)",
            companyName: "Demo CEC",
          }}
        />
      );
    }
    redirect("/login?return_to=%2F");
  }

  const veyvioName = [session.user.firstName, session.user.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <ExecutiveApp
      identity={{
        displayName: veyvioName || outerUser.displayName,
        role: session.user.roles[0] ?? "Executive user",
        companyName: session.user.tenantName ?? "Veyvio company",
      }}
    />
  );
}
