import { test, expect } from "@playwright/test";
import { HeatmapPage } from "./pages/HeatmapPage";
import {
  setupApiMocks,
  seedAuthToken,
  MOCK_ACCIDENTS,
} from "./fixtures/api-mocks";
import { HEATMAP_RETURN_VIEW_KEY } from "../../src/lib/heatmapReturnView";

test.describe("Mapa de calor (/siniestros/heatmap)", () => {
  let heatmap: HeatmapPage;

  test.beforeEach(async ({ page }) => {
    heatmap = new HeatmapPage(page);
    await heatmap.gotoHeatmap();
  });

  test("carga shell, mapa MapLibre y conteo de siniestros", async () => {
    await heatmap.expectShell();
    await expect(heatmap.mapCanvas).toBeVisible();
    await expect(
      heatmap.page.getByRole("status").filter({ hasText: /siniestros/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("permite filtrar gravedad hasta dejar todas desactivadas", async () => {
    const buckets = ["Grave", "Moderado", "Leve", "Sin datos"];
    for (const label of buckets) {
      await heatmap.page.getByRole("button", { name: new RegExp(label, "i") }).click();
    }
    await expect(
      heatmap.page.getByRole("status").filter({ hasText: /0\s*\/\s*\d+/ }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("vuelve al listado desde el header", async ({ page }) => {
    await heatmap.backToList.click();
    await expect(page).toHaveURL(/\/siniestros\/?$/);
  });
});

test.describe("Integración listado ↔ heatmap ↔ detalle", () => {
  test("CTA desde /siniestros abre el heatmap", async ({ page }) => {
    await setupApiMocks(page);
    await seedAuthToken(page);
    await page.goto("/siniestros", { waitUntil: "domcontentloaded" });
    await page
      .waitForResponse(
        (res) => res.url().includes("/api/auth/me") && res.status() === 200,
        { timeout: 15000 },
      )
      .catch(() => undefined);

    await page
      .getByRole("button", { name: /abrir mapa de calor de incidentes/i })
      .click();
    await expect(page).toHaveURL(/\/siniestros\/heatmap/);
    await expect(page.locator(".maplibregl-canvas")).toBeVisible({
      timeout: 45000,
    });
  });

  test("deep-link al detalle con from=heatmap muestra volver y restaura vista", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await seedAuthToken(page);

    const view = {
      lng: -64.1888,
      lat: -31.4201,
      zoom: 15,
      bearing: 0,
      pitch: 0,
      dateFrom: "2025-01-01T03:00:00.000Z",
      dateTo: "2026-12-31T02:59:59.999Z",
      activeBuckets: ["grave", "moderado", "leve", "desconocido"],
      accidentId: MOCK_ACCIDENTS[0].id,
      savedAt: Date.now(),
    };

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ({ key, payload, token }) => {
        localStorage.setItem("panel_waze_auth_token", token);
        sessionStorage.setItem(key, JSON.stringify(payload));
      },
      {
        key: HEATMAP_RETURN_VIEW_KEY,
        payload: view,
        token: "e2e-mock-token-abc123",
      },
    );

    await page.goto(
      `/siniestros?accident=${MOCK_ACCIDENTS[0].id}&from=heatmap`,
      { waitUntil: "domcontentloaded" },
    );

    await expect(
      page.getByRole("button", { name: /volver al mapa de calor/i }),
    ).toBeVisible({ timeout: 20000 });

    await page.getByRole("button", { name: /volver al mapa de calor/i }).click();
    await expect(page).toHaveURL(/\/siniestros\/heatmap/);
    await expect(page).toHaveURL(/restore=1/);
    await expect(page.locator(".maplibregl-canvas")).toBeVisible({
      timeout: 45000,
    });
    await expect(
      page.getByRole("heading", { name: /mapa de calor de incidentes/i }),
    ).toBeVisible();
  });

  test("ruta heatmap sin sesión redirige a login", async ({ page }) => {
    await page.goto("/siniestros/heatmap");
    await expect(page).toHaveURL(/\/login/);
  });
});
