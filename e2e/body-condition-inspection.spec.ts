import { test, expect } from "@playwright/test";

const mainNav = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Main navigation" });

async function waitForAppReady(page: import("@playwright/test").Page) {
  await expect(page.locator("main")).toContainText("WX21 FYV", { timeout: 15_000 });
}


test.describe("Body condition inspection flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
    await waitForAppReady(page);
  });

  test("vehicle condition tab shows body status and start inspection", async ({ page }) => {
    await page.goto("/yard/bct-v1/condition");
    await expect(page.getByRole("heading", { name: "Condition" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Start inspection|Start body inspection/i })).toBeVisible();
  });

  test("guided inspection wizard completes end-to-end", async ({ page }) => {
    await page.goto("/yard/bct-v1/condition/inspect");
    await expect(page.getByRole("button", { name: /Begin guided capture/i })).toBeVisible({ timeout: 15_000 });

    await page.getByPlaceholder("Odometer reading").fill("45230");
    await page.getByRole("button", { name: /Begin guided capture/i }).click();

    for (let i = 0; i < 30; i++) {
      if (await page.getByRole("heading", { name: /Mark observations/i }).isVisible().catch(() => false)) {
        break;
      }
      const skipOrNext = page.getByRole("button", { name: /^(Skip|Next)$/i }).first();
      if (await skipOrNext.isVisible().catch(() => false)) {
        await skipOrNext.click();
      } else {
        break;
      }
    }

    await expect(page.getByRole("heading", { name: /Mark observations/i })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /Continue to review/i }).click();
    await expect(page.getByRole("heading", { name: /Review & submit/i })).toBeVisible();
    await page.getByRole("button", { name: /Sign & submit inspection/i }).click();
    await expect(page).toHaveURL(/\/condition/, { timeout: 10_000 });
  });

  test("damage review queue is reachable", async ({ page }) => {
    await mainNav(page).getByRole("link", { name: "More", exact: true }).click();
    await page.getByRole("link", { name: /Inspections Damage review/i }).click();
    await page.getByRole("link", { name: /Damage review queue/i }).click();
    await expect(page.getByRole("heading", { name: /Damage review/i })).toBeVisible();
  });

  test("condition analytics dashboard loads", async ({ page }) => {
    await page.goto("/inspections/analytics");
    await expect(page.getByRole("heading", { name: /Condition analytics|Depot condition/i })).toBeVisible();
  });
});
