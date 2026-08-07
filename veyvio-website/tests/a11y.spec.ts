import { test, expect } from "@playwright/test";

const keyPages = [
  "/",
  "/demo",
  "/platform",
  "/trust",
  "/legal/privacy",
  "/resources/guides",
];

for (const path of keyPages) {
  test(`a11y basics: ${path}`, async ({ page }) => {
    await page.goto(path);

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeAttached();

    const focused = page.locator(":focus-visible");
    await page.keyboard.press("Tab");
    await expect(focused).toBeVisible();
  });
}

test("demo form has labelled inputs", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByLabel("Work email")).toBeVisible();
  await expect(page.getByRole("checkbox")).toBeVisible();
});

test("cookie banner can be dismissed", async ({ page }) => {
  await page.goto("/");
  const accept = page.getByRole("button", { name: "Accept analytics" });
  if (await accept.isVisible()) {
    await accept.click();
    await expect(accept).not.toBeVisible();
  }
});
