/**
 * URLs y validación de tiles (CARTO + ESRI).
 * CARTO raster exige API key desde 2025/2026; sin key devuelve PNG con watermark.
 */

export function getCartoApiKey(): string {
  return (process.env.CARTO_API_KEY || "").trim();
}

export const CARTO_SUBDOMAINS = ["a", "b", "c", "d"] as const;

export const ESRI_MAX_ZOOM = 16;

export const ESRI_DARK_BASE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile";

export const ESRI_LIGHT_BASE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile";

export const OSM_BASE = "https://tile.openstreetmap.org";

export type CartoRasterStyle = "carto-dark" | "carto-light";

export type TileFormat = "png" | "jpeg";

export interface TileBuffer {
  buf: Buffer;
  format: TileFormat;
}

export interface TileCandidate {
  url: string;
  source: string;
}

export const TILE_FETCH_HEADERS = {
  "User-Agent": "PanelWaze-CASISA/1.0 (Map Tiles Proxy)",
  Accept: "image/png,image/jpeg,image/*,*/*",
  Referer: "https://caminosdelassierras.com.ar/",
};

export function cartoVariant(style: CartoRasterStyle): "dark_all" | "light_all" {
  return style === "carto-light" ? "light_all" : "dark_all";
}

export function buildCartoRasterUrl(
  sub: string,
  variant: "dark_all" | "light_all",
  z: string,
  x: string,
  y: string,
): string {
  const base = `https://${sub}.basemaps.cartocdn.com/rastertiles/${variant}/${z}/${x}/${y}.png`;
  const key = getCartoApiKey();
  if (!key) return base;
  return `${base}?key=${encodeURIComponent(key)}`;
}

/** PNG/JPEG de CARTO sin API key incluyen este texto embebido en la imagen. */
export function isCartoWatermarkTile(buf: Buffer): boolean {
  const sample = buf.subarray(0, Math.min(buf.length, 16_384)).toString("latin1");
  const upper = sample.toUpperCase();
  return (
    upper.includes("API KEY REQUIRED") ||
    upper.includes("BASEMAPS/APIKEY") ||
    upper.includes("CARTO.COM/BASEMAPS")
  );
}

export function detectImageFormat(buf: Buffer): TileFormat | null {
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

export function parseTileBuffer(buf: Buffer, rejectCartoWatermark = true): TileBuffer {
  const format = detectImageFormat(buf);
  if (!format) {
    throw new Error(`respuesta no es PNG/JPEG (${buf.length}B)`);
  }
  if (rejectCartoWatermark && format === "png" && isCartoWatermarkTile(buf)) {
    throw new Error("tile CARTO con watermark (API key requerida)");
  }
  return { buf, format };
}

export function tileCandidates(
  style: CartoRasterStyle,
  z: string,
  x: string,
  y: string,
): TileCandidate[] {
  const variant = cartoVariant(style);
  const zi = parseInt(z, 10);
  const xi = parseInt(x, 10);
  const yi = parseInt(y, 10);
  const startIdx = (zi + xi + yi) % CARTO_SUBDOMAINS.length;

  const esri: TileCandidate[] = [];
  if (zi <= ESRI_MAX_ZOOM) {
    const esriBase = style === "carto-dark" ? ESRI_DARK_BASE : ESRI_LIGHT_BASE;
    esri.push({
      url: `${esriBase}/${z}/${y}/${x}`,
      source: style === "carto-dark" ? "esri-dark" : "esri-light",
    });
  }

  const carto: TileCandidate[] = CARTO_SUBDOMAINS.map((_, i) => {
    const sub = CARTO_SUBDOMAINS[(startIdx + i) % CARTO_SUBDOMAINS.length];
    return {
      url: buildCartoRasterUrl(sub, variant, z, x, y),
      source: `carto-${sub}`,
    };
  });

  // Sin API key, CARTO devuelve watermark → ESRI primero.
  if (!getCartoApiKey()) {
    return [...esri, ...carto];
  }
  return [...carto, ...esri];
}
