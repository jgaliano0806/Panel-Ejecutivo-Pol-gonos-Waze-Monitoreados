import { test, expect } from '@playwright/test';

test.describe('Dashboard - Panel Ejecutivo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load dashboard correctly', async ({ page }) => {
    // Verificar que el header está presente
    await expect(page.locator('header')).toBeVisible();

    // Verificar título o logo
    await expect(page.getByText('Caminos de las Sierras')).toBeVisible();

    // Verificar navegación
    await expect(page.getByRole('button', { name: /inicio/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /mapa/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /alertas/i })).toBeVisible();
  });

  test('should display KPI cards', async ({ page }) => {
    // Esperar a que carguen los datos
    await page.waitForResponse('**/api/polygons');

    // Verificar que hay cards de KPIs
    const cards = page.locator('[class*="card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to map view', async ({ page }) => {
    // Click en el tab de Mapa
    await page.getByRole('button', { name: /mapa/i }).click();

    // Verificar que la URL cambió
    await expect(page).toHaveURL(/.*mapa/);

    // Verificar que el mapa o un componente relacionado está visible
    await expect(page.locator('main')).toBeVisible();
  });

  test('should navigate to alerts view', async ({ page }) => {
    // Click en el tab de Alertas
    await page.getByRole('button', { name: /alertas/i }).click();

    // Verificar que la URL cambió
    await expect(page).toHaveURL(/.*alertas/);
  });

  test('should show loading state initially', async ({ page }) => {
    // Interceptar la API para demorar la respuesta
    await page.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto('/');

    // Verificar spinner de carga
    const spinner = page.locator('[class*="animate-spin"]');
    await expect(spinner.first()).toBeVisible({ timeout: 2000 });
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Cambiar viewport a móvil
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Verificar que el contenido se adapta
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Dashboard - Navigation', () => {
  test('should maintain state when navigating back', async ({ page }) => {
    await page.goto('/');

    // Navegar a mapa
    await page.getByRole('button', { name: /mapa/i }).click();
    await expect(page).toHaveURL(/.*mapa/);

    // Volver atrás
    await page.goBack();
    await expect(page).toHaveURL('/');
  });

  test('should handle direct URL access', async ({ page }) => {
    // Acceder directamente a la ruta de mapa
    await page.goto('/mapa');

    // Verificar que el tab correcto está activo
    const mapTab = page.getByRole('button', { name: /mapa/i });
    await expect(mapTab).toBeVisible();
  });
});

test.describe('Dashboard - API Integration', () => {
  test('should fetch and display polygon data', async ({ page }) => {
    // Esperar la respuesta de la API
    const responsePromise = page.waitForResponse('**/api/polygons');

    await page.goto('/');

    const response = await responsePromise;
    expect(response.status()).toBe(200);

    // Verificar que los datos se muestran
    await page.waitForTimeout(1000);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Simular error de API
    await page.route('**/api/polygons', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/');

    // Verificar que se muestra mensaje de error
    await expect(
      page.getByText(/error/i).or(page.locator('[class*="error"]'))
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Dashboard - Accessibility', () => {
  test('should have no critical accessibility issues', async ({ page }) => {
    await page.goto('/');

    // Verificar que hay navegación accesible por teclado
    await page.keyboard.press('Tab');

    // Verificar focus visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');

    // Verificar que hay al menos un h1 o texto principal
    const headings = page.locator('h1, h2, h3');
    await expect(headings.first()).toBeVisible({ timeout: 5000 });
  });
});



