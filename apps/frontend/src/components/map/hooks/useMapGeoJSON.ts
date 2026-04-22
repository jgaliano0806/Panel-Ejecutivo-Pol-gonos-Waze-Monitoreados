/**
 * useMapGeoJSON.ts — Hooks de GeoJSON memoizados para las capas del mapa.
 *
 * Cada hook devuelve un FeatureCollection estable que solo se recalcula
 * cuando los datos de entrada cambian. Centraliza la validación de
 * coordenadas para evitar la duplicación que había en MapLibreMap.tsx.
 */
import { useMemo } from "react";
import type { TrafficJam, Incident, Polygon } from "../../../types";
import { PolygonState } from "../../../types";
import {
  isValidLine,
  isValidPoint,
  getFlowColor,
  getJamColor,
  getJamSeverityText,
  calculateBearing,
} from "../mapUtils";

// ─── Tipos GeoJSON helpers ──────────────────────────────────────────

type FC = GeoJSON.FeatureCollection;

// ─── Pre-procesamiento compartido ───────────────────────────────────

/** Filtra jams con líneas válidas (>= 2 puntos con coordenadas finitas). */
function validJams(jams: TrafficJam[]): TrafficJam[] {
  return jams.filter((j) => isValidLine(j.line));
}

/** Convierte una polyline Waze {x,y}[] a coordenadas GeoJSON [lng,lat][]. */
function lineToCoords(line: Array<{ x: number; y: number }>): [number, number][] {
  return line.map((p) => [p.x, p.y]);
}

// ─── Polígonos ──────────────────────────────────────────────────────

export function usePolygonsGeoJSON(polygons: Polygon[]): FC {
  return useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: polygons.map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: p.geometry.coordinates },
        properties: {
          id: p.id,
          color:
            p.state === PolygonState.HIGH
              ? "#ef4444"
              : p.state === PolygonState.MEDIUM
                ? "#eab308"
                : "#22c55e",
        },
      })),
    }),
    [polygons],
  );
}

// ─── Flujo de tráfico (todos los segmentos coloreados por velocidad) ─

export function useFlowGeoJSON(trafficFlow: TrafficJam[], jams: TrafficJam[]): FC {
  return useMemo(() => {
    const flowLines = trafficFlow.length > 0 ? trafficFlow : jams;
    const valid = validJams(flowLines);
    return {
      type: "FeatureCollection" as const,
      features: valid.map((jam) => ({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: lineToCoords(jam.line!),
        },
        properties: {
          id: jam.id,
          speed: Number(jam.speed) || 0,
          delay: Number(jam.delay) || 0,
          length: Number(jam.length) || 0,
          street: jam.street || "Vía sin nombre",
          level: Number(jam.level) || 0,
          color: getFlowColor(Number(jam.speed) || 0),
          bearing: calculateBearing(jam.line),
        },
      })),
    };
  }, [trafficFlow, jams]);
}

// ─── Flujo fluido (speed >= 50, línea verde animada) ─────────────────

export function useFlowFluidGeoJSON(trafficFlow: TrafficJam[], jams: TrafficJam[]): FC {
  return useMemo(() => {
    const flowLines = trafficFlow.length > 0 ? trafficFlow : jams;
    const fluid = flowLines.filter((j) => (j.speed || 0) >= 50);
    const valid = validJams(fluid);
    return {
      type: "FeatureCollection" as const,
      features: valid.map((jam) => ({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: lineToCoords(jam.line!),
        },
        properties: {
          id: jam.id,
          speed: jam.speed || 0,
          street: jam.street || "Vía sin nombre",
        },
      })),
    };
  }, [trafficFlow, jams]);
}

// ─── Atascos severos (level >= 3 o speed <= 15) ─────────────────────

