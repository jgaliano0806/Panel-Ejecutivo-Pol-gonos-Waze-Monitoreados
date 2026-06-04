import { type Page, type Locator, expect } from "@playwright/test";
import { setupApiMocks, seedAuthToken } from "../fixtures/api-mocks";

export class MapPage {
  readonly page: Page;
  readonly mapCanvas: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mapCanvas = page.locator(".maplibregl-canvas");
  }

  async gotoMap() {
    await setupApiMocks(this.page);
    await seedAuthToken(this.page);
    await this.page.goto("/mapa", { waitUntil: "domcontentloaded" });

    await this.page.waitForResponse(
      (res) => res.url().includes("/api/auth/me") && res.status() === 200,
      { timeout: 15000 },
    ).catch(() => undefined);

    try {
      await this.page.waitForLoadState("networkidle", { timeout: 8000 });
    } catch {
      // Polling o tiles pueden impedir networkidle
    }

    await expect(this.mapCanvas).toBeVisible({ timeout: 45000 });
  }

  async expectAuthenticatedShell() {
    await expect(this.page.locator("main")).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: /mapa/i }).first(),
    ).toBeVisible();
  }
}
