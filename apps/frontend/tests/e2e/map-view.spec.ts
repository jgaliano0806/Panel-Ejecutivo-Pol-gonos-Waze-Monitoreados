import { test, expect } from "@playwright/test";
import { MapPage } from "./pages/MapPage";
import { setupApiMocks, seedAuthToken } from "./fixtures/api-mocks";

test.describe("Vista mapa (/mapa)", () => {
  let mapPage: MapPage;

  test.beforeEach(async ({ page }) => {
    mapPage = new MapPage(page);
    await mapPage.gotoMap();
  });

  test("carga el mapa MapLibre con sesión mockeada", async () => {
    await mapPage.expectAuthenticatedShell();
    await expect(mapPage.mapCanvas).toBeVisible();
  });

  test("mantiene la ruta /mapa tras recarga directa", async ({ page }) => {
    await expect(page).toHaveURL(/\/mapa/);
    await expect(mapPage.mapCanvas).toBeVisible();
  });
});

test.describe("Acceso protegido", () => {
  test("redirige a login sin token", async ({ page }) => {
    await page.goto("/mapa");
    await expect(page).toHaveURL(/\/login/);
  });

  test("permite /mapa con token y mocks de API", async ({ page }) => {
    await setupApiMocks(page);
    await seedAuthToken(page);
    await page.goto("/mapa", { waitUntil: "domcontentloaded" });
    await page.waitForResponse(
      (res) => res.url().includes("/api/auth/me") && res.status() === 200,
      { timeout: 15000 },
    );
    await expect(page).toHaveURL(/\/mapa/, { timeout: 10000 });
    await expect(page.locator(".maplibregl-canvas")).toBeVisible({
      timeout: 45000,
    });
  });
});
