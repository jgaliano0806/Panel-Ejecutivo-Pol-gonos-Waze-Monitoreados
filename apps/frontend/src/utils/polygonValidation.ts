/**
 * Validaciones de polígonos con Turf.js
 * - Anti auto-intersección
 * - Anti superposición con otros polígonos
 */
import * as turf from "@turf/turf";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  overlappingPolygonId?: string;
}

/** GeoJSON Polygon */
type PolygonGeo = GeoJSON.Polygon;

/**
 * Verifica que un polígono no se cruce a sí mismo (auto-intersección)
 */
export function hasSelfIntersection(
  polygon: PolygonGeo
): boolean {
  try {
    const fc = turf.kinks(turf.polygon(polygon.coordinates));
    return fc.features.length > 0;
  } catch {
    return false;
  }
}

/**
 * Verifica si el polígono se superpone con alguno de los polígonos existentes
 * Retorna el id del primer polígono conflictivo encontrado
 */
export function findOverlappingPolygon(
  newPolygon: PolygonGeo,
  existingPolygons: Array<{ id: string; geometry: PolygonGeo }>
): string | null {
  const poly = turf.polygon(newPolygon.coordinates);

  for (const { id, geometry } of existingPolygons) {
    if (!geometry?.coordinates) continue;
    const existing = turf.polygon(geometry.coordinates);
    if (turf.booleanIntersects(poly, existing) || turf.booleanOverlap(poly, existing)) {
      return id;
    }
  }
  return null;
}

/**
 * Intenta auto-ajustar el polígono restando el área superpuesta.
 * Retorna la geometría ajustada o null si no es posible.
 */
export function tryAutoAdjustOverlap(
  geometry: PolygonGeo,
  existingPolygons: Array<{ id: string; geometry: PolygonGeo }>,
  excludeId?: string
): { geometry: PolygonGeo; adjustedFrom: string } | null {
  const others = existingPolygons.filter((p) => p.id !== excludeId);
  const overlappingId = findOverlappingPolygon(geometry, others);
  if (!overlappingId) return null;

  const overlapPoly = others.find((p) => p.id === overlappingId);
  if (!overlapPoly?.geometry?.coordinates?.[0]) return null;

  try {
    const fc = turf.featureCollection([
      turf.polygon(geometry.coordinates),
      turf.polygon(overlapPoly.geometry.coordinates),
    ]);
    const result = turf.difference(fc);
    if (!result) return null;

    const geom = result.geometry;
    if (geom.type === "Polygon" && geom.coordinates?.[0]?.length >= 3) {
      return { geometry: geom, adjustedFrom: overlappingId };
    }
    if (geom.type === "MultiPolygon") {
      const polys = geom.coordinates.map((c) => turf.polygon(c));
      const largest = polys.reduce((a, b) =>
        turf.area(a) >= turf.area(b) ? a : b
      );
      const coords = largest.geometry.coordinates;
      if (coords?.[0]?.length >= 3) {
        return { geometry: { type: "Polygon", coordinates: coords }, adjustedFrom: overlappingId };
      }
    }
  } catch {
    /* turf.difference puede fallar con geometrías complejas */
  }
  return null;
}

/**
 * Validación completa: auto-intersección + superposición + mínimo de vértices
 */
export function validatePolygon(
  geometry: PolygonGeo,
  existingPolygons: Array<{ id: string; geometry: PolygonGeo }>,
  excludeId?: string
): ValidationResult {
  const coords = geometry?.coordinates?.[0];
  if (!coords || coords.length < 3) {
    return { valid: false, error: "Mínimo 3 vértices para formar un polígono" };
  }

  if (hasSelfIntersection(geometry)) {
    return { valid: false, error: "El polígono no puede cruzarse a sí mismo" };
  }

  const others = existingPolygons.filter((p) => p.id !== excludeId);
  const overlapping = findOverlappingPolygon(geometry, others);
  if (overlapping) {
    return {
      valid: false,
      error: "El polígono se superpone con otro existente",
      overlappingPolygonId: overlapping,
    };
  }

  return { valid: true };
}
