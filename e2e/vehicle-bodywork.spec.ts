import { test, expect } from "@playwright/test";

async function waitForAppReady(page: import("@playwright/test").Page) {
  await expect(page.locator("main")).toContainText("WX21 FYV", { timeout: 15_000 });
}

test.describe("Vehicle Bodywork fleet system", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
    await waitForAppReady(page);
  });

  test("fleet dashboard lists all depot vehicles", async ({ page }) => {
    await page.goto("/vehicle-bodywork");
    await expect(page.getByRole("heading", { name: "Vehicle Bodywork" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Report new damage" })).toBeVisible();
    await expect(page.getByText("WX21 FYV")).toBeVisible();
  });

  test("vehicle bodywork profile opens from fleet list", async ({ page }) => {
    await page.goto("/vehicle-bodywork");
    await page.getByRole("link", { name: "View bodywork" }).first().click();
    await expect(page.getByRole("link", { name: /Report new damage/i })).toBeVisible();
    await expect(page.getByText("Bodywork condition summary")).toBeVisible();
  });

  test("old driver bodywork route redirects to fleet page", async ({ page }) => {
    await page.goto("/more/bodywork");
    await expect(page).toHaveURL(/\/vehicle-bodywork/);
    await expect(page.getByRole("heading", { name: "Vehicle Bodywork" })).toBeVisible();
  });
});
