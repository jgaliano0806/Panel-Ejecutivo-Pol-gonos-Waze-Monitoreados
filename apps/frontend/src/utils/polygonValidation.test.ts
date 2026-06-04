import { describe, it, expect } from "vitest";
import {
  validatePolygon,
  hasSelfIntersection,
  findOverlappingPolygon,
} from "./polygonValidation";

const square = (
  id: string,
  minLng: number,
  minLat: number,
  size: number,
): { id: string; geometry: GeoJSON.Polygon } => ({
  id,
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [minLng, minLat],
        [minLng + size, minLat],
        [minLng + size, minLat + size],
        [minLng, minLat + size],
        [minLng, minLat],
      ],
    ],
  },
});

describe("polygonValidation", () => {
  describe("validatePolygon", () => {
    it("rechaza polígonos con menos de 3 vértices", () => {
      const result = validatePolygon(
      { type: "Polygon", coordinates: [[[0, 0], [1, 1]]] },
      [],
    );
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Mínimo 3 vértices/);
    });

    it("acepta un polígono válido sin solapamiento", () => {
      const poly = square("new", 0, 0, 1);
      const existing = [square("other", 5, 5, 1)];
      const result = validatePolygon(poly.geometry, existing);
      expect(result.valid).toBe(true);
    });

    it("rechaza auto-intersección (forma de moño)", () => {
      const bowtie: GeoJSON.Polygon = {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [2, 2],
            [2, 0],
            [0, 2],
            [0, 0],
          ],
        ],
      };
      expect(hasSelfIntersection(bowtie)).toBe(true);
      const result = validatePolygon(bowtie, []);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/cruzar/);
    });

    it("rechaza solapamiento con polígono existente", () => {
      const poly = square("new", 0, 0, 2);
      const existing = [square("existing-1", 1, 1, 2)];
      const result = validatePolygon(poly.geometry, existing);
      expect(result.valid).toBe(false);
      expect(result.overlappingPolygonId).toBe("existing-1");
    });

    it("excluye el polígono en edición del chequeo de solapamiento", () => {
      const poly = square("edit-me", 0, 0, 2);
      const existing = [square("edit-me", 0, 0, 2)];
      const result = validatePolygon(poly.geometry, existing, "edit-me");
      expect(result.valid).toBe(true);
    });
  });

  describe("findOverlappingPolygon", () => {
    it("retorna null si no hay conflicto", () => {
      const a = square("a", 0, 0, 1);
      const b = square("b", 10, 10, 1);
      expect(findOverlappingPolygon(a.geometry, [b])).toBeNull();
    });
  });
});
