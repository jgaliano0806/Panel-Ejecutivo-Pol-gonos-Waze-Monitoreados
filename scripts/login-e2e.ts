/**
 * Script de login E2E con captura de consola y red.
 * Ejecutar: npx tsx scripts/login-e2e.ts
 */
import { chromium } from 'playwright';

const BASE_URL = 'http://10.1.0.136:5180';
const EMAIL = 'jgaliano@camsierras.com.ar';
const PASSWORD = 'Password10!';

const consoleLogs: string[] = [];
const failedRequests: { url: string; error: string }[] = [];
const apiResponses: { url: string; status: number }[] = [];

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capturar consola del navegador
  page.on('console', (msg) => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(text);
    console.log('CONSOLE:', text);
  });

  // Capturar peticiones fallidas
  page.on('requestfailed', (req) => {
    const entry = { url: req.url(), error: req.failure()?.errorText || 'unknown' };
    failedRequests.push(entry);
    console.log('REQUEST FAILED:', entry.url, entry.error);
  });

  // Capturar respuestas de /api
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api/')) {
      apiResponses.push({ url, status: res.status() });
      if (res.status() >= 400) {
        console.log('API ERROR:', res.status(), url);
      }
    }
  });

  console.log('\n=== Navegando a', `${BASE_URL}/login`, '===\n');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

  console.log('\n=== Rellenando credenciales ===\n');
  await page.fill('#login-email', EMAIL);
  await page.fill('#login-password', PASSWORD);

  console.log('\n=== Enviando formulario ===\n');
  await page.click('button[type="submit"]');

  // Esperar redirección o mensaje de error
  await page.waitForTimeout(5000);

  const url = page.url();
  const hasError = await page.locator('[class*="red-500"], [class*="error"]').isVisible().catch(() => false);
  const errorText = hasError ? await page.locator('p.text-red-300').textContent().catch(() => null) : null;

  console.log('\n=== RESULTADO ===');
  console.log('URL final:', url);
  if (errorText) console.log('Error en UI:', errorText);
  console.log('\n--- Consola del navegador ---');
  consoleLogs.forEach((l) => console.log(l));
  console.log('\n--- Peticiones fallidas ---');
  failedRequests.forEach((r) => console.log(r.url, r.error));
  console.log('\n--- Respuestas API ---');
  apiResponses.forEach((r) => console.log(r.status, r.url));

  await page.waitForTimeout(2000);
  await browser.close();
}

main().catch(console.error);
