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
  route_name?: string | null; // ruta que contiene el hito
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
  markers: Array<{
    name: string;
    latitude: number;
    longitude: number;
    route_name?: string | null;
  }>,
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
      nearest = {
        name: marker.name,
        distance: dist,
        route_name: marker.route_name ?? null,
      };
    }
  }

  if (nearest && nearest.distance <= thresholdMeters) {
    return nearest;
  }

  return null;
}

/**
 * Texto de ubicación para voz a partir del hito más cercano:
 * "Ruta Nacional 36, a la altura del kilómetro 807".
 * La ruta es la que contiene el hito (route_name; si falta, el prefijo del nombre "Ruta - Km N").
 * Devuelve null si no se puede interpretar el kilómetro.
 */
export function formatKmLocationForSpeech(
  routeName: string | null | undefined,
  kmName: string | null | undefined,
): string | null {
  if (!kmName) return null;

  const partes = kmName.split(" - ");
  const kmPart = partes[partes.length - 1];
  const match = kmPart.match(/(\d+)(?:\.(\d+))?/);
  if (!match) return null;

  const entero = parseInt(match[1], 10);
  const dec = match[2] ? parseInt(match[2], 10) : 0;
  let km = `kilómetro ${entero}`;
  if (dec === 5 || dec === 50) km += " y medio";
  else if (dec === 25) km += " y un cuarto";
  else if (dec === 75) km += " y tres cuartos";
  else if (dec > 0) km += ` punto ${match[2]}`;

  let ruta = (routeName || "").trim();
  if (!ruta && partes.length > 1) ruta = partes.slice(0, -1).join(" - ").trim();

  // Regla fonética RAC: Circunvalación / A-19 / ruta 19 se lee "cerodiecinueve"
  if (/a-0?19|circunvalaci[oó]n/i.test(ruta) || /\b19\b/.test(ruta)) {
    ruta = ruta.replace(/A-0?19/gi, "cerodiecinueve").replace(/\b19\b/g, "cerodiecinueve");
  }

  return ruta ? `${ruta}, a la altura del ${km}` : `a la altura del ${km}`;
}
