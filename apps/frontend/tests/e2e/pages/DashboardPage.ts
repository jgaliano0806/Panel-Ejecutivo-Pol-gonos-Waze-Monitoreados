import { type Page, type Locator, expect } from "@playwright/test";

// ===== Mock Data =====
const MOCK_USER = {
  id: 1,
  email: "admin@casisa.com",
  firstName: "Admin",
  lastName: "CASISA",
  phone: null,
  isActive: true,
  emailVerified: true,
  lastLogin: new Date().toISOString(),
  mustChangePassword: false,
  avatarUrl: null,
  roles: [{ id: 1, name: "Administrador", color: "#22c55e" }],
  permissions: ["admin"],
};

const MOCK_TOKEN = "e2e-mock-token-abc123";

const MOCK_WAZE_ALERTS = [
  {
    uuid: "mock-alert-1",
    type: "ACCIDENT",
    subtype: "ACCIDENT_MAJOR",
    street: "Colectora",
    latitude: -31.4135,
    longitude: -64.1811,
    reliability: 8,
    confidence: 7,
    reportCount: 5,
    polygonName: "APC",
  },
  {
    uuid: "mock-alert-2",
    type: "JAM",
    subtype: "JAM_HEAVY_TRAFFIC",
    street: "Autopista Córdoba-Rosario",
    latitude: -31.42,
    longitude: -64.19,
    reliability: 9,
    confidence: 8,
    reportCount: 3,
    polygonName: "APC",
  },
];

/**
 * Configura interceptores de red para mockear TODAS las llamadas a /api/*
 * Esto permite que los tests E2E funcionen sin backend real en CI.
 */
async function setupApiMocks(page: Page) {
  // Mock: POST /api/auth/login
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { token: MOCK_TOKEN, user: MOCK_USER },
      }),
    });
  });

  // Mock: GET /api/auth/me
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_USER }),
    });
  });

  // Mock: GET /api/polygons/*
  await page.route("**/api/polygons/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          alerts: MOCK_WAZE_ALERTS,
          jams: [],
          irregularities: [],
          analyses: MOCK_WAZE_ALERTS.map((a) => ({
            incident: { type: a.type, subtype: a.subtype, street: a.street },
            polygonName: a.polygonName,
            reportCount: a.reportCount,
          })),
        },
      }),
    });
  });

  // Catchall: cualquier otra ruta /api/* → respuesta vacía exitosa
  await page.route("**/api/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  // Mock WebSocket upgrade attempts (evitar errores de conexión)
  await page.route("**/socket.io/**", async (route) => {
    await route.fulfill({ status: 200, body: "" });
  });
}

export class DashboardPage {
  readonly page: Page;
  readonly incidentsHeader: Locator;
  readonly chartTitle: Locator;
  readonly mapCanvas: Locator;
  readonly searchInput: Locator;
  readonly historyToggle: Locator;
  readonly activeLayersPanel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.incidentsHeader = page.getByText("Listado de Eventos");
    this.chartTitle = page.getByText("Tramos más afectados");
    this.mapCanvas = page.locator(".maplibregl-canvas");
    this.searchInput = page.getByRole("textbox", { name: /buscar|search/i });
    this.historyToggle = page.getByText(/histórico|history/i).first();
    this.activeLayersPanel = page.getByText("Capas Activas");
  }

  async goto() {
    // 1. Interceptar TODAS las llamadas a la API con mocks
    await setupApiMocks(this.page);

    // 2. Pre-setear token en localStorage para que ProtectedRoute nos deje pasar
    await this.page.goto("/login", { waitUntil: "domcontentloaded" });
    await this.page.evaluate((token) => {
      localStorage.setItem("panel_waze_auth_token", token);
    }, MOCK_TOKEN);

    // 3. Navegar al dashboard/mapa
    await this.page.goto("/mapa", { waitUntil: "domcontentloaded" });

    // 4. Esperar a que la carga inicial de red se asiente
    try {
      await this.page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {
      // Ignorar timeout de networkidle si hay polling persistente
    }

    // 5. Asegurar que un elemento crítico sea visible
    await expect(this.chartTitle).toBeVisible({ timeout: 20000 });
  }

  async selectChartBar(streetName: string) {
    // Recharts usa elementos path, buscamos por el atributo name
    const bar = this.page.locator(`path[name="${streetName}"]`).first();
    await expect(bar).toBeVisible();
    await bar.click();
  }

  async verifyModalOpen(streetName: string) {
    await expect(
      this.page.getByText(`Inspección Geográfica: ${streetName}`),
    ).toBeVisible();
    await expect(this.mapCanvas).toBeVisible();
    await expect(this.activeLayersPanel).toBeVisible();
  }

  async closeModal() {
    // Intentar cerrar con botón o escape
    const closeBtn = this.page.locator('button[aria-label="Close"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await this.page.keyboard.press("Escape");
    }
  }

  async toggleHistory() {
    await expect(this.historyToggle).toBeVisible();
    await this.historyToggle.click();
    // Esperar pequeña transición o recarga
    await this.page.waitForTimeout(500);
  }

  async search(term: string) {
    await expect(this.searchInput).toBeVisible();
    await this.searchInput.fill(term);
  }

  async expectNoResults() {
    await expect(
      this.page.getByText(/no (hay|se encontraron)|sin resultados/i),
    ).toBeVisible();
  }
}
