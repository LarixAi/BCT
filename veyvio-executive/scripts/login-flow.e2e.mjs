/**
 * Executive login e2e — proves the sign-in screen posts JSON via fetch,
 * survives autofill without React change events, and never navigates the
 * browser to /api/auth/login (Forbidden).
 *
 * Requires: VEYVIO_EXECUTIVE_LOCAL_DEMO=1 npm run dev (port 3000 by default)
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(
  pathToFileURL(
    new URL("../../package.json", import.meta.url).pathname,
  ).href,
);
const { chromium } = require("playwright");

const BASE =
  process.env.VEYVIO_EXECUTIVE_E2E_BASE_URL?.replace(/\/$/u, "") ||
  "http://localhost:3000";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  // --- 1) API URL must redirect to /login, not Forbidden ---
  const apiGet = await page.request.get(`${BASE}/api/auth/login`, {
    maxRedirects: 0,
  });
  assert.equal(
    apiGet.status(),
    303,
    `GET /api/auth/login should redirect, got ${apiGet.status()}`,
  );
  assert.match(apiGet.headers().location ?? "", /\/login/);

  // --- 2) Autofill path: set DOM values without input events ---
  /** @type {Array<{ contentType: string, postData: string }>} */
  let loginBodies = [];
  await page.route("**/api/auth/login", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      loginBodies.push({
        contentType: request.headers()["content-type"] ?? "",
        postData: request.postData() ?? "",
      });
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          code: "invalid_credentials",
          message: "The email address or password could not be verified.",
        }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('main[data-auth-ready="1"]', { timeout: 20_000 });
  await page.waitForSelector('button:has-text("Continue securely"):not([disabled])');

  // Simulate Brave/password-manager autofill without React onChange.
  await page.locator('input[name="email"]').evaluate((el) => {
    el.value = "veyvio@outlook.com";
  });
  await page.locator('input[name="password"]').evaluate((el) => {
    el.value = "Password123!";
  });

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/login") &&
      response.request().method() === "POST",
    { timeout: 15_000 },
  );
  await page.getByRole("button", { name: "Continue securely" }).click();
  await responsePromise;

  assert.equal(loginBodies.length, 1, "login fetch must fire once");
  assert.match(
    loginBodies[0].contentType,
    /application\/json/i,
    "login must use JSON, not form navigation",
  );
  const payload = JSON.parse(loginBodies[0].postData);
  assert.equal(payload.email, "veyvio@outlook.com");
  assert.equal(payload.password, "Password123!");

  await page.waitForSelector('[role="alert"]');
  const alertText = await page.locator('[role="alert"]').innerText();
  assert.match(alertText, /could not be verified/i);

  assert.match(page.url(), /\/login/, "must remain on /login");
  assert.doesNotMatch(
    page.url(),
    /\/api\/auth\/login/,
    "must never navigate the document to the API URL",
  );

  // --- 3) Successful MFA challenge advances the UI ---
  loginBodies = [];
  await page.unroute("**/api/auth/login");
  await page.route("**/api/auth/login", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    loginBodies.push({
      contentType: route.request().headers()["content-type"] ?? "",
      postData: route.request().postData() ?? "",
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        state: "mfa_required",
        memberships: [
          {
            companyId: "11111111-1111-4111-8111-111111111111",
            tenantName: "Isolation A Transport",
            role: "company_owner",
          },
        ],
      }),
    });
  });

  await page.locator('input[name="email"]').fill("owner@veyvio.test");
  await page.locator('input[name="password"]').fill("Password123!");
  const mfaResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/login") &&
      response.request().method() === "POST",
    { timeout: 15_000 },
  );
  await page.getByRole("button", { name: "Continue securely" }).click();
  await mfaResponsePromise;

  await page.waitForSelector("text=Enter your verification code");
  assert.match(page.url(), /\/login/);
  assert.equal(loginBodies.length, 1);

  console.log("login-flow.e2e: ok");
} catch (error) {
  console.error("login-flow.e2e: FAILED");
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
