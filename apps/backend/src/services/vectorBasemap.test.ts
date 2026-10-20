import { describe, expect, it } from "vitest";
import {
  dimColor,
  isValidFontstack,
  isValidGlyphRange,
  isValidSpriteFile,
  isVectorStyleName,
  resolveFontstack,
  rewriteStyle,
  upstreamFontUrl,
  upstreamMvtUrl,
  upstreamSpriteUrl,
  upstreamStyleUrl,
} from "./vectorBasemap";

describe("vectorBasemap", () => {
  it("valida nombres de estilo", () => {
    expect(isVectorStyleName("dark-matter")).toBe(true);
    expect(isVectorStyleName("positron")).toBe(true);
    expect(isVectorStyleName("../etc")).toBe(false);
  });

  it("arma URLs upstream", () => {
    expect(upstreamStyleUrl("dark-matter")).toBe(
      "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    );
    expect(upstreamSpriteUrl("positron", "sprite@2x.png")).toBe(
      "https://tiles.basemaps.cartocdn.com/gl/positron-gl-style/sprite@2x.png",
    );
    expect(upstreamFontUrl("Open Sans Bold", "0-255.pbf")).toBe(
      "https://tiles.basemaps.cartocdn.com/fonts/Open%20Sans%20Bold/0-255.pbf",
    );
  });

  it("resuelve fontstacks con comas a una fuente disponible en CARTO", () => {
    expect(resolveFontstack("Open Sans Regular")).toBe("Open Sans Regular");
    expect(resolveFontstack("Open Sans Regular,Arial Unicode MS Regular")).toBe(
      "Open Sans Regular",
    );
    expect(resolveFontstack("Montserrat Medium,Open Sans Bold,Noto Sans Regular")).toBe(
      "Montserrat Medium",
    );
    expect(resolveFontstack("Open Sans Semibold,Arial Unicode MS Regular")).toBe(
      "Open Sans Bold",
    );
    expect(resolveFontstack("Fuente Inexistente,Otra")).toBe("Open Sans Regular");
    expect(resolveFontstack("../../x")).toBeNull();
    expect(resolveFontstack("A,B,C,D,E,F,G")).toBeNull();
  });

  it("elige subdominio mvt de forma determinística", () => {
    const a = upstreamMvtUrl("14", "5266", "9694");
    expect(a).toBe(upstreamMvtUrl("14", "5266", "9694"));
    expect(a).toMatch(
      /^https:\/\/tiles-[abcd]\.basemaps\.cartocdn\.com\/vectortiles\/carto\.streets\/v1\/14\/5266\/9694\.mvt$/,
    );
  });

  it("rechaza parámetros peligrosos", () => {
    expect(isValidSpriteFile("sprite.json")).toBe(true);
    expect(isValidSpriteFile("../sprite.json")).toBe(false);
    expect(isValidFontstack("Noto Sans Regular")).toBe(true);
    expect(isValidFontstack("../../x")).toBe(false);
    expect(isValidGlyphRange("0-255.pbf")).toBe(true);
    expect(isValidGlyphRange("0-255.pbf/../x")).toBe(false);
  });

  it("dark-matter: recolorea a grises, desplaza zoom y afina calles", () => {
    const style = {
      version: 8,
      sources: {},
      layers: [
        { id: "background", type: "background", paint: { "background-color": "#0e0e0e" } },
        {
          id: "road_minor_fill",
          type: "line",
          paint: {
            "line-color": "rgba(65, 71, 88, 1)",
            "line-width": { stops: [[15, 3], [16, 4]] },
          },
        },
        { id: "roadname_minor", type: "symbol", minzoom: 16, layout: { "text-size": 9 } },
      ],
    };
    const out = rewriteStyle(style, "dark-matter") as any;
    expect(out.layers[0].paint["background-color"]).toBe("#080808");
    expect(out.layers[1].paint["line-color"]).toBe("#1c1c1c");
    expect(out.layers[1].paint["line-width"].stops).toEqual([[14, 2.25], [15, 3]]);
    expect(out.layers[2].minzoom).toBe(15);
  });

  it("dark-matter: agua en grises oscuros, positron intacto", () => {
    const style = {
      version: 8,
      sources: {},
      layers: [
        { id: "water", type: "fill", paint: { "fill-color": "#2C353C" } },
        { id: "waterway", type: "line", paint: { "line-color": "rgba(63, 90, 109, 1)", "line-width": 2 } },
        { id: "boundary_country_outline", type: "line", paint: { "line-color": "#2C353C" } },
      ],
    };
    const out = rewriteStyle(style, "dark-matter") as any;
    expect(out.layers[0].paint["fill-color"]).toBe("#0d0d0d");
    expect(out.layers[1].paint["line-color"]).toBe("#151515");
    expect(out.layers[1].paint["line-width"]).toBe(2);
    expect(out.layers[2].paint["line-color"]).toBe("#2C353C");
    const light = rewriteStyle(style, "positron") as any;
    expect(light.layers[0].paint["fill-color"]).toBe("#2C353C");
  });

  it("dimColor atenúa hex y rgba", () => {
    expect(dimColor("#fff", 0.5)).toBe("#808080");
    expect(dimColor("rgba(200, 100, 0, 1)", 0.5)).toBe("#643200");
    expect(dimColor("transparent", 0.5)).toBe("transparent");
    expect(dimColor("#666", 0.33, 0x3c)).toBe("#3c3c3c");
  });

  it("dark-matter: atenúa text-color de símbolos", () => {
    const style = {
      version: 8,
      sources: {},
      layers: [{ id: "roadname_pri", type: "symbol", paint: { "text-color": "rgba(189, 189, 189, 1)" } }],
    };
    const out = rewriteStyle(style, "dark-matter") as any;
    expect(out.layers[0].paint["text-color"]).toBe("#3e3e3e");
  });

  it("positron no se modifica", () => {
    const style = {
      version: 8,
      sources: {},
      layers: [{ id: "x", type: "symbol", minzoom: 16 }],
    };
    const out = rewriteStyle(style, "positron") as any;
    expect(out.layers[0].minzoom).toBe(16);
  });

  it("reescribe glyphs, sprite y fuente vectorial del estilo", () => {
    const style = {
      version: 8,
      glyphs: "https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf",
      sprite: "https://tiles.basemaps.cartocdn.com/gl/dark-matter-gl-style/sprite",
      sources: {
        carto: {
          type: "vector",
          url: "https://tiles.basemaps.cartocdn.com/vector/carto.streets/v1/tiles.json",
        },
      },
      layers: [{ id: "background", type: "background" }],
    };
    const out = rewriteStyle(style, "dark-matter") as any;
    expect(out.glyphs).toBe("/tiles/vector/fonts/{fontstack}/{range}.pbf");
    expect(out.sprite).toBe("/tiles/vector/sprite/dark-matter/sprite");
    expect(out.sources.carto.url).toBeUndefined();
    expect(out.sources.carto.tiles).toEqual([
      "/tiles/vector/mvt/{z}/{x}/{y}.mvt",
    ]);
    expect(out.sources.carto.maxzoom).toBe(14);
    expect(out.layers).toEqual(style.layers);
  });
});
