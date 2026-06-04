import { describe, it, expect } from "vitest";
import { haversineDistance, getNearestKilometer } from "./geoUtils";

describe("geoUtils", () => {
  describe("haversineDistance", () => {
    it("retorna 0 para el mismo punto", () => {
      const p = { latitude: -31.41, longitude: -64.18 };
      expect(haversineDistance(p, p)).toBe(0);
    });

    it("calcula distancia entre dos puntos cercanos en Córdoba", () => {
      const a = { latitude: -31.4135, longitude: -64.1811 };
      const b = { latitude: -31.42, longitude: -64.19 };
      const dist = haversineDistance(a, b);
      expect(dist).toBeGreaterThan(800);
      expect(dist).toBeLessThan(1200);
    });
  });

  describe("getNearestKilometer", () => {
    const markers = [
      { name: "Km 100", latitude: -31.41, longitude: -64.18 },
      { name: "Km 200", latitude: -31.5, longitude: -64.3 },
    ];

    it("retorna null si no hay marcadores", () => {
      expect(
        getNearestKilometer({ latitude: 0, longitude: 0 }, []),
      ).toBeNull();
    });

    it("retorna el marcador más cercano dentro del umbral", () => {
      const result = getNearestKilometer(
        { latitude: -31.4105, longitude: -64.1805 },
        markers,
        2000,
      );
      expect(result?.name).toBe("Km 100");
      expect(result!.distance).toBeLessThan(2000);
    });

    it("retorna null si el más cercano supera el umbral", () => {
      const result = getNearestKilometer(
        { latitude: -31.4105, longitude: -64.1805 },
        markers,
        50,
      );
      expect(result).toBeNull();
    });
  });
});
