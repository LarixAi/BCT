import { test, expect } from "@playwright/test";

const mainNav = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Main navigation" });

test.describe("Veyvio Yard smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
  });

  test("home board shows operational headline", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /vehicles need attention|All vehicles accounted for/,
    );
    await expect(page.getByText("Depot board")).toBeVisible();
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
    await expect(page.getByText(/Vehicles · \d+/)).toBeVisible();
    await expect(page.getByText("SK23 FGH")).toBeVisible();
  });

  test("checks queue loads", async ({ page }) => {
    await mainNav(page).getByRole("link", { name: "Checks", exact: true }).click();
    await expect(page).toHaveURL(/\/checks/);
    await expect(page.getByText(/Awaiting Check/)).toBeVisible();
  });

  test("yard map loads", async ({ page }) => {
    await mainNav(page).getByRole("link", { name: "Yard", exact: true }).click();
    await expect(page).toHaveURL(/\/yard\/map/);
    await expect(page.getByText("Yard Map", { exact: false })).toBeVisible();
  });

  test("vehicle detail and condition tab", async ({ page }) => {
    await mainNav(page).getByRole("link", { name: "Vehicles", exact: true }).click();
    await page.getByText("SK23 FGH").first().click();
    await expect(page).toHaveURL(/\/yard\/v1/);
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
