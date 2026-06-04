/**
 * Proxy de tiles para MapLibre/Leaflet (v2)
 *
 * Estrategia:
 *  A. Cache en disco  (data/tile-cache-v2/{style}/{z}/{x}/{y}.{png|jpg})
 *     → primera solicitud baja el tile de red, el resto sirve del disco.
 *     → Cache nuevo (v2) para invalidar el cache contaminado anterior.
 *  B. Rotación entre subdominios CARTO (a/b/c/d) por hash del tile
 *     → reparte la carga; si un subdominio da 429, se prueban los otros 3.
 *  C. Fallback DARK/LIGHT a ESRI World Gray Canvas (gratuito, sin API key)
 *     → solo se intenta para zoom ≤ 16 (ESRI no cubre zoom > 16).
 *     → si CARTO falla, el tile sigue siendo del color correcto.
 *  D. Validación por MAGIC BYTES, no por tamaño:
 *     → CARTO devuelve PNG transparentes legítimos de ~100B en zonas rurales.
 *     → Rechazar por tamaño los descarta y fuerza fallback inútil a ESRI.
 *     → Solo se acepta si magic bytes son PNG (89 50 4E 47) o JPEG (FF D8 FF).
 *  E. Content-Type REAL: ESRI sirve JPEG, CARTO sirve PNG.
 *     → Detectamos el formato del buffer y servimos con el MIME correcto
 *     (sino el navegador puede no renderizar bien un JPEG marcado como PNG).
 *
 * Rutas expuestas:
 *   /tiles/v2/carto-dark/:z/:x/:y.png   ← actual (frontend)
 *   /tiles/v2/carto-light/:z/:x/:y.png  ← actual (frontend, export PDF)
 *   /tiles/carto-dark/:z/:x/:y.png      ← legacy, misma lógica (seedTiles, compat)
 *   /tiles/carto-light/:z/:x/:y.png     ← legacy
 *   /tiles/osm/:z/:x/:y.png             ← OSM directo (sin fallback)
 *
 * Headers de respuesta:
 *   X-Tile-Cache:  HIT | MISS
 *   X-Tile-Source: carto-a | carto-b | … | esri-dark | esri-light | osm | cache
 *   X-Tile-Format: png | jpeg
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import axios from "axios";
import fs from "fs";
import path from "path";

// ──────────────────────────────────────────────────────────────────────────────
// Cache en disco
// ──────────────────────────────────────────────────────────────────────────────
const TILE_CACHE_DIR = path.resolve(
  process.env.TILE_CACHE_DIR || path.join(process.cwd(), "data", "tile-cache-v2"),
);

/** ESRI World_*_Gray_Base no cubre más allá de zoom 16. */
const ESRI_MAX_ZOOM = 16;

type TileFormat = "png" | "jpeg";

interface TileBuffer {
  buf: Buffer;
  format: TileFormat;
}

/** Detecta PNG/JPEG por magic bytes; null si no es ninguno. */
function detectImageFormat(buf: Buffer): TileFormat | null {
  if (buf.length < 4) return null;
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "png";
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "jpeg";
  }
  return null;
}

function mimeFor(format: TileFormat): string {
  return format === "png" ? "image/png" : "image/jpeg";
}

function extFor(format: TileFormat): string {
  return format === "png" ? "png" : "jpg";
}

