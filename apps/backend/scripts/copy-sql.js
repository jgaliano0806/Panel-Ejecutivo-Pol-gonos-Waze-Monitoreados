/* eslint-disable no-undef, no-console */
/**
 * Copia los archivos .sql de src/ a dist/ preservando la estructura de carpetas.
 *
 * tsc solo compila archivos .ts: los .sql quedan fuera de dist/. Sin este paso,
 * runMigrations.ts (que lee los .sql desde su __dirname = dist/database/migrations)
 * no encontraría las migraciones y las saltaría EN SILENCIO. Lo mismo aplica a
 * schema.sql y a los seeds. Se ejecuta automáticamente como "postbuild".
 */
const fs = require("fs");
const path = require("path");

const backendRoot = path.resolve(__dirname, "..");
const srcDir = path.join(backendRoot, "src");
const distDir = path.join(backendRoot, "dist");

let copied = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".sql")) {
      const rel = path.relative(srcDir, full);
      const dest = path.join(distDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(full, dest);
      copied++;
    }
  }
}

if (!fs.existsSync(srcDir)) {
  console.error(`[copy-sql] No existe el directorio src: ${srcDir}`);
  process.exit(1);
}

fs.mkdirSync(distDir, { recursive: true });
walk(srcDir);
console.log(`[copy-sql] ${copied} archivo(s) .sql copiado(s) de src/ a dist/`);
