import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";
import { safeAppReturnPath } from "../security/auth-policy.mjs";
import { getVerifiedExecutiveSession } from "../security/veyvio-session";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Secure sign in",
  description: "Confirm your Veyvio Executive company account.",
};

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function LoginPage(props: LoginPageProps) {
  return <LoginGate searchParams={props.searchParams} />;
}

async function LoginGate({ searchParams }: LoginPageProps) {
  const parameters = await searchParams;
  const rawReturnTo = Array.isArray(parameters.return_to)
    ? parameters.return_to[0]
    : parameters.return_to;
  const returnTo = safeAppReturnPath(rawReturnTo ?? "/");
  const outerUser = await requireChatGPTUser(
    `/login?return_to=${encodeURIComponent(returnTo)}`,
  );

  const existingSession = await getVerifiedExecutiveSession(
    outerUser,
    "executive.dashboard.read",
  );
  if (existingSession) redirect(returnTo);

  return (
    <LoginForm
      returnTo={returnTo}
      switchAccountPath={chatGPTSignOutPath("/")}
    />
  );
}
