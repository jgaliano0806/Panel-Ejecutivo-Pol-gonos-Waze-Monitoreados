#!/usr/bin/env node
/**
 * Copia los PDFs ISO generados a la carpeta G.E.D del servidor de archivos.
 * Uso: npm run docs:iso-publish
 */
const fs = require('fs');
const path = require('path');

const isoDir = path.join(__dirname, '..', 'docs', 'iso9001');
const destDir = process.env.ISO_PDF_DEST || 'Z:\\G.E.D\\Panel Waze\\iso9001';

const PDF_FILES = [
  'MANUAL_SGC_ISO9001.pdf',
  'MANUAL_USUARIO.pdf',
  'MANUAL_PROCESOS.pdf',
  'INSTRUCTIVOS_PROCESOS.pdf',
  'REGISTROS_PROCESOS.pdf',
];

if (!fs.existsSync(destDir)) {
  console.error('Destino no accesible:', destDir);
  console.error('Defina ISO_PDF_DEST si la ruta es distinta.');
  process.exit(1);
}

let copied = 0;
for (const file of PDF_FILES) {
  const src = path.join(isoDir, file);
  const dest = path.join(destDir, file);
  if (!fs.existsSync(src)) {
    console.warn('No se encuentra:', src);
    continue;
  }
  fs.copyFileSync(src, dest);
  const size = fs.statSync(dest).size;
  console.log(`Copiado: ${file} (${size} bytes)`);
  copied++;
}

console.log(`\n${copied} PDF(s) publicados en ${destDir}`);