export function useJamsGeoJSON(jams: TrafficJam[]): FC {
  return useMemo(() => {
    const congested = jams.filter(
      (j) => (j.level || 0) >= 3 || (j.speed || 0) <= 15,
    );
    const valid = validJams(congested);
    return {
      type: "FeatureCollection" as const,
      features: valid.map((jam) => {
        const midIndex = Math.floor(jam.line!.length / 2);
        const midPoint = jam.line![midIndex];
        return {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: lineToCoords(jam.line!),
          },
          properties: {
            id: jam.id,
            level: Number(jam.level) || 0,
            speed: Number(jam.speed) || 0,
            delay: Number(jam.delay) || 0,
            length: Number(jam.length) || 0,
            street: jam.street || "Vía sin nombre",
            city: jam.city || "",
            roadType: Number(jam.roadType) || 0,
            color: getJamColor(Number(jam.level) || 0, Number(jam.speed) || 0),
            midLng: midPoint?.x || 0,
            midLat: midPoint?.y || 0,
            speedLabel: `${Math.round(jam.speed || 0)} km/h`,
            severityText: getJamSeverityText(
              Number(jam.level) || 0,
              Number(jam.speed) || 0,
            ),
          },
        };
      }),
    };
  }, [jams]);
}

// ─── Labels de velocidad en atascos ─────────────────────────────────

export function useJamLabelsGeoJSON(jams: TrafficJam[]): FC {
  return useMemo(() => {
    const congested = jams.filter(
      (j) => (j.level || 0) >= 3 || (j.speed || 0) <= 15,
    );
    return {
      type: "FeatureCollection" as const,
      features: congested
        .filter((j) => {
          if (!j.line || j.line.length < 2) return false;
          const midIndex = Math.floor(j.line.length / 2);
          return isValidPoint(j.line[midIndex]);
        })
        .map((jam) => {
          const midIndex = Math.floor(jam.line!.length / 2);
          const midPoint = jam.line![midIndex];
          return {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [midPoint.x, midPoint.y] as [number, number],
            },
            properties: {
              id: jam.id,
              speed: Number(jam.speed) || 0,
              level: Number(jam.level) || 0,
              delay: Number(jam.delay) || 0,
              length: Number(jam.length) || 0,
              street: jam.street || "Vía sin nombre",
              speedLabel: `${Math.round(Number(jam.speed) || 0)}`,
              delayLabel:
                (Number(jam.delay) || 0) > 60
                  ? `+${Math.round((Number(jam.delay) || 0) / 60)}min`
                  : "",
            },
          };
        }),
    };
  }, [jams]);
}

// ─── Cierres de camino (road closures) ──────────────────────────────

export function useRoadClosuresGeoJSON(incidents: Incident[], jams: TrafficJam[]): FC {
  return useMemo(() => {
    const closures = incidents.filter(
      (inc) =>
        inc.type.toLowerCase().includes("roadclosed") ||
        inc.type.toLowerCase().includes("road_closed"),
    );

    const features = closures.flatMap((closure) => {
      // Opción 1: Buscar jams con blockingAlertUuid coincidente
      let associatedJams = jams.filter(
        (jam) => jam.blockingAlertUuid === closure.id,
      );

      // Opción 2: Si no hay jams bloqueantes, buscar por calle y proximidad
      if (associatedJams.length === 0 && closure.street) {
        associatedJams = jams.filter((jam) => {
          if (!jam.line || jam.line.length < 2) return false;
          if (!jam.street || jam.street !== closure.street) return false;

          const jamStart = jam.line[0];
          const dx =
            (jamStart.x - closure.location.lng) *
            111320 *
            Math.cos((closure.location.lat * Math.PI) / 180);
          const dy = (jamStart.y - closure.location.lat) * 110540;
          const distance = Math.sqrt(dx * dx + dy * dy);

          return distance < 500; // 500 metros
        });
      }

      return associatedJams
        .filter((jam) => isValidLine(jam.line))
        .map((jam) => ({
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: lineToCoords(jam.line!),
          },
          properties: {
            closureId: closure.id,
            jamId: jam.id,
            type: "road_closure",
            color: "#dc2626",
            street: jam.street || closure.street,
            method: jam.blockingAlertUuid ? "blocking_uuid" : "proximity",
          },
        }));
    });

    return { type: "FeatureCollection" as const, features };
  }, [incidents, jams]);
}

// ─── Hitos Kilométricos ─────────────────────────────────────────────

interface KilometerMarker {
  longitude: number;
  latitude: number;
  name: string;
  route_name?: string | null;
}

export function useKilometersGeoJSON(kilometerMarkers: KilometerMarker[]): FC {
  return useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: kilometerMarkers.map((km) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [km.longitude, km.latitude] as [number, number],
        },
        properties: {
          name: km.name,
          route_name: km.route_name || "",
        },
      })),
    }),
    [kilometerMarkers],
  );
}
