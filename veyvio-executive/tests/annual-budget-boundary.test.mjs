import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("annual-budget mutations cross the authenticated Executive gateway", async () => {
  const proposal = await source(
    "app/api/executive/annual-budgets/proposals/route.ts",
  );
  const decision = await source(
    "app/api/executive/annual-budgets/proposals/[requestId]/decision/route.ts",
  );

  for (const route of [proposal, decision]) {
    assert.match(route, /assertSameOrigin\(request\)/u);
    assert.match(route, /getChatGPTUser\(\)/u);
    assert.match(route, /confirmActiveSession: true/u);
    assert.match(route, /getExecutiveAccessToken\(\)/u);
    assert.match(route, /context\.session\.security\.id|gateway\.session\.security\.id/u);
    assert.match(route, /fetchCommandMutation/u);
  }
  assert.match(proposal, /action: "executive\.budget\.propose"/u);
  assert.match(decision, /action: "executive\.budget\.review"/u);
  assert.match(decision, /UUID_PATTERN\.test\(requestId\)/u);
});

test("the browser only offers approval when the live projection permits it", async () => {
  const app = await source("app/ExecutiveApp.tsx");

  assert.match(app, /row\.canCurrentUserApprove/u);
  assert.match(app, /Submit for independent approval/u);
  assert.match(app, /Approve and activate/u);
  assert.match(
    app,
    /\/api\/executive\/annual-budgets\/proposals\/\$\{encodeURIComponent\(requestId\)\}\/decision/u,
  );
  assert.match(app, /different Director or Board\s+Member must approve/u);
  assert.doesNotMatch(app, /localStorage|sessionStorage/u);
});

test("budget review is a declared Executive action distinct from final approval", async () => {
  const session = await source("app/security/veyvio-session.ts");

  assert.match(session, /\| "executive\.budget\.review"/u);
  assert.match(session, /\| "executive\.budget\.approve"/u);
  assert.match(session, /X-Veyvio-Session-Id/u);
});
