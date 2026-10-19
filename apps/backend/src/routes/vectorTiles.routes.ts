/**
 * Proxy del mapa base vectorial CARTO (Dark Matter / Positron).
 *
 * Rutas:
 *   GET /tiles/vector/style/:name.json              estilo reescrito (dark-matter | positron)
 *   GET /tiles/vector/mvt/:z/:x/:y.mvt              tiles vectoriales (maxzoom 14)
 *   GET /tiles/vector/fonts/:fontstack/:range       glifos (.pbf)
 *   GET /tiles/vector/sprite/:name/:file            sprites (sprite[@2x].json|png)
 *
 * Cache en disco: {TILE_CACHE_DIR}/vector/...
 * Si CARTO falla y hay copia vieja en disco, se sirve esa.
 */
import { FastifyInstance, FastifyReply } from "fastify";
import axios from "axios";
import fs from "fs";
import path from "path";
import { TILE_FETCH_HEADERS } from "../services/tileProviders";
import {
  isValidGlyphRange,
  isValidSpriteFile,
  isVectorStyleName,
  resolveFontstack,
  rewriteStyle,
  upstreamFontUrl,
  upstreamMvtUrl,
  upstreamSpriteUrl,
  upstreamStyleUrl,
  type VectorStyleName,
} from "../services/vectorBasemap";

const CACHE_ROOT = path.join(
  path.resolve(
    process.env.TILE_CACHE_DIR || path.join(process.cwd(), "data", "tile-cache-v2"),
  ),
  "vector",
);

const DAY_MS = 24 * 60 * 60 * 1000;
const STYLE_TTL_MS = DAY_MS;
const MVT_TTL_MS = 7 * DAY_MS;

type FetchResult =
  | { kind: "ok"; buf: Buffer; source: "cache" | "network" | "stale" }
  | { kind: "empty" };

function readFresh(file: string, ttlMs: number | null): Buffer | null {
  try {
    const st = fs.statSync(file);
    if (ttlMs !== null && Date.now() - st.mtimeMs > ttlMs) return null;
    return fs.readFileSync(file);
  } catch {
    return null;
  }
}

function readAny(file: string): Buffer | null {
  try {
    return fs.readFileSync(file);
  } catch {
    return null;
  }
}

function writeCache(file: string, buf: Buffer): void {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buf);
  } catch (err) {
    console.warn(`[vector-cache] No se pudo escribir ${file}:`, err);
  }
}

/**
 * Cache en disco + red. 404 upstream = tile vacío (no se cachea).
 * Error de red = copia vieja si existe, si no se propaga el error.
 */
async function cachedFetch(
  cacheFile: string,
  url: string,
  ttlMs: number | null,
  transform?: (buf: Buffer) => Buffer,
): Promise<FetchResult> {
  const fresh = readFresh(cacheFile, ttlMs);
  if (fresh) return { kind: "ok", buf: fresh, source: "cache" };

  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 8000,
      headers: TILE_FETCH_HEADERS,
      validateStatus: (s) => s === 200 || s === 404,
    });
    if (res.status === 404) return { kind: "empty" };
    let buf = Buffer.from(res.data);
    if (transform) buf = transform(buf);
    writeCache(cacheFile, buf);
    return { kind: "ok", buf, source: "network" };
  } catch (err) {
    const stale = readAny(cacheFile);
    if (stale) return { kind: "ok", buf: stale, source: "stale" };
    throw err;
  }
}

function send(
  reply: FastifyReply,
  result: FetchResult,
  contentType: string,
  cacheControl: string,
): FastifyReply {
  // Se devuelve el reply: en handlers async, Fastify debe esperar al envío
  // asíncrono de @fastify/compress (si no, responde con cuerpo vacío).
  if (result.kind === "empty") {
    return reply
      .header("Access-Control-Allow-Origin", "*")
      .header("Cache-Control", "public, max-age=3600")
      .status(204)
      .send();
  }
  return reply
    .header("Content-Type", contentType)
    .header("Cache-Control", cacheControl)
    .header("Access-Control-Allow-Origin", "*")
    .header("Cross-Origin-Resource-Policy", "cross-origin")
    .header("X-Tile-Cache", result.source === "network" ? "MISS" : "HIT")
    .header("X-Tile-Source", `vector-${result.source}`)
    .send(result.buf);
}

