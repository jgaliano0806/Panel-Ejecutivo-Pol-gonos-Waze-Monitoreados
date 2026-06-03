/**
 * Proxy de tiles para MapLibre/Leaflet
 *
 * Estrategia:
 *  A. Cache en disco  (tiles/cache/{style}/{z}/{x}/{y}.png)
 *     → primera solicitud baja el tile de red, el resto sirve del disco sin latencia.
 *     → TTL de 30 días gestionado por el script de limpieza (o manualmente).
 *  B. Rotación entre subdominios CARTO (a/b/c/d) por hash determinístico del tile
 *     → reparte la carga y minimiza rate-limits (429) en `a.basemaps.cartocdn.com`.
 *  C. Fallback DARK / LIGHT a ESRI World Gray Canvas (gratuito, sin API key)
 *     → si CARTO falla, el tile sigue siendo del color correcto y NO se mezclan
 *     tiles claros sobre el mapa dark (ni viceversa).
 *
 * En producción (serve) no hay proxy de Vite, así que el backend hace proxy
 * a CARTO/ESRI/OSM.
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import axios from "axios";
import fs from "fs";
import path from "path";

// ──────────────────────────────────────────────────────────────────────────────
// Cache en disco
// ──────────────────────────────────────────────────────────────────────────────
const TILE_CACHE_DIR = path.resolve(
  process.env.TILE_CACHE_DIR || path.join(process.cwd(), "data", "tile-cache"),
);

/** Asegura que el directorio de un archivo existe antes de escribir. */
function ensureDirSync(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Ruta en disco para un tile. */
function tilePath(style: string, z: string, x: string, y: string): string {
  return path.join(TILE_CACHE_DIR, style, z, x, `${y}.png`);
}

/** Lee un tile del disco; devuelve null si no existe. */
function readTileFromDisk(style: string, z: string, x: string, y: string): Buffer | null {
  const fp = tilePath(style, z, x, y);
  try {
    return fs.existsSync(fp) ? fs.readFileSync(fp) : null;
  } catch {
    return null;
  }
}

/** Escribe un tile en disco de forma no bloqueante. */
function writeTileToDisk(style: string, z: string, x: string, y: string, buf: Buffer): void {
  const fp = tilePath(style, z, x, y);
  try {
    ensureDirSync(fp);
    fs.writeFileSync(fp, buf);
  } catch (err) {
    // No crítico: si no puede escribir, el tile seguirá sirviendo desde red
    console.warn(`[tile-cache] No se pudo escribir ${fp}:`, err);
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

/**
 * Selecciona subdominio CARTO a/b/c/d de forma determinística por tile.
 * Mismo tile → mismo subdominio → caches HTTP/proxy funcionan correctamente.
 */
function pickCartoSubdomain(z: string, x: string, y: string): string {
  const idx =
    (parseInt(z, 10) + parseInt(x, 10) + parseInt(y, 10)) %
    CARTO_SUBDOMAINS.length;
  return CARTO_SUBDOMAINS[idx];
}

async function fetchTile(url: string): Promise<Buffer> {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 6000,
    headers: TILE_HEADERS,
    validateStatus: (s) => s === 200,
  });
  return Buffer.from(res.data);
}

/**
 * Aplica headers CORS abiertos a las respuestas de tiles.
 * X-Tile-Cache indica si el tile vino del disco (HIT) o de red (MISS).
 */
function sendTile(reply: FastifyReply, buf: Buffer, fromCache: boolean): void {
  reply
    .header("Content-Type", "image/png")
    .header("Cache-Control", "public, max-age=2592000, immutable") // 30 días
    .header("Access-Control-Allow-Origin", "*")
    .header("Cross-Origin-Resource-Policy", "cross-origin")
    .header("X-Tile-Cache", fromCache ? "HIT" : "MISS")
    .send(buf);
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper genérico: sirve un tile con cache-aside
// ──────────────────────────────────────────────────────────────────────────────
async function serveTile(
  reply: FastifyReply,
  style: string,
  z: string,
  x: string,
  y: string,
  primaryUrl: string,
  fallbackUrl: string,
  app: FastifyInstance,
): Promise<void> {
  // 1. Cache hit → responder desde disco inmediatamente
  const cached = readTileFromDisk(style, z, x, y);
  if (cached) {
    return sendTile(reply, cached, true);
  }

  // 2. Cache miss → bajar de red con fallback
  try {
    let buf: Buffer;
    try {
      buf = await fetchTile(primaryUrl);
    } catch {
      app.log.warn({ primaryUrl }, `${style} fallback to secondary source`);
      buf = await fetchTile(fallbackUrl);
    }
    // Guardar en disco (async, no bloquea la respuesta)
    setImmediate(() => writeTileToDisk(style, z, x, y, buf));
    sendTile(reply, buf, false);
  } catch (err) {
    app.log.warn({ primaryUrl, fallbackUrl, err }, "Tile proxy error");
    reply.status(502).send();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Rutas
// ──────────────────────────────────────────────────────────────────────────────
async function tileProxyRoutes(app: FastifyInstance) {
  const tileRouteOpts = { config: { rateLimit: false as const } };

  // Log del directorio de cache al arrancar
  app.log.info({ TILE_CACHE_DIR }, "📦 Tile disk-cache activo");

  // CARTO Dark → fallback ESRI Dark Gray
  app.get(
    "/tiles/carto-dark/:z/:x/:y.png",
    tileRouteOpts,
    async (
      req: FastifyRequest<{ Params: { z: string; x: string; y: string } }>,
      reply: FastifyReply,
    ) => {
      const { z, x, y } = req.params;
      const sub = pickCartoSubdomain(z, x, y);
      const cartoUrl = `https://${sub}.basemaps.cartocdn.com/rastertiles/dark_all/${z}/${x}/${y}.png`;
      const esriUrl = `${ESRI_DARK_BASE}/${z}/${y}/${x}`;
      return serveTile(reply, "carto-dark", z, x, y, cartoUrl, esriUrl, app);
    },
  );

  // CARTO Light → fallback ESRI Light Gray
  app.get(
    "/tiles/carto-light/:z/:x/:y.png",
    tileRouteOpts,
    async (
      req: FastifyRequest<{ Params: { z: string; x: string; y: string } }>,
      reply: FastifyReply,
    ) => {
      const { z, x, y } = req.params;
      const sub = pickCartoSubdomain(z, x, y);
      const cartoUrl = `https://${sub}.basemaps.cartocdn.com/rastertiles/light_all/${z}/${x}/${y}.png`;
      const esriUrl = `${ESRI_LIGHT_BASE}/${z}/${y}/${x}`;
      return serveTile(reply, "carto-light", z, x, y, cartoUrl, esriUrl, app);
    },
  );

  // OSM
  app.get(
    "/tiles/osm/:z/:x/:y.png",
    tileRouteOpts,
    async (
      req: FastifyRequest<{ Params: { z: string; x: string; y: string } }>,
      reply: FastifyReply,
    ) => {
      const { z, x, y } = req.params;
      const osmUrl = `${OSM_BASE}/${z}/${x}/${y}.png`;
      const cached = readTileFromDisk("osm", z, x, y);
      if (cached) return sendTile(reply, cached, true);
      try {
        const buf = await fetchTile(osmUrl);
        setImmediate(() => writeTileToDisk("osm", z, x, y, buf));
        sendTile(reply, buf, false);
      } catch (err) {
        app.log.warn({ osmUrl, err }, "Tile proxy error (osm)");
        reply.status(502).send();
      }
    },
  );
}

export default tileProxyRoutes;
