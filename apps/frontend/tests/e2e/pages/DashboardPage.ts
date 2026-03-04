import { type Page, type Locator, expect } from "@playwright/test";

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
    await this.page.goto("/login", { waitUntil: "domcontentloaded" });

    // Realizar login
    await this.page.getByLabel(/Correo/i).fill("admin@casisa.com");
    await this.page.getByLabel(/Contraseña/i).fill("Admin123!");
    await this.page.getByRole("button", { name: /Iniciar Sesión/i }).click();

    // Esperar redirección al dashboard/mapa
    await this.page.waitForURL("**/mapa", { timeout: 10000 });

    // Esperar a que la carga inicial de red se asiente
    try {
      await this.page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {
      // Ignorar timeout de networkidle si hay polling persistente
    }
    // Asegurar que un elemento crítico sea visible
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