const COORD = /^\d{1,7}$/;

export default async function vectorTilesRoutes(app: FastifyInstance) {
  const opts = { config: { rateLimit: false as const } };

  app.log.info({ CACHE_ROOT }, "Mapa base vectorial CARTO activo (/tiles/vector)");

  // Estilo reescrito
  app.get<{ Params: { name: string } }>(
    "/tiles/vector/style/:name.json",
    opts,
    async (req, reply) => {
      const { name } = req.params;
      if (!isVectorStyleName(name)) {
        return reply.status(404).send({ error: "Estilo no disponible" });
      }
      try {
        const styleName: VectorStyleName = name;
        const result = await cachedFetch(
          path.join(CACHE_ROOT, "style", `${styleName}.json`),
          upstreamStyleUrl(styleName),
          STYLE_TTL_MS,
          (buf) =>
            Buffer.from(
              JSON.stringify(rewriteStyle(JSON.parse(buf.toString("utf8")), styleName)),
            ),
        );
        return send(reply, result, "application/json; charset=utf-8", "no-cache");
      } catch (err) {
        app.log.warn({ name, err: (err as Error).message }, "Estilo vectorial no disponible");
        return reply.status(502).send({ error: "Estilo vectorial no disponible" });
      }
    },
  );

  // Tiles vectoriales
  app.get<{ Params: { z: string; x: string; y: string } }>(
    "/tiles/vector/mvt/:z/:x/:y.mvt",
    opts,
    async (req, reply) => {
      const { z, x, y } = req.params;
      if (!COORD.test(z) || !COORD.test(x) || !COORD.test(y)) {
        return reply.status(400).send();
      }
      try {
        const result = await cachedFetch(
          path.join(CACHE_ROOT, "mvt", z, x, `${y}.mvt`),
          upstreamMvtUrl(z, x, y),
          MVT_TTL_MS,
        );
        return send(reply, result, "application/x-protobuf", "public, max-age=86400");
      } catch (err) {
        app.log.warn({ z, x, y, err: (err as Error).message }, "Tile vectorial falló");
        return reply.status(502).send();
      }
    },
  );

  // Fuentes (glifos)
  app.get<{ Params: { fontstack: string; range: string } }>(
    "/tiles/vector/fonts/:fontstack/:range",
    opts,
    async (req, reply) => {
      const { range } = req.params;
      const fontstack = resolveFontstack(req.params.fontstack);
      if (!fontstack || !isValidGlyphRange(range)) {
        return reply.status(400).send();
      }
      try {
        const result = await cachedFetch(
          path.join(CACHE_ROOT, "fonts", fontstack, range),
          upstreamFontUrl(fontstack, range),
          null,
        );
        return send(reply, result, "application/x-protobuf", "public, max-age=2592000, immutable");
      } catch (err) {
        app.log.warn({ fontstack, range, err: (err as Error).message }, "Fuente vectorial falló");
        return reply.status(502).send();
      }
    },
  );

  // Sprites
  app.get<{ Params: { name: string; file: string } }>(
    "/tiles/vector/sprite/:name/:file",
    opts,
    async (req, reply) => {
      const { name, file } = req.params;
      if (!isVectorStyleName(name) || !isValidSpriteFile(file)) {
        return reply.status(400).send();
      }
      try {
        const result = await cachedFetch(
          path.join(CACHE_ROOT, "sprite", name, file),
          upstreamSpriteUrl(name, file),
          null,
        );
        const type = file.endsWith(".png") ? "image/png" : "application/json";
        return send(reply, result, type, "public, max-age=2592000");
      } catch (err) {
        app.log.warn({ name, file, err: (err as Error).message }, "Sprite vectorial falló");
        return reply.status(502).send();
      }
    },
  );
}
