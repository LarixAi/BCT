import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("the Executive server re-authorises every central session for a declared action", async () => {
  const session = await source("app/security/veyvio-session.ts");
  assert.match(
    session,
    /\/executive\/authorisation\?action=\$\{encodeURIComponent\(action\)\}/u,
  );
  assert.match(session, /authorisation\.companyId !== access\.companyId/u);
  assert.match(
    session,
    /authorisation\.membershipId !== access\.membershipId/u,
  );
});

test("the gateway refuses callers that omit an Executive action", async () => {
  const gateway = await source("app/security/executive-gateway.ts");
  assert.match(gateway, /action: ExecutiveAction;/u);
  assert.doesNotMatch(
    gateway,
    /options:\s*\{[^}]*action\?:\s*ExecutiveAction/su,
  );
});

test("each current Executive endpoint declares its precise action", async () => {
  const routes = [
    [
      "app/api/executive/session/route.ts",
      'action: "executive.session.read"',
    ],
    [
      "app/api/executive/session/confirm/route.ts",
      'action: "executive.session.confirm"',
    ],
    [
      "app/api/executive/annual-budgets/proposals/route.ts",
      'action: "executive.budget.propose"',
    ],
    [
      "app/api/executive/annual-budgets/proposals/[requestId]/decision/route.ts",
      'action: "executive.budget.review"',
    ],
    ["app/page.tsx", '"executive.dashboard.read"'],
  ];

  for (const [path, expected] of routes) {
    assert.match(await source(path), new RegExp(expected.replaceAll(".", "\\."), "u"));
  }
});
