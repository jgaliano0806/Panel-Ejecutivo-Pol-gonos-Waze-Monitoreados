#!/usr/bin/env node
/**
 * 🌎 Pre-seeder de tiles para la Provincia de Córdoba
 *
 * Descarga tiles de CARTO Dark y CARTO Light para toda la provincia
 * en zoom 10-17 (zoom 17 solo para Córdoba Capital).
 *
 * USO:
 *   npx ts-node apps/backend/src/scripts/seedTiles.ts
 *   # o compilado:
 *   node apps/backend/dist/scripts/seedTiles.js
 *
 * Variables de entorno:
 *   TILE_CACHE_DIR  — directorio donde guardar los tiles (default: ./data/tile-cache)
 *   STYLES          — estilos a bajar (default: carto-dark,carto-light)
 *   MIN_ZOOM        — zoom mínimo (default: 10)
 *   MAX_ZOOM        — zoom máximo (default: 17)
 *   CONCURRENCY     — peticiones paralelas (default: 4, máx recomendado: 6)
 */

import axios from "axios";
import fs from "fs";
import path from "path";

// ──────────────────────────────────────────────────────────────────────────────
// Configuración
// ──────────────────────────────────────────────────────────────────────────────

const TILE_CACHE_DIR = path.resolve(
  process.env.TILE_CACHE_DIR || path.join(process.cwd(), "data", "tile-cache-v2"),
);

// Por defecto solo dark (tema en uso). Para ambos: STYLES=carto-dark,carto-light
const STYLES_RAW = process.env.STYLES || "carto-dark";
const STYLES = STYLES_RAW.split(",").map((s) => s.trim());

const MIN_ZOOM = parseInt(process.env.MIN_ZOOM || "10", 10);
const MAX_ZOOM = parseInt(process.env.MAX_ZOOM || "17", 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "4", 10);

// Opcional: agregar un overview de toda la provincia en zoom bajo (z10-12).
// Apagado por defecto (la provincia rural a z13+ explota en cantidad de tiles).
// Activar con PROVINCIA_OVERVIEW=1 si se necesita ver el mapa al alejar mucho.
const PROVINCIA_OVERVIEW =
  process.env.PROVINCIA_OVERVIEW === "1" ||
  process.env.PROVINCIA_OVERVIEW === "true";

// ──────────────────────────────────────────────────────────────────────────────
// Bounding boxes (lat/lng)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Provincia de Córdoba completa
 * Zoom 10-14: todo el territorio
 * Zoom 15+: solo Córdoba Capital (mucho más manejable)
 */
const BBOX_PROVINCIA = {
  north: -29.0,
  south: -35.0,
  west:  -66.5,
  east:  -62.5,
};

/** Córdoba Capital (radio ~35km alrededor del centro) */
const BBOX_CAPITAL = {
  north: -31.0,
  south: -31.85,
  west:  -64.6,
  east:  -63.8,
};

/**
 * Polígonos monitoreados específicos (ajustar si se conocen los centros exactos)
 * bbox generado como centro ± 0.1° (~11km)
 */
const BBOX_MONITORED = [
  // Autopista Córdoba - Rosario (Circunvalación Norte)
  { north: -31.32, south: -31.42, west: -64.28, east: -64.08 },
  // Autopista a Buenos Aires (zona sur)
  { north: -31.48, south: -31.68, west: -64.30, east: -64.10 },
  // Ruta 9 Norte (hacia Jesús María)
  { north: -31.02, south: -31.20, west: -64.20, east: -64.00 },
];

// ──────────────────────────────────────────────────────────────────────────────
// Conversión lat/lng ↔ tile XY
// ──────────────────────────────────────────────────────────────────────────────

function lon2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat: number, zoom: number): number {
  return Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, zoom),
  );
}

interface BBox {
  north: number;
  south: number;
  west: number;
  east: number;
}

