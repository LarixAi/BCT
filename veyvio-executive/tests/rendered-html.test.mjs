import assert from "node:assert/strict";
import test from "node:test";

async function request(path = "/", init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, {
      redirect: "manual",
      ...init,
      headers: { accept: "text/html", ...(init.headers ?? {}) },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("anonymous requests receive no Executive HTML", async () => {
  const response = await request("/");
  assert.ok([307, 308].includes(response.status));
  assert.match(response.headers.get("cache-control") ?? "", /private/u);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/u);
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("cloudflare-cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("surrogate-control"), "no-store");
  assert.match(
    response.headers.get("x-veyvio-request-id") ?? "",
    /^[0-9a-f-]{36}$/u,
  );
  assert.match(
    response.headers.get("location") ?? "",
    /\/signin-with-chatgpt\?return_to=%2F$/u,
  );
  const html = await response.text();
  assert.doesNotMatch(html, /Good afternoon|Budget &amp; authority/i);
});

test("the Executive API is a private gateway and forged outer identity is insufficient", async () => {
  const response = await request("/api/executive/session", {
    headers: {
      accept: "application/json",
      "oai-authenticated-user-email": "attacker@example.test",
      "x-veyvio-request-id": "attacker-controlled-request-id",
    },
  });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("cloudflare-cdn-cache-control"), "no-store");
  assert.notEqual(
    response.headers.get("x-veyvio-request-id"),
    "attacker-controlled-request-id",
  );
  const payload = await response.json();
  assert.equal(payload.ok, false);
  assert.equal(payload.code, "executive_session_required");
  assert.doesNotMatch(JSON.stringify(payload), /companyId|membershipId|accessToken/u);
});

test("active-session confirmation is same-origin and denies a missing company session", async () => {
  const response = await request("/api/executive/session/confirm", {
    method: "POST",
    headers: {
      accept: "application/json",
      origin: "http://localhost",
      "oai-authenticated-user-email": "owner@example.test",
    },
  });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
  const payload = await response.json();
  assert.equal(payload.code, "executive_session_required");
});

test("a forged identity header alone cannot render Executive", async () => {
  const response = await request("/", {
    headers: {
      "oai-authenticated-user-email": "attacker@example.test",
    },
  });
  assert.ok([307, 308].includes(response.status));
  assert.match(response.headers.get("location") ?? "", /\/login\?return_to=%2F$/u);
  const html = await response.text();
  assert.doesNotMatch(html, /Good afternoon|Budget &amp; authority/i);
});

test("the company sign-in page still requires the outer workspace identity", async () => {
  const response = await request("/login");
  assert.ok([307, 308].includes(response.status));
  assert.match(
    response.headers.get("location") ?? "",
    /\/signin-with-chatgpt/u,
  );
});

test("workspace users receive the Veyvio company verification page", async () => {
  const response = await request("/login?return_to=https://evil.example", {
    headers: {
      "oai-authenticated-user-email": "owner@example.test",
      "oai-authenticated-user-full-name": "Company%20Owner",
      "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
    },
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Veyvio Executive/i);
  assert.match(html, /Confirm your Executive account/i);
  assert.match(html, /No public Executive signup/i);
  assert.doesNotMatch(html, /owner@example\.test/i);
  assert.match(html, /\\"returnTo\\":\\"\/\\"/u);
  assert.doesNotMatch(html, /\\"returnTo\\":\\"https:\/\/evil\.example/u);
  assert.doesNotMatch(html, /Good afternoon|Budget &amp; authority/i);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("sign-out clears the server session and uses a safe return path", async () => {
  const response = await request("/api/auth/logout", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: "http://localhost",
      "oai-authenticated-user-email": "owner@example.test",
      cookie:
        "__Host-veyvio-executive-access=fake-access; __Host-veyvio-executive-refresh=fake-refresh; __Host-veyvio-executive-binding=fake-binding",
    },
    body: "return_to=https%3A%2F%2Fevil.example",
  });
  assert.equal(response.status, 303);
  assert.match(
    response.headers.get("location") ?? "",
    /\/signout-with-chatgpt\?return_to=%2F$/u,
  );
  assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=0/u);
});
