import { expect, test } from "@playwright/test";
import { hasPilotCredentials } from "./helpers/driver-pilot-auth";

/**
 * Lightweight mobile viewport smoke. Full authenticated shell coverage is in
 * `gate1-device-exit-api.mjs` (shared Android/iOS backend path).
 */
test.describe("Gate 1 driver device exit (mobile web)", () => {
  test.skip(!hasPilotCredentials(), "Set VEYVIO_PILOT_* and VEYVIO_ANON_KEY for live device exit");

  test("auth screen accepts pilot email flow (UI login entry)", async ({ page }) => {
    const email = process.env.VEYVIO_PILOT_EMAIL ?? "";
    await page.goto("/auth");
    await page.getByPlaceholder("Phone number or email").fill(email);
    await page.getByRole("button", { name: "Continue with email" }).click();
    await expect(page.getByRole("heading", { name: "Enter your password" })).toBeVisible();
    await expect(page.getByText(`Signing in as ${email}`)).toBeVisible();
  });
});
