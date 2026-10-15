/**
 * Estilo del mapa base: CARTO vectorial (Dark Matter / Positron) vía backend.
 *
 * - Precarga ambos estilos al montar (≈40 KB cada uno) para que el cambio de
 *   tema sea inmediato.
 * - Mientras carga devuelve un estilo solo con fondo (sin tiles raster de otro
 *   aspecto) y, si falla, cae al raster recibido como fallback.
 * - El backend devuelve rutas relativas; acá se vuelven absolutas.
 */
import { useEffect, useMemo, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";
import { API_CONFIG, TILES_VERSION } from "../config/constants";

export type VectorStyleName = "dark-matter" | "positron";

const resolved = new Map<VectorStyleName, StyleSpecification>();
const failed = new Set<VectorStyleName>();
const inflight = new Map<VectorStyleName, Promise<void>>();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

function baseUrl(): string {
  return API_CONFIG.tilesBase || window.location.origin;
}

function toAbsolute(url: string, base: string): string {
  return url.startsWith("/") ? `${base}${url}` : url;
}

function absolutizeStyle(raw: any, base: string): StyleSpecification {
  const style = JSON.parse(JSON.stringify(raw));
  if (typeof style.glyphs === "string") {
    style.glyphs = toAbsolute(style.glyphs, base);
  }
  if (typeof style.sprite === "string") {
    style.sprite = toAbsolute(style.sprite, base);
  }
  for (const src of Object.values<any>(style.sources || {})) {
    if (Array.isArray(src.tiles)) {
      src.tiles = src.tiles.map(
        (t: string) => `${toAbsolute(t, base)}?v=${TILES_VERSION}`,
      );
    }
  }
  return style as StyleSpecification;
}

function ensureLoaded(name: VectorStyleName): Promise<void> {
  if (resolved.has(name) || failed.has(name)) return Promise.resolve();
  const pending = inflight.get(name);
  if (pending) return pending;

  const base = baseUrl();
  const p = fetch(`${base}/tiles/vector/style/${name}.json?v=${TILES_VERSION}`, {
    cache: "no-cache",
  })
    .then((r) => {
      if (!r.ok) throw new Error(`estilo ${name}: HTTP ${r.status}`);
      return r.json();
    })
    .then((json) => {
      resolved.set(name, absolutizeStyle(json, base));
    })
    .catch(() => {
      failed.add(name);
    })
    .finally(() => {
      inflight.delete(name);
      notify();
    });
  inflight.set(name, p);
  return p;
}

function backgroundOnly(raster: StyleSpecification): StyleSpecification {
  return {
    ...raster,
    sources: {},
    layers: raster.layers.filter((l) => l.type === "background"),
  };
}

export interface BasemapStyleResult {
  style: StyleSpecification;
  /** true cuando el estilo definitivo (vectorial o fallback) ya está disponible. */
  ready: boolean;
  /** true si se está usando el estilo vectorial. */
  isVector: boolean;
}

/**
 * @param isDark         tema actual
 * @param rasterFallback estilo raster (memoizado) a usar si el vectorial falla
 */
export function useBasemapStyle(
  isDark: boolean,
  rasterFallback: StyleSpecification,
): BasemapStyleResult {
  const name: VectorStyleName = isDark ? "dark-matter" : "positron";
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    void ensureLoaded("dark-matter");
    void ensureLoaded("positron");
    listener(); // por si algo se resolvió entre el render y este efecto
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const loadingStyle = useMemo(
    () => backgroundOnly(rasterFallback),
    [rasterFallback],
  );

  const vector = resolved.get(name);
  const hasFailed = failed.has(name);

  return {
    style: vector ?? (hasFailed ? rasterFallback : loadingStyle),
    ready: !!vector || hasFailed,
    isVector: !!vector,
  };
}
