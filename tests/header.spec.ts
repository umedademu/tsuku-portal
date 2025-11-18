import { test, expect } from "@playwright/test";

test("ヘッダーのSNSアイコンが表示される", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "無料診断開始" })).toBeVisible();

  const instagram = page.locator(".header-social-links i.fa-instagram");
  const tiktok = page.locator(".header-social-links i.fa-tiktok");
  const line = page.locator(".header-social-links i.fa-line");

  await expect(instagram).toBeVisible();
  await expect(tiktok).toBeVisible();
  await expect(line).toBeVisible();

  const screenshot = await page.screenshot({ fullPage: false });
  await test.info().attach("header", { body: screenshot, contentType: "image/png" });
});
