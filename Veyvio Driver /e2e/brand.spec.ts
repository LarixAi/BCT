import { test, expect } from "@playwright/test";

const mainNav = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Main navigation" });

test.describe("Veyvio Driver brand on phone", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(mainNav(page)).toBeVisible({ timeout: 30_000 });
  });

  test("home hub shows wordmark and primary driver tabs", async ({ page }) => {
    await expect(page.getByText("VEYVIO").first()).toBeVisible();
    await expect(page.getByText("DRIVER", { exact: true }).first()).toBeVisible();

    const nav = mainNav(page);
    await expect(nav.getByRole("link", { name: /Home/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Duties/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Checks/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Messages/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /More/i })).toBeVisible();
  });

  test("home leads with operational headline not generic welcome", async ({ page }) => {
    const heading = page.getByRole("main").getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).not.toContainText(/Good morning|Welcome back/i);
    await expect(heading).toContainText(/Vehicle check|Walkaround|duty|journey/i);
  });

  test("active bottom nav tab uses driver blue accent", async ({ page }) => {
    const homeTab = mainNav(page).getByRole("link", { name: /Home/i });
    const color = await homeTab.evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe("rgb(47, 107, 255)");
  });

  test("bottom nav hides on focused settings detail", async ({ page }) => {
    await mainNav(page).getByRole("link", { name: /More/i }).click();
    await expect(page).toHaveURL(/\/more/);
    await expect(mainNav(page)).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: /^Account$/i }).click();
    await expect(page).toHaveURL(/\/more\/account/);
    await expect(mainNav(page)).toHaveCount(0);
    await page.getByRole("link", { name: /^Security$/i }).click();
    await expect(page).toHaveURL(/\/more\/security/);
    await expect(mainNav(page)).toHaveCount(0);
  });

  test("work-blocking action uses midnight primary button", async ({ page }) => {
    const action = page
      .getByRole("main")
      .locator("li")
      .filter({ hasText: "Vehicle check overdue" })
      .getByRole("link", { name: /Start vehicle check/i });
    await expect(action).toBeVisible();
    const bg = await action.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe("rgb(11, 21, 38)");
  });

  test("duties tab opens workspace hub with navigation still visible", async ({ page }) => {
    await mainNav(page).getByRole("link", { name: /Duties/i }).click();
    await expect(page).toHaveURL(/\/trips/);
    await expect(mainNav(page)).toBeVisible();
    await expect(mainNav(page).getByRole("link", { name: /Duties/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("home map opens duties workspace", async ({ page }) => {
    await page.getByRole("link", { name: /open duties/i }).first().click();
    await expect(page).toHaveURL(/\/trips/);
    await expect(mainNav(page).getByRole("link", { name: /Duties/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("trip detail shows full route start to end", async ({ page }) => {
    await page.goto("/trips/asgn_school_am");
    await expect(page).toHaveURL(/\/trips\/asgn_school_am/);
    await expect(mainNav(page)).toHaveCount(0);
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1, name: /School Route 104/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(main.getByTestId("trip-full-route")).toBeVisible({ timeout: 10_000 });
    await expect(main.getByText("Job information")).toBeVisible();
    await expect(main.getByTestId("trip-full-route").getByText("Start to end")).toBeVisible();
    await expect(main.getByTestId("trip-full-route").getByText("Oak Lane").first()).toBeVisible();
    await expect(main.getByTestId("trip-full-route").getByText(/St Mark/i)).toBeVisible();
  });

  test("about page shows branded wordmark on midnight", async ({ page }) => {
    await mainNav(page).getByRole("link", { name: /More/i }).click();
    await page.getByRole("main").getByRole("link", { name: /About Veyvio Driver/i }).click();
    await expect(page).toHaveURL(/\/more\/about/);
    await expect(mainNav(page)).toHaveCount(0);
    await expect(page.getByRole("main").getByText("VEYVIO").first()).toBeVisible();
    await expect(page.getByText("Move smarter. Operate safer.")).toBeVisible();
  });

  test("public splash shows driver campaign line", async ({ page, context }) => {
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto("/splash");
    await expect(page.getByText("Know your vehicle before you move.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("VEYVIO")).toBeVisible();
  });

  test("open journey wizard shows blocked state when walkaround incomplete", async ({ page }) => {
    await page.goto("/duties/duty_1/journey/open");
    await expect(page.getByRole("heading", { name: "Journey cannot open yet" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Pre-use walkaround incomplete")).toBeVisible();
    await expect(page.getByRole("link", { name: /Start walkaround/i })).toBeVisible();
    await expect(mainNav(page)).toHaveCount(0);
  });

  test("check result shows ready for service after nil defects", async ({ page }) => {
    await page.goto("/checks/result?demo=ready");
    await expect(page.getByRole("heading", { name: /Vehicle ready for service/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("link", { name: /Open journey/i })).toBeVisible();
    await expect(mainNav(page)).toHaveCount(0);
  });

  test("active journey and navigation pages render when duty in progress", async ({ page }) => {
    await page.goto("/duties/duty_1/journey/active?demo=active");
    await expect(page.getByText("Active journey")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /Open navigation/i })).toBeVisible();
    await page.getByRole("link", { name: /Open navigation/i }).click();
    await expect(page).toHaveURL(/\/nav/);
    await expect(page.getByText(/Calculating road route|On route/i)).toBeVisible();
    await expect(mainNav(page)).toHaveCount(0);
  });
});

test.describe("Welcome, onboarding, and trip exceptions", () => {
  test("welcome step 1 shows operational onboarding copy", async ({ page }) => {
    await page.goto("/welcome/1");
    await expect(page.getByRole("heading", { name: /Start every duty with confidence/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: /Continue/i })).toBeVisible();
  });

  test("driver onboarding step 1 shows duty board preview", async ({ page }) => {
    await page.goto("/onboarding/1");
    await expect(
      page.getByRole("heading", { name: /See what needs doing before you move/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("onboarding-continue")).toBeVisible();
  });

  test("trip history page lists completed records", async ({ page }) => {
    await page.goto("/trips/history");
    await expect(page.getByTestId("trips-history-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Trip history" })).toBeVisible();
    await expect(page.getByText("School Morning Run")).toBeVisible();
    await expect(mainNav(page)).toHaveCount(0);
  });

  test("trip changed page shows operations update", async ({ page }) => {
    await page.goto("/trips/changed/asgn_transfer");
    await expect(page.getByTestId("trip-changed-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Updated by Operations")).toBeVisible();
    await expect(page.getByText("Pickup time")).toBeVisible();
  });

  test("cancelled trip page shows reason", async ({ page }) => {
    await page.goto("/trips/cancelled/asgn_school_pm");
    await expect(page.getByTestId("trip-cancelled-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Trip cancelled")).toBeVisible();
    await expect(page.getByText(/inset day/i)).toBeVisible();
  });
});
