import { test, expect } from "@playwright/test";

/**
 * Thin vertical slice: assert UI + that journey remains open across reloads.
 * Full prep ladder is exercised via Duty Hub; mid-journey uses DEV fixture boot
 * only for the post-boarding reload (fixture is DEV-gated — not a prod write path).
 */
test.describe("Operational journey vertical slice", () => {
  test("duty hub → prep path visible; active journey survives reload after board", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible({
      timeout: 30_000,
    });

    // Home primary CTA for next journey
    await expect(page.getByRole("link", { name: /Prepare on Duty Hub/i })).toBeVisible();

    await page.goto("/duties/duty_1");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Acknowledge|Confirm vehicle|Walkaround|Clock in|Open journey/i).first()).toBeVisible();

    // Mid-journey fixture (DEV only) — assert store survives reload
    await page.goto("/duties/duty_1/journey/active?demo=active");
    await expect(page.getByText("Active journey")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /Open navigation/i })).toBeVisible();

    await page.reload();
    await expect(page.getByText("Active journey")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("link", { name: /Open navigation/i }).click();
    await expect(page).toHaveURL(/\/nav/);

    // Arrive / pickup outcomes exist
    await page.goto("/duties/duty_1/nav/arrive");
    await expect(page.getByText(/Pickup outcome|Pick up/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Boarded", exact: true })).toBeVisible();

    // Drop-off parity
    await page.goto("/duties/duty_1/nav/dropoff");
    await expect(page.getByText(/Drop-off outcome|Drop off/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Handed over", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Authorised person absent", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Confirm drop-off/i })).toBeVisible();

    // End journey / handback path reachable
    await page.goto("/duties/duty_1/journey/end");
    await expect(page).toHaveURL(/\/journey\/end/);
  });
});
