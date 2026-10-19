/**
 * Mapa base vectorial CARTO (Dark Matter / Positron).
 * El estilo vectorial y sus tiles .mvt no requieren API key, a diferencia del
 * raster actual de CARTO, que cambió de aspecto y exige key.
 *
 * Todo pasa por el backend (estilo, tiles, fuentes y sprites) para que los
 * clientes de la red no dependan de internet directo y para cachear en disco.
 */

export type VectorStyleName = "dark-matter" | "positron";

export const VECTOR_STYLE_NAMES: readonly VectorStyleName[] = [
  "dark-matter",
  "positron",
];

export const VECTOR_MAX_ZOOM = 14;

const CARTO_MVT_SUBDOMAINS = ["a", "b", "c", "d"] as const;

/** Prefijo público de las rutas que expone el backend. */
export const VECTOR_ROUTE_PREFIX = "/tiles/vector";

export function isVectorStyleName(value: string): value is VectorStyleName {
  return (VECTOR_STYLE_NAMES as readonly string[]).includes(value);
}

export function upstreamStyleUrl(name: VectorStyleName): string {
  return `https://basemaps.cartocdn.com/gl/${name}-gl-style/style.json`;
}

export function upstreamSpriteUrl(name: VectorStyleName, file: string): string {
  return `https://tiles.basemaps.cartocdn.com/gl/${name}-gl-style/${file}`;
}

export function upstreamFontUrl(fontstack: string, range: string): string {
  return `https://tiles.basemaps.cartocdn.com/fonts/${encodeURIComponent(fontstack)}/${range}`;
}

/** Subdominio determinístico por tile (mismo tile, mismo host). */
export function upstreamMvtUrl(z: string, x: string, y: string): string {
  const idx =
    (parseInt(z, 10) + parseInt(x, 10) + parseInt(y, 10)) %
    CARTO_MVT_SUBDOMAINS.length;
  const sub = CARTO_MVT_SUBDOMAINS[Math.abs(idx)];
  return `https://tiles-${sub}.basemaps.cartocdn.com/vectortiles/carto.streets/v1/${z}/${x}/${y}.mvt`;
}

/** Nombres de archivo de sprite permitidos (evita path traversal). */
export function isValidSpriteFile(file: string): boolean {
  return /^sprite(@2x)?\.(json|png)$/.test(file);
}

/** Fontstack y rango válidos: solo letras, números, espacios, guiones. */
export function isValidFontstack(fontstack: string): boolean {
  return /^[A-Za-z0-9 _-]{1,80}$/.test(fontstack);
}

/** Fuentes que CARTO publica realmente (cualquier otra devuelve 404 upstream). */
const CARTO_FONTS = new Set([
  "Open Sans Regular",
  "Open Sans Bold",
  "Open Sans Italic",
  "Montserrat Regular",
  "Montserrat Regular Italic",
  "Montserrat Medium",
  "Montserrat Medium Italic",
  "Noto Sans Regular",
  "NanumBarunGothic Regular",
  "HanWangHeiLight Regular",
]);

/** Nombres que MapLibre/estilos suelen pedir pero CARTO no tiene. */
const FONT_ALIASES: Record<string, string> = {
  "Open Sans Semibold": "Open Sans Bold",
};

export const DEFAULT_FONT = "Open Sans Regular";
const MAX_FONTSTACK_ENTRIES = 6;

/**
 * MapLibre pide `text-font` como lista separada por comas
 * (ej. "Open Sans Regular,Arial Unicode MS Regular"). CARTO solo sirve
 * fuentes individuales: se elige la primera disponible, o DEFAULT_FONT.
 * Devuelve null si la entrada es inválida (400).
 */
export function resolveFontstack(raw: string): string | null {
  const names = raw.split(",").map((n) => n.trim());
  if (names.length > MAX_FONTSTACK_ENTRIES) return null;
  if (!names.every((n) => isValidFontstack(n))) return null;
  for (const name of names) {
    const font = FONT_ALIASES[name] ?? name;
    if (CARTO_FONTS.has(font)) return font;
  }
  return DEFAULT_FONT;
}

export function isValidGlyphRange(range: string): boolean {
  return /^\d{1,5}-\d{1,5}\.pbf$/.test(range);
}

type AnyJson = Record<string, unknown>;

/** Factor de grosor de calles para acercarse al estilo raster viejo. */
export const CLASSIC_ROAD_WIDTH_FACTOR = 0.75;

/**
 * Los tiles raster de 256 px se veían en MapLibre con el estilo un zoom más
 * adelante (tile z16 = zoom de mapa 15). Se desplaza el zoom del estilo para
 * que calles y nombres aparezcan como antes.
 */
export const CLASSIC_ZOOM_SHIFT = -1;

/**
 * Colores del Dark Matter actual (azul grisáceo) -> grises neutros medidos en
 * los tiles raster viejos (fondo #080808, calles #191919-#2D2D2D).
 */
export const CLASSIC_DARK_COLOR_MAP: Record<string, string> = {
  "rgba(65, 71, 88, 1)": "#1c1c1c",
  "rgba(83, 86, 102, 1)": "#262626",
  "rgba(73, 73, 73, 1)": "#2a2a2a",
  "#0e0e0e": "#080808",
};

function isStopsFunction(node: unknown): node is { stops: [number, unknown][] } & AnyJson {
  return (
    !!node &&
    typeof node === "object" &&
    !Array.isArray(node) &&
    Array.isArray((node as AnyJson).stops) &&
    ((node as AnyJson).stops as unknown[]).every(
      (s) => Array.isArray(s) && typeof s[0] === "number",
    )
  );
}

