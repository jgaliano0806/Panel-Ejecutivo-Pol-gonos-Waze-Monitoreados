import { type Page, type Locator, expect } from "@playwright/test";
import { setupApiMocks, seedAuthToken } from "../fixtures/api-mocks";

export class HeatmapPage {
  readonly page: Page;
  readonly mapCanvas: Locator;
  readonly title: Locator;
  readonly severityLegend: Locator;
  readonly updateButton: Locator;
  readonly backToList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mapCanvas = page.locator(".maplibregl-canvas");
    this.title = page.getByRole("heading", {
      name: /mapa de calor de incidentes/i,
    });
    this.severityLegend = page.getByText("Gravedad", { exact: true });
    this.updateButton = page.getByRole("button", {
      name: /actualizar mapa de calor/i,
    });
    this.backToList = page.getByRole("button", {
      name: /volver al listado de siniestros/i,
    });
  }

  async gotoHeatmap(path = "/siniestros/heatmap") {
    await setupApiMocks(this.page);
    await seedAuthToken(this.page);
    await this.page.goto(path, { waitUntil: "domcontentloaded" });

    await this.page
      .waitForResponse(
        (res) => res.url().includes("/api/auth/me") && res.status() === 200,
        { timeout: 15000 },
      )
      .catch(() => undefined);

    await this.page
      .waitForResponse(
        (res) =>
          res.url().includes("/api/accidents") &&
          !res.url().match(/\/accidents\/[^?/]+/) &&
          res.status() === 200,
        { timeout: 20000 },
      )
      .catch(() => undefined);

    await expect(this.mapCanvas).toBeVisible({ timeout: 45000 });
  }

  async expectShell() {
    await expect(this.title).toBeVisible();
    await expect(this.severityLegend).toBeVisible();
    await expect(this.updateButton).toBeVisible();
  }
}
