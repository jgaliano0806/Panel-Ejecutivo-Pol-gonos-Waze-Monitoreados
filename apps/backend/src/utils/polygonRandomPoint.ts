import {
  bbox,
  booleanPointInPolygon,
  point,
  polygon,
} from "@turf/turf";

type PolygonGeo = GeoJSON.Polygon | GeoJSON.MultiPolygon;

function toPolygonList(geometry: PolygonGeo): GeoJSON.Polygon[] {
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((coords) => ({
      type: "Polygon",
      coordinates: coords,
    }));
  }
  return [geometry];
}

/**
 * Punto aleatorio dentro de un polígono RAC (rejection sampling sobre bbox).
 */
export function randomPointInPolygonGeometry(
  geometry: PolygonGeo,
  maxAttempts = 250,
): { lat: number; lon: number } | null {
  const polygons = toPolygonList(geometry);
  if (polygons.length === 0) return null;

  const target = polygons[Math.floor(Math.random() * polygons.length)]!;
  const turfPoly = polygon(target.coordinates);
  const [minX, minY, maxX, maxY] = bbox(turfPoly);

  for (let i = 0; i < maxAttempts; i++) {
    const lon = minX + Math.random() * (maxX - minX);
    const lat = minY + Math.random() * (maxY - minY);
    if (booleanPointInPolygon(point([lon, lat]), turfPoly)) {
      return { lat, lon };
    }
  }

  const ring = target.coordinates[0];
  const first = ring?.[0];
  if (first) {
    return { lon: first[0], lat: first[1] };
  }
  return null;
}
