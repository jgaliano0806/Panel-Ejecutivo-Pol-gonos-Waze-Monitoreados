import { Incident } from "../types";

export interface DashboardIncident {
  incident: Incident;
  reportCount: number;
  allLocations?: Array<{ lat: number; lng: number; id: string }>;
  polygonName?: string;
}

/**
 * Expande incidentes agrupados y aplica jitter determinista para visualización
 */
export const expandAndJitterIncidents = (
  items: any[], // Type relaxed for flexibility with hook data
  filterZoneName: string,
  filterType: string | null,
  getIncidentDescription: (type: string, subtype?: string) => string,
): Incident[] => {
  if (!items) return [];

  // Paso 1: Filtrar
  const filtered = items.filter((a) => {
    let streetName =
      a.incident.street || a.polygonName || "Tramo no identificado";

    // Normalización defensiva
    if (streetName.toUpperCase() === "UNKNOWN" || streetName === "null") {
      streetName =
        a.polygonName && a.polygonName.toUpperCase() !== "UNKNOWN"
          ? a.polygonName
          : "Tramo no identificado";
    }

    const targetZone = filterZoneName.toLowerCase().trim();
    const currentStreet = streetName.toLowerCase().trim();

    // Comparación flexible bi-direccional
    const matchesZone =
      currentStreet.includes(targetZone) || targetZone.includes(currentStreet);

    const matchesType =
      !filterType ||
      getIncidentDescription(a.incident.type, a.incident.subtype) ===
        filterType;

    return matchesZone && matchesType;
  });

  // Paso 2: Expandir y Jitter
  return filtered.flatMap((a) => {
    const totalToRender = Math.max(
      a.reportCount || 1,
      a.allLocations?.length || 0,
    );
    const baseLocation = {
      lat: a.incident.location.lat,
      lng: a.incident.location.lng,
    };

    const points = Array.from({ length: totalToRender }).map((_, i) => {
      if (a.allLocations && a.allLocations[i]) {
        return {
          lat: a.allLocations[i].lat,
          lng: a.allLocations[i].lng,
          id: a.allLocations[i].id,
        };
      }
      return { ...baseLocation, id: `${a.incident.id}-extra-${i}` };
    });

    return points.map((loc: any, idx: number) => {
      // JITTER UNIVERSAL DETERMINISTA
      const uniqueId = a.incident.id + "-" + (loc.id || idx);

      // Hash simple para pseudo-random
      let hash = 0;
      for (let i = 0; i < uniqueId.length; i++) {
        hash = (hash << 5) - hash + uniqueId.charCodeAt(i);
        hash |= 0;
      }
      const pseudoRandom = Math.abs(hash & 0xffff) / 65536; // 0..1

      // Configuración de radio
      const baseRadius = 0.00015; // ~15m

      // Si es expansión del mismo evento (idx based), distribución uniforme circular
      // Si son eventos distintos en misma coord (hash based), distribución aleatoria
      const finalAngle =
        totalToRender > 1
          ? (idx / points.length) * Math.PI * 2
          : pseudoRandom * Math.PI * 2;

      const finalRadius =
        totalToRender > 1 ? 0.0002 : baseRadius * (0.5 + pseudoRandom * 0.5);

      return {
        ...a.incident,
        id: uniqueId,
        location: {
          lat: Number(loc.lat) + Math.sin(finalAngle) * finalRadius,
          lng: Number(loc.lng) + Math.cos(finalAngle) * finalRadius,
        },
      };
    });
  });
};
