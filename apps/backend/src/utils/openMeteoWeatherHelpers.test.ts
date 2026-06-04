import { describe, it, expect } from "vitest";
import {
  isRainWeatherCode,
  normalizeOpenMeteoPrecipitation,
  formatLocalDateForOpenMeteo,
  parseOpenMeteoHourlyTime,
} from "./openMeteoWeatherHelpers";

describe("openMeteoWeatherHelpers", () => {
  describe("isRainWeatherCode", () => {
    it("detecta códigos de lluvia WMO", () => {
      expect(isRainWeatherCode(3)).toBe(false);
      expect(isRainWeatherCode(51)).toBe(true);
      expect(isRainWeatherCode(61)).toBe(true);
      expect(isRainWeatherCode(95)).toBe(true);
    });
  });

  describe("normalizeOpenMeteoPrecipitation", () => {
    it("prioriza rain sobre precipitation", () => {
      expect(
        normalizeOpenMeteoPrecipitation(3, 0, 0.6).precipitation_mm,
      ).toBe(0.6);
    });

    it("usa mínimo simbólico si el código indica lluvia con 0mm", () => {
      expect(
        normalizeOpenMeteoPrecipitation(51, 0, 0).precipitation_mm,
      ).toBe(0.1);
    });

    it("mantiene 0mm en nublado sin lluvia", () => {
      expect(
        normalizeOpenMeteoPrecipitation(3, 0, 0).precipitation_mm,
      ).toBe(0);
    });
  });

  describe("formatLocalDateForOpenMeteo", () => {
    it("usa fecha local Argentina, no UTC", () => {
      const date = new Date("2026-06-02T02:30:00.000Z"); // 23:30 ART del 1/6
      expect(formatLocalDateForOpenMeteo(date)).toBe("2026-06-01");
    });
  });

  describe("parseOpenMeteoHourlyTime", () => {
    it("interpreta hora local con offset de Open-Meteo", () => {
      const ts = parseOpenMeteoHourlyTime("2026-06-03T23:00", -10800);
      expect(new Date(ts).toISOString()).toBe("2026-06-04T02:00:00.000Z");
    });
  });
});
