#!/usr/bin/env node
/**
 * Genera PDF del manual de despliegue desde el HTML.
 * Requiere: npx playwright install chromium (si no está instalado)
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const htmlPath = path.join(projectRoot, 'docs', 'MANUAL_DESPLIEGUE_SERVIDOR.html');
const pdfPath = path.join(projectRoot, 'docs', 'MANUAL_DESPLIEGUE_SERVIDOR.pdf');

if (!fs.existsSync(htmlPath)) {
  console.error('No se encuentra:', htmlPath);
  process.exit(1);
}

(async () => {
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      printBackground: true
    });
    console.log('PDF generado:', pdfPath);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