function ensureDirSync(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function tilePath(style: string, z: string, x: string, y: string, ext: string): string {
  return path.join(TILE_CACHE_DIR, style, z, x, `${y}.${ext}`);
}

/**
 * Lee del cache probando ambas extensiones (.png y .jpg). El formato real se
 * detecta por magic bytes, no por la extensión del archivo.
 */
function readTileFromDisk(style: string, z: string, x: string, y: string): TileBuffer | null {
  for (const ext of ["png", "jpg"]) {
    const fp = tilePath(style, z, x, y, ext);
    if (!fs.existsSync(fp)) continue;
    try {
      const buf = fs.readFileSync(fp);
      const format = detectImageFormat(buf);
      if (format) return { buf, format };
    } catch {
      // continuar con la siguiente extensión
    }
  }
  return null;
}

function writeTileToDisk(style: string, z: string, x: string, y: string, tile: TileBuffer): void {
  const fp = tilePath(style, z, x, y, extFor(tile.format));
  try {
    ensureDirSync(fp);
    fs.writeFileSync(fp, tile.buf);
  } catch (err) {
    console.warn(`[tile-cache-v2] No se pudo escribir ${fp}:`, err);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Proveedores de tiles
// ──────────────────────────────────────────────────────────────────────────────
const CARTO_SUBDOMAINS = ["a", "b", "c", "d"] as const;
const OSM_BASE = "https://tile.openstreetmap.org";
// ESRI: orden de path es {z}/{y}/{x} (NO {z}/{x}/{y})
const ESRI_DARK_BASE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile";
const ESRI_LIGHT_BASE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile";

const TILE_HEADERS = {
  "User-Agent": "PanelWaze-CASISA/1.0 (Map Tiles Proxy)",
  Accept: "image/png,image/*,*/*",
  Referer: "https://caminosdelassierras.com.ar/",
};

interface TileCandidate {
  url: string;
  source: string;
}

/**
 * Genera la cadena de candidatos a probar en orden:
 *   1. CARTO subdominio determinístico (cache HTTP friendly: mismo tile → mismo sub)
 *   2. CARTO los otros 3 subdominios (sortea 429 puntuales)
 *   3. ESRI del color correcto (solo si z ≤ ESRI_MAX_ZOOM)
 */
function tileCandidates(style: "carto-dark" | "carto-light", z: string, x: string, y: string): TileCandidate[] {
  const variant = style === "carto-dark" ? "dark_all" : "light_all";
  const zi = parseInt(z, 10);
  const xi = parseInt(x, 10);
  const yi = parseInt(y, 10);
  const startIdx = (zi + xi + yi) % CARTO_SUBDOMAINS.length;

  const candidates: TileCandidate[] = CARTO_SUBDOMAINS.map((_, i) => {
    const sub = CARTO_SUBDOMAINS[(startIdx + i) % CARTO_SUBDOMAINS.length];
    return {
      url: `https://${sub}.basemaps.cartocdn.com/rastertiles/${variant}/${z}/${x}/${y}.png`,
      source: `carto-${sub}`,
    };
  });

  if (zi <= ESRI_MAX_ZOOM) {
    const esriBase = style === "carto-dark" ? ESRI_DARK_BASE : ESRI_LIGHT_BASE;
    candidates.push({
      url: `${esriBase}/${z}/${y}/${x}`,
      source: style === "carto-dark" ? "esri-dark" : "esri-light",
    });
  }

  return candidates;
}

async function fetchTile(url: string): Promise<TileBuffer> {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 6000,
    headers: TILE_HEADERS,
    validateStatus: (s) => s === 200,
  });
  const buf = Buffer.from(res.data);
  // Aceptamos el tile solo si los magic bytes son PNG o JPEG válido. CARTO
  // puede devolver PNGs transparentes legítimos de ~100B en zonas rurales;
  // un filtro por tamaño los descarta y fuerza fallback inútil a ESRI.
  const format = detectImageFormat(buf);
  if (!format) {
    throw new Error(`respuesta no es PNG/JPEG (${buf.length}B) en ${url}`);
  }
  return { buf, format };
}

async function fetchFromCandidates(
  candidates: TileCandidate[],
  app: FastifyInstance,
): Promise<{ tile: TileBuffer; source: string } | null> {
  for (const cand of candidates) {
    try {
      const tile = await fetchTile(cand.url);
      return { tile, source: cand.source };
    } catch (err) {
      app.log.debug({ url: cand.url, err: (err as Error).message }, "tile candidate failed");
    }
  }
  return null;
}

function sendTile(reply: FastifyReply, tile: TileBuffer, source: string): void {
  reply
    .header("Content-Type", mimeFor(tile.format))
    .header("Cache-Control", "public, max-age=2592000, immutable") // 30 días
    .header("Access-Control-Allow-Origin", "*")
    .header("Cross-Origin-Resource-Policy", "cross-origin")
    .header("X-Tile-Cache", source === "cache" ? "HIT" : "MISS")
    .header("X-Tile-Source", source)
    .header("X-Tile-Format", tile.format)
    .send(tile.buf);
}

// ──────────────────────────────────────────────────────────────────────────────
// Handler común carto-dark / carto-light
// ──────────────────────────────────────────────────────────────────────────────
async function serveCartoTile(
  reply: FastifyReply,
  style: "carto-dark" | "carto-light",
  z: string,
  x: string,
  y: string,
  app: FastifyInstance,
): Promise<void> {
  const cached = readTileFromDisk(style, z, x, y);
  if (cached) {
    return sendTile(reply, cached, "cache");
  }

  const candidates = tileCandidates(style, z, x, y);
  const result = await fetchFromCandidates(candidates, app);

  if (!result) {
    app.log.warn({ style, z, x, y, tried: candidates.length }, "Todos los candidatos de tile fallaron");
    reply.status(502).send();
    return;
  }

  setImmediate(() => writeTileToDisk(style, z, x, y, result.tile));
  sendTile(reply, result.tile, result.source);
}

// ──────────────────────────────────────────────────────────────────────────────
// Rutas
// ──────────────────────────────────────────────────────────────────────────────
async function tileProxyRoutes(app: FastifyInstance) {
  const tileRouteOpts = { config: { rateLimit: false as const } };

  app.log.info({ TILE_CACHE_DIR }, "📦 Tile disk-cache v2 activo");

  type TileParams = { Params: { z: string; x: string; y: string } };

  // Handlers reutilizables (rutas v2 nuevas + legacy)
  const darkHandler = (req: FastifyRequest<TileParams>, reply: FastifyReply) =>
    serveCartoTile(reply, "carto-dark", req.params.z, req.params.x, req.params.y, app);

  const lightHandler = (req: FastifyRequest<TileParams>, reply: FastifyReply) =>
    serveCartoTile(reply, "carto-light", req.params.z, req.params.x, req.params.y, app);

  // v2 (recomendado para frontend nuevo)
  app.get("/tiles/v2/carto-dark/:z/:x/:y.png", tileRouteOpts, darkHandler);
  app.get("/tiles/v2/carto-light/:z/:x/:y.png", tileRouteOpts, lightHandler);

  // Legacy (mantenido para clientes con build viejo / seedTiles / nginx)
  app.get("/tiles/carto-dark/:z/:x/:y.png", tileRouteOpts, darkHandler);
  app.get("/tiles/carto-light/:z/:x/:y.png", tileRouteOpts, lightHandler);

  // OSM directo (sin fallback)
  app.get(
    "/tiles/osm/:z/:x/:y.png",
    tileRouteOpts,
    async (req: FastifyRequest<TileParams>, reply: FastifyReply) => {
      const { z, x, y } = req.params;
      const cached = readTileFromDisk("osm", z, x, y);
      if (cached) return sendTile(reply, cached, "cache");
      try {
        const tile = await fetchTile(`${OSM_BASE}/${z}/${x}/${y}.png`);
        setImmediate(() => writeTileToDisk("osm", z, x, y, tile));
        sendTile(reply, tile, "osm");
      } catch (err) {
        app.log.warn({ z, x, y, err: (err as Error).message }, "Tile proxy error (osm)");
        reply.status(502).send();
      }
    },
  );
}

export default tileProxyRoutes;
