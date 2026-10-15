/**
 * Proxy de tiles para MapLibre/Leaflet (v2)
 *
 * Estrategia:
 *  A. Cache en disco  (data/tile-cache-v2/{style}/{z}/{x}/{y}.{png|jpg})
 *  B. CARTO con ?key= si CARTO_API_KEY está configurada
 *  C. Sin API key: ESRI primero (evita watermark "API KEY REQUIRED")
 *  D. Rechazo de tiles CARTO con watermark + fallback a siguiente candidato
 *  E. Validación por magic bytes PNG/JPEG
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import axios from "axios";
import fs from "fs";
import path from "path";
import {
  getCartoApiKey,
  OSM_BASE,
  TILE_FETCH_HEADERS,
  detectImageFormat,
  isCartoWatermarkTile,
  parseTileBuffer,
  tileCandidates,
  type CartoRasterStyle,
  type TileBuffer,
  type TileFormat,
} from "../services/tileProviders";

const TILE_CACHE_DIR = path.resolve(
  process.env.TILE_CACHE_DIR || path.join(process.cwd(), "data", "tile-cache-v2"),
);

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

function readTileFromDisk(
  style: string,
  z: string,
  x: string,
  y: string,
): TileBuffer | null {
  for (const ext of ["png", "jpg"]) {
    const fp = tilePath(style, z, x, y, ext);
    if (!fs.existsSync(fp)) continue;
    try {
      const buf = fs.readFileSync(fp);
      const format = detectImageFormat(buf);
      if (!format) continue;
      if (format === "png" && isCartoWatermarkTile(buf)) {
        fs.unlinkSync(fp);
        continue;
      }
      return { buf, format };
    } catch {
      // continuar con la siguiente extensión
    }
  }
  return null;
}

function writeTileToDisk(
  style: string,
  z: string,
  x: string,
  y: string,
  tile: TileBuffer,
): void {
  const fp = tilePath(style, z, x, y, extFor(tile.format));
  try {
    ensureDirSync(fp);
    fs.writeFileSync(fp, tile.buf);
  } catch (err) {
    console.warn(`[tile-cache-v2] No se pudo escribir ${fp}:`, err);
  }
}

async function fetchTile(url: string): Promise<TileBuffer> {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 6000,
    headers: TILE_FETCH_HEADERS,
    validateStatus: (s) => s === 200,
  });
  return parseTileBuffer(Buffer.from(res.data));
}

async function fetchFromCandidates(
  candidates: { url: string; source: string }[],
  app: FastifyInstance,
): Promise<{ tile: TileBuffer; source: string } | null> {
  for (const cand of candidates) {
    try {
      const tile = await fetchTile(cand.url);
      return { tile, source: cand.source };
    } catch (err) {
      app.log.debug(
        { url: cand.url, err: (err as Error).message },
        "tile candidate failed",
      );
    }
  }
  return null;
}

function sendTile(reply: FastifyReply, tile: TileBuffer, source: string): void {
  reply
    .header("Content-Type", mimeFor(tile.format))
    .header("Cache-Control", "public, max-age=2592000, immutable")
    .header("Access-Control-Allow-Origin", "*")
    .header("Cross-Origin-Resource-Policy", "cross-origin")
    .header("X-Tile-Cache", source === "cache" ? "HIT" : "MISS")
    .header("X-Tile-Source", source)
    .header("X-Tile-Format", tile.format)
    .send(tile.buf);
}

async function serveCartoTile(
  reply: FastifyReply,
  style: CartoRasterStyle,
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
    app.log.warn(
      { style, z, x, y, tried: candidates.length },
      "Todos los candidatos de tile fallaron",
    );
    reply.status(502).send();
    return;
  }

  setImmediate(() => writeTileToDisk(style, z, x, y, result.tile));
  sendTile(reply, result.tile, result.source);
}

async function tileProxyRoutes(app: FastifyInstance) {
  const tileRouteOpts = { config: { rateLimit: false as const } };

  app.log.info(
    {
      TILE_CACHE_DIR,
      cartoApiKey: getCartoApiKey() ? "configured" : "missing (ESRI first)",
    },
    "📦 Tile disk-cache v2 activo",
  );

  type TileParams = { Params: { z: string; x: string; y: string } };

  const darkHandler = (req: FastifyRequest<TileParams>, reply: FastifyReply) =>
    serveCartoTile(reply, "carto-dark", req.params.z, req.params.x, req.params.y, app);

  const lightHandler = (req: FastifyRequest<TileParams>, reply: FastifyReply) =>
    serveCartoTile(reply, "carto-light", req.params.z, req.params.x, req.params.y, app);

  app.get("/tiles/v2/carto-dark/:z/:x/:y.png", tileRouteOpts, darkHandler);
  app.get("/tiles/v2/carto-light/:z/:x/:y.png", tileRouteOpts, lightHandler);
  app.get("/tiles/carto-dark/:z/:x/:y.png", tileRouteOpts, darkHandler);
  app.get("/tiles/carto-light/:z/:x/:y.png", tileRouteOpts, lightHandler);

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