function getTileRange(bbox: BBox, zoom: number): { xMin: number; xMax: number; yMin: number; yMax: number } {
  return {
    xMin: lon2tile(bbox.west, zoom),
    xMax: lon2tile(bbox.east, zoom),
    yMin: lat2tile(bbox.north, zoom), // norte → y pequeño
    yMax: lat2tile(bbox.south, zoom), // sur   → y grande
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Lista de tiles a descargar (deduplicados)
// ──────────────────────────────────────────────────────────────────────────────

interface TileJob {
  style: string;
  z: number;
  x: number;
  y: number;
}

function generateJobs(): TileJob[] {
  const seen = new Set<string>();
  const jobs: TileJob[] = [];

  for (const style of STYLES) {
    for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
      // Escalonado para mantener el caché acotado al área que realmente se navega:
      //   Zoom 10-15: Córdoba Capital (metro completo)
      //   Zoom 16-17: solo corredores monitoreados (autopistas)
      // Se omite la provincia rural: capital@z16-17 sola ya son ~150k tiles.
      // Overview opcional de toda la provincia en zoom bajo (PROVINCIA_OVERVIEW=1).
      const overview: BBox[] =
        PROVINCIA_OVERVIEW && z <= 12 ? [BBOX_PROVINCIA] : [];
      const bboxes: BBox[] = [
        ...overview,
        ...(z <= 15 ? [BBOX_CAPITAL] : [...BBOX_MONITORED]),
      ];

      for (const bbox of bboxes) {
        const { xMin, xMax, yMin, yMax } = getTileRange(bbox, z);
        for (let x = xMin; x <= xMax; x++) {
          for (let y = yMin; y <= yMax; y++) {
            const key = `${style}/${z}/${x}/${y}`;
            if (!seen.has(key)) {
              seen.add(key);
              jobs.push({ style, z, x, y });
            }
          }
        }
      }
    }
  }

  return jobs;
}

// ──────────────────────────────────────────────────────────────────────────────
// Descarga de un tile
// ──────────────────────────────────────────────────────────────────────────────

const CARTO_SUBDOMAINS = ["a", "b", "c", "d"] as const;

// ESRI World Gray Canvas como fallback (gratuito, sin API key). Ojo: el orden
// del path es {z}/{y}/{x}, NO {z}/{x}/{y} (igual que en tileProxy.routes.ts).
const ESRI_DARK =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile";
const ESRI_LIGHT =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile";

/**
 * URLs candidatas para un tile, en orden de preferencia. Empieza por el
 * subdominio CARTO determinístico, rota por los otros 3 (reparte carga y
 * sortea 429), y cierra con ESRI del color correcto para no dejar el tile sin
 * bajar. Para OSM solo hay una fuente.
 */
function tileUrlCandidates(style: string, z: number, x: number, y: number): string[] {
  if (style === "osm") {
    return [`https://tile.openstreetmap.org/${z}/${x}/${y}.png`];
  }
  const variant = style === "carto-light" ? "light_all" : "dark_all";
  const startIdx = (z + x + y) % CARTO_SUBDOMAINS.length;
  const cartoUrls = CARTO_SUBDOMAINS.map((_, i) => {
    const sub = CARTO_SUBDOMAINS[(startIdx + i) % CARTO_SUBDOMAINS.length];
    return `https://${sub}.basemaps.cartocdn.com/rastertiles/${variant}/${z}/${x}/${y}.png`;
  });
  const esriBase = style === "carto-light" ? ESRI_LIGHT : ESRI_DARK;
  return [...cartoUrls, `${esriBase}/${z}/${y}/${x}`];
}

function tileFilePath(style: string, z: number, x: number, y: number): string {
  return path.join(TILE_CACHE_DIR, style, String(z), String(x), `${y}.png`);
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 8000,
    headers: {
      "User-Agent": "PanelWaze-CASISA/1.0 (Tile Pre-Seeder)",
      Accept: "image/png,image/*",
      Referer: "https://caminosdelassierras.com.ar/",
    },
    validateStatus: (s) => s === 200,
  });
  return Buffer.from(res.data);
}

async function downloadTile(job: TileJob): Promise<"hit" | "ok" | "error"> {
  const fp = tileFilePath(job.style, job.z, job.x, job.y);

  // Ya existe en cache → skip
  if (fs.existsSync(fp)) return "hit";

  // Prueba cada candidato (4 subdominios CARTO + ESRI) hasta que uno responda 200.
  // Así un 429/404 puntual no deja el tile sin bajar (que luego saldría blanco).
  const candidates = tileUrlCandidates(job.style, job.z, job.x, job.y);
  for (const url of candidates) {
    try {
      const buf = await fetchBuffer(url);
      const dir = path.dirname(fp);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fp, buf);
      return "ok";
    } catch {
      // Probar el siguiente candidato
    }
  }
  return "error";
}

// ──────────────────────────────────────────────────────────────────────────────
// Ejecutor con concurrencia controlada
// ──────────────────────────────────────────────────────────────────────────────

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, idx: number) => Promise<void>,
): Promise<void> {
  let idx = 0;

  async function worker(): Promise<void> {
    while (idx < items.length) {
      const current = idx++;
      await fn(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("🗺️  Tile Pre-Seeder — Provincia de Córdoba");
  console.log(`📁 Cache: ${TILE_CACHE_DIR}`);
  console.log(`🎨 Estilos: ${STYLES.join(", ")}`);
  console.log(`🔍 Zoom: ${MIN_ZOOM} → ${MAX_ZOOM}`);
  console.log(`⚡ Concurrencia: ${CONCURRENCY}`);
  console.log("");

  const jobs = generateJobs();
  const total = jobs.length;
  console.log(`📊 Total de tiles a procesar: ${total.toLocaleString()}`);
  console.log("");

  let done = 0;
  let hits = 0;
  let downloaded = 0;
  let errors = 0;
  const startTime = Date.now();

  await runWithConcurrency(jobs, CONCURRENCY, async (job, i) => {
    const result = await downloadTile(job);
    done++;
    if (result === "hit") hits++;
    else if (result === "ok") downloaded++;
    else errors++;

    // Progreso cada 100 tiles
    if (done % 100 === 0 || done === total) {
      const pct = ((done / total) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const rate = (done / ((Date.now() - startTime) / 1000)).toFixed(0);
      process.stdout.write(
        `\r  ${pct}% (${done.toLocaleString()}/${total.toLocaleString()}) | ✅ ${downloaded} nuevos | ⚡ ${hits} del caché | ❌ ${errors} errores | ${rate} tiles/s | ${elapsed}s`,
      );
    }

    // Pausa cada 50 tiles para no saturar la CDN
    if (i > 0 && i % 50 === 0) {
      await new Promise((r) => setTimeout(r, 200));
    }
  });

  console.log("\n");
  console.log("─".repeat(60));
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ Completado en ${elapsed}s`);
  console.log(`   📥 Nuevos tiles descargados: ${downloaded}`);
  console.log(`   ⚡ Ya estaban en caché:       ${hits}`);
  console.log(`   ❌ Errores:                   ${errors}`);

  const sizeBytes = await getDirSize(TILE_CACHE_DIR);
  console.log(`   💾 Tamaño total del caché:   ${(sizeBytes / 1024 / 1024).toFixed(1)} MB`);
}

async function getDirSize(dir: string): Promise<number> {
  if (!fs.existsSync(dir)) return 0;
  let size = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      size += await getDirSize(fp);
    } else {
      size += fs.statSync(fp).size;
    }
  }
  return size;
}

main().catch((err) => {
  console.error("💥 Error fatal:", err);
  process.exit(1);
});
