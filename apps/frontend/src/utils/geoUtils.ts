/**
 * Utilidades geográficas para cálculos de distancia
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface NearestResult {
  name: string;
  distance: number; // metros
}

const EARTH_RADIUS_M = 6_371_000; // Radio de la Tierra en metros

/**
 * Calcula la distancia entre dos puntos usando la fórmula de Haversine
 * @returns Distancia en metros
 */
export function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const hav =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(hav));
}

/**
 * Encuentra el hito kilométrico más cercano a un punto dado
 * Solo retorna si está dentro del umbral (default: 2000m = 2km)
 */
export function getNearestKilometer(
  point: GeoPoint,
  markers: Array<{ name: string; latitude: number; longitude: number }>,
  thresholdMeters = 2000,
): NearestResult | null {
  if (!markers.length) return null;

  let nearest: NearestResult | null = null;
  let minDist = Infinity;

  for (const marker of markers) {
    const dist = haversineDistance(point, {
      latitude: marker.latitude,
      longitude: marker.longitude,
    });

    if (dist < minDist) {
      minDist = dist;
      nearest = { name: marker.name, distance: dist };
    }
  }

  if (nearest && nearest.distance <= thresholdMeters) {
    return nearest;
  }

  return null;
}
