import { test, expect } from "@playwright/test";

const mainNav = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Main navigation" });

async function waitForLiveYardMap(page: import("@playwright/test").Page) {
  await expect(page.getByRole("img", { name: "Interactive depot yard map" })).toBeVisible({
    timeout: 15_000,
  });
}

test.describe("Live Yard Map — BCT Main Depot", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/yard/map");
    await waitForLiveYardMap(page);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("BCT Main Depot");
    await page.waitForTimeout(500);
  });

  test("shows BCT Main Depot spatial map", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("BCT Main Depot");
    await expect(page.getByRole("img", { name: "Interactive depot yard map" })).toBeVisible();
    await expect(page.getByText("8/26 occupied")).toBeVisible();
  });

  test("map and list views toggle", async ({ page }) => {
    await page.getByRole("button", { name: "List", exact: true }).click();
    await expect(page.getByRole("list", { name: "Yard bays list view" })).toBeVisible();
    await page.getByRole("button", { name: "Map", exact: true }).click();
    await expect(page.getByRole("img", { name: "Interactive depot yard map" })).toBeVisible();
  });

  test("search filters bays on map", async ({ page }) => {
    await page.getByPlaceholder("Search registration or bay").fill("WX21");
    await expect(page.getByRole("img", { name: "Interactive depot yard map" })).toBeVisible();
  });

  test("tapping occupied bay opens vehicle drawer", async ({ page }) => {
    await page.getByRole("button", { name: "List", exact: true }).click();
    await page.locator('a[href="/yard/bct-v1"]').click();
    await expect(page).toHaveURL(/\/yard\/bct-v1/);
  });

  test("tapping empty bay shows available state", async ({ page }) => {
    await page.getByRole("button", { name: "List", exact: true }).click();
    const bay2 = page.getByRole("listitem").filter({ has: page.getByText("Bay 2", { exact: true }) });
    await expect(bay2).toContainText("Empty");
  });

  test("capacity strip shows occupancy", async ({ page }) => {
    await expect(page.getByText("8/26 occupied")).toBeVisible();
    await expect(page.getByText("Ready 4")).toBeVisible();
  });

  test("vehicles fleet shows BCT registrations", async ({ page }) => {
    await mainNav(page).getByRole("link", { name: "Vehicles", exact: true }).click();
    await expect(page).toHaveURL(/\/yard\/?$/);
    await expect(page.getByRole("link", { name: /WX21 FYV/ })).toBeVisible();
  });
});
