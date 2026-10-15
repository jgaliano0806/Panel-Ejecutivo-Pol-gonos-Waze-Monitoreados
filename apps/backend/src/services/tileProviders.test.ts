import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildCartoRasterUrl,
  isCartoWatermarkTile,
  tileCandidates,
} from "./tileProviders";

describe("tileProviders", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("detecta watermark CARTO sin API key", () => {
    const buf = Buffer.from("PNG fake API KEY REQUIRED carto.com/basemaps/apikey");
    expect(isCartoWatermarkTile(buf)).toBe(true);
  });

  it("no marca PNG normales como watermark", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    expect(isCartoWatermarkTile(buf)).toBe(false);
  });

  it("sin API key prioriza ESRI en candidatos", () => {
    vi.stubEnv("CARTO_API_KEY", "");
    const candidates = tileCandidates("carto-dark", "12", "100", "200");
    expect(candidates[0]?.source).toMatch(/^esri-/);
  });

  it("buildCartoRasterUrl agrega key cuando está configurada", () => {
    vi.stubEnv("CARTO_API_KEY", "test-key");
    const url = buildCartoRasterUrl("a", "dark_all", "10", "1", "2");
    expect(url).toContain("key=test-key");
  });
});
