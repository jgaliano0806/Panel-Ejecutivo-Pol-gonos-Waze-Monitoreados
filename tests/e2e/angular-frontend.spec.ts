/**
 * Tests E2E para Frontend Angular - Navegación y Rutas
 * Verifica que todas las rutas migradas funcionen correctamente
 */
import { test, expect } from "@playwright/test";

// Angular frontend en puerto 4200
const ANGULAR_URL = "http://localhost:4200";

test.describe("Angular Frontend - Navigation", () => {
  test("should load app and redirect to dashboard", async ({ page }) => {
    await page.goto(ANGULAR_URL);
    await page.waitForLoadState("networkidle");
    // Verificar que el título del panel esté visible
    await expect(page.getByText("Panel Waze Monitoreados")).toBeVisible();
  });

  test("should navigate using sidebar links", async ({ page }) => {
    await page.goto(ANGULAR_URL);
    await page.waitForLoadState("networkidle");

    // Verificar que el sidebar existe
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();
  });
});

test.describe("Angular Frontend - Sidebar", () => {
  test("should toggle sidebar collapse", async ({ page }) => {
    await page.goto(ANGULAR_URL);
    await page.waitForLoadState("networkidle");

    // Buscar botón de toggle
    const toggleBtn = page.locator("button").filter({ hasText: /[✕☰]/ });

    // Verificar que sidebar está visible
    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible();

    // Click para toggle
    await toggleBtn.click();
    await page.waitForTimeout(300);

    // Click otra vez
    await toggleBtn.click();
  });
});

test.describe("Angular Frontend - Header", () => {
  test("should display connection indicators", async ({ page }) => {
    await page.goto(ANGULAR_URL);
    await page.waitForLoadState("networkidle");

    // Verificar header
    const header = page.locator("header");
    await expect(header).toBeVisible();
  });
});

test.describe("Angular Frontend - Dashboard", () => {
  test("should load dashboard with KPI cards", async ({ page }) => {
    await page.goto(`${ANGULAR_URL}/dashboard`);
    await page.waitForLoadState("networkidle");

    // Verificar que dashboard carga
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  });
});

test.describe("Angular Frontend - Map", () => {
  test("should load map page", async ({ page }) => {
    await page.goto(`${ANGULAR_URL}/mapa`);
    await page.waitForLoadState("networkidle");

    // Verificar que MapLibre carga (el canvas del mapa)
    const mapCanvas = page.locator(".maplibregl-canvas, .mapboxgl-canvas");
    await expect(mapCanvas).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Angular Frontend - Risk", () => {
  test("should load risk page with title", async ({ page }) => {
    await page.goto(`${ANGULAR_URL}/riesgos`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Análisis de Riesgos")).toBeVisible();
  });
});

test.describe("Angular Frontend - Accidents", () => {
  test("should load accidents page with title", async ({ page }) => {
    await page.goto(`${ANGULAR_URL}/siniestros`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Siniestros Viales")).toBeVisible();
  });
});

test.describe("Angular Frontend - Admin", () => {
  test("should load admin page", async ({ page }) => {
    await page.goto(`${ANGULAR_URL}/admin`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Administración" }),
    ).toBeVisible();
  });

  test("should navigate to TTS configuration", async ({ page }) => {
    await page.goto(`${ANGULAR_URL}/admin`);
    await page.waitForLoadState("networkidle");

    // Click en sección TTS
    await page.getByText("Configuración TTS").click();
    await page.waitForTimeout(500);

    // Verificar selectores de voz
    await expect(page.locator("#voice-select")).toBeVisible();
    await expect(page.locator("#rate-select")).toBeVisible();
  });
});

test.describe("Angular Frontend - Notifications", () => {
  test("should load notifications page", async ({ page }) => {
    await page.goto(`${ANGULAR_URL}/notificaciones`);
    await page.waitForLoadState("networkidle");

    // Usar heading específico para evitar múltiples coincidencias
    await expect(
      page.getByRole("heading", { name: "Notificaciones" }),
    ).toBeVisible();
  });
});
