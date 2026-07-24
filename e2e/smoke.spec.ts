import { test, expect } from "@playwright/test";

const mainNav = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Main navigation" });

async function waitForAppReady(page: import("@playwright/test").Page) {
  await expect(page.locator("main")).toContainText("WX21 FYV", { timeout: 15_000 });
}

test.describe("Veyvio Yard smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
    await waitForAppReady(page);
  });

  test("home board shows operational headline", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Depot board");
    await expect(page.getByText(/vehicles need attention|Needs attention|All vehicles accounted for/i).first()).toBeVisible();
  });

  test("brand navigation tabs are present", async ({ page }) => {
    const nav = mainNav(page);
    await expect(nav.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Checks", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Vehicles", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Yard", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "More", exact: true })).toBeVisible();
  });

  test("vehicles fleet list loads", async ({ page }) => {
    await mainNav(page).getByRole("link", { name: "Vehicles", exact: true }).click();
    await expect(page).toHaveURL(/\/yard\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "Vehicles" })).toBeVisible();
    await expect(page.getByRole("link", { name: /WX21 FYV/ })).toBeVisible();
  });

  test("checks queue loads", async ({ page }) => {
    await mainNav(page).getByRole("link", { name: "Checks", exact: true }).click();
    await expect(page).toHaveURL(/\/checks/);
    await expect(page.getByText(/Awaiting check|Check due/i).first()).toBeVisible();
  });

  test("yard map loads", async ({ page }) => {
    await mainNav(page).getByRole("link", { name: "Yard", exact: true }).click();
    await expect(page).toHaveURL(/\/yard\/map/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("BCT Main Depot");
    await expect(page.getByRole("img", { name: "Interactive depot yard map" })).toBeVisible();
  });

  test("vehicle detail and condition tab", async ({ page }) => {
    await page.goto("/yard/bct-v1");
    await expect(page).toHaveURL(/\/yard\/bct-v1/);
    await page.getByRole("link", { name: "Condition", exact: true }).click();
    await expect(page).toHaveURL(/\/condition/);
    await expect(page.getByRole("heading", { name: "Condition" })).toBeVisible();
  });

  test("damage review queue is reachable from more", async ({ page }) => {
    await mainNav(page).getByRole("link", { name: "More", exact: true }).click();
    await expect(page).toHaveURL(/\/more/);
    await page.getByRole("link", { name: "Inspections" }).click();
    await expect(page).toHaveURL(/\/inspections/);
    await page.getByRole("link", { name: /Damage review queue/i }).click();
    await expect(page).toHaveURL(/\/inspections\/damage-review/);
    await expect(page.getByRole("heading", { name: /Damage review/i })).toBeVisible();
  });

  test("sync queue page loads", async ({ page }) => {
    await mainNav(page).getByRole("link", { name: "More", exact: true }).click();
    await page.getByRole("link", { name: "Sync queue" }).click();
    await expect(page).toHaveURL(/\/more\/sync/);
    await expect(page.getByRole("heading", { name: /Sync queue/i })).toBeVisible();
  });
});