function shiftStops(node: unknown, delta: number): unknown {
  if (Array.isArray(node)) return node.map((n) => shiftStops(n, delta));
  if (isStopsFunction(node)) {
    return {
      ...node,
      stops: node.stops.map(([z, v]) => [z + delta, shiftStops(v, delta)]),
    };
  }
  if (node && typeof node === "object") {
    return Object.fromEntries(
      Object.entries(node as AnyJson).map(([k, v]) => [k, shiftStops(v, delta)]),
    );
  }
  return node;
}

/** Desplaza el zoom de todas las capas (stops, minzoom y maxzoom). */
export function shiftLayersZoom(layers: AnyJson[], delta: number): AnyJson[] {
  return layers.map((layer) => {
    const out: AnyJson = { ...layer };
    if (layer.paint) out.paint = shiftStops(layer.paint, delta);
    if (layer.layout) out.layout = shiftStops(layer.layout, delta);
    if (typeof layer.minzoom === "number") out.minzoom = Math.max(0, layer.minzoom + delta);
    if (typeof layer.maxzoom === "number") out.maxzoom = Math.max(0, layer.maxzoom + delta);
    return out;
  });
}

/** Los textos del raster viejo no superaban #343434; el vectorial llega a #BDBDBD. */
export const CLASSIC_TEXT_FACTOR = 0.33;
/** Piso de brillo por canal para que el texto se distinga de su halo (#222). */
export const CLASSIC_TEXT_FLOOR = 0x3c;

/** Escala el brillo de un color (#rgb, #rrggbb, rgb[a]()); otros formatos quedan igual. */
export function dimColor(color: string, factor: number, floor = 0): string {
  const c = color.trim();
  let rgb: number[] | null = null;
  let m = /^#([0-9a-f]{3})$/i.exec(c);
  if (m) rgb = m[1].split("").map((h) => parseInt(h + h, 16));
  m = /^#([0-9a-f]{6})$/i.exec(c);
  if (m) rgb = [0, 2, 4].map((i) => parseInt(m![1].slice(i, i + 2), 16));
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(c);
  if (m) rgb = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (!rgb) return color;
  return (
    "#" +
    rgb
      .map((v) =>
        Math.round(Math.min(255, Math.max(Math.min(v, floor), v * factor)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

const ROAD_WIDTH_LAYER = /^(road|bridge|tunnel)_.*_(fill|case)/;

function scaleWidth(width: unknown, factor: number): unknown {
  if (typeof width === "number") return width * factor;
  if (width && typeof width === "object" && Array.isArray((width as AnyJson).stops)) {
    const w = width as { stops: [number, number][] } & AnyJson;
    return {
      ...w,
      stops: w.stops.map(([z, v]) => [z, typeof v === "number" ? v * factor : v]),
    };
  }
  return width; // expresiones: se dejan como están
}

/**
 * Aproxima el aspecto del Dark Matter raster anterior (que CARTO ya no sirve):
 * calles grises neutras, más finas, y fondo más oscuro.
 */
export function applyClassicDarkTweaks(style: AnyJson): AnyJson {
  let json = JSON.stringify(style);
  for (const [from, to] of Object.entries(CLASSIC_DARK_COLOR_MAP)) {
    json = json.split(`"${from}"`).join(`"${to}"`);
  }
  const out = JSON.parse(json) as AnyJson;

  const layers = shiftLayersZoom((out.layers || []) as AnyJson[], CLASSIC_ZOOM_SHIFT);
  out.layers = layers.map((layer) => {
    const id = String(layer.id || "");
    const paint = layer.paint as AnyJson | undefined;
    if (layer.type === "symbol" && paint && typeof paint["text-color"] === "string") {
      return {
        ...layer,
        paint: { ...paint, "text-color": dimColor(paint["text-color"], CLASSIC_TEXT_FACTOR, CLASSIC_TEXT_FLOOR) },
      };
    }
    if (layer.type === "line" && paint && ROAD_WIDTH_LAYER.test(id) && "line-width" in paint) {
      return {
        ...layer,
        paint: {
          ...paint,
          "line-width": scaleWidth(paint["line-width"], CLASSIC_ROAD_WIDTH_FACTOR),
        },
      };
    }
    return layer;
  });
  return out;
}

/**
 * Reescribe el estilo de CARTO para que todo apunte a rutas relativas del
 * backend. El frontend las vuelve absolutas con su origen.
 */
export function rewriteStyle(style: AnyJson, name: VectorStyleName): AnyJson {
  const out: AnyJson = name === "dark-matter" ? applyClassicDarkTweaks(style) : { ...style };

  out.glyphs = `${VECTOR_ROUTE_PREFIX}/fonts/{fontstack}/{range}.pbf`;
  out.sprite = `${VECTOR_ROUTE_PREFIX}/sprite/${name}/sprite`;

  const sources = (style.sources || {}) as Record<string, AnyJson>;
  const newSources: Record<string, AnyJson> = {};
  for (const [id, src] of Object.entries(sources)) {
    if (src && src.type === "vector") {
      const { url: _url, ...rest } = src;
      newSources[id] = {
        ...rest,
        tiles: [`${VECTOR_ROUTE_PREFIX}/mvt/{z}/{x}/{y}.mvt`],
        minzoom: 0,
        maxzoom: VECTOR_MAX_ZOOM,
        attribution:
          '&copy; <a href="https://carto.com/about-carto/" target="_blank" rel="noopener">CARTO</a>, ' +
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      };
    } else {
      newSources[id] = src;
    }
  }
  out.sources = newSources;

  return out;
}
