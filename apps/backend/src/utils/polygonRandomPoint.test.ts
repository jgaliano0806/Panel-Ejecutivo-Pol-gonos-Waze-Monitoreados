import { describe, expect, it } from "vitest";
import { randomPointInPolygonGeometry } from "./polygonRandomPoint";
import { booleanPointInPolygon, point, polygon } from "@turf/turf";

describe("randomPointInPolygonGeometry", () => {
  const square: GeoJSON.Polygon = {
    type: "Polygon",
    coordinates: [
      [
        [-64.24, -31.36],
        [-64.23, -31.36],
        [-64.23, -31.35],
        [-64.24, -31.35],
        [-64.24, -31.36],
      ],
    ],
  };

  it("devuelve un punto dentro del polígono", () => {
    const p = randomPointInPolygonGeometry(square);
    expect(p).not.toBeNull();
    const turfPoly = polygon(square.coordinates);
    expect(
      booleanPointInPolygon(point([p!.lon, p!.lat]), turfPoly),
    ).toBe(true);
  });
});
