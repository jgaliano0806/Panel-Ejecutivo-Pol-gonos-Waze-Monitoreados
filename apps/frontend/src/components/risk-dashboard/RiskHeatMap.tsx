import React, { useMemo, useState, useCallback } from "react";
import Map, { Source, Layer, NavigationControl, Popup } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useThemeStore } from "../../stores/useThemeStore";
import type { RiskScore } from "../../hooks/useRiskScoring";
import type { Polygon } from "../../types";
import * as turf from "@turf/turf";
import { API_CONFIG } from "../../config/constants";

interface RiskHeatMapProps {
  scores: RiskScore[];
  polygons: Polygon[];
}

const INITIAL_VIEW_STATE = {
  longitude: -64.1888, // Córdoba
  latitude: -31.4201,
  zoom: 10,
  pitch: 0,
  bearing: 0,
};

// Función para obtener color basado en el nivel de riesgo
const getRiskColor = (riskScore: number): string => {
  if (riskScore >= 75) return "#ef4444"; // Crítico - Rojo
  if (riskScore >= 50) return "#f97316"; // Alto - Naranja
  if (riskScore >= 25) return "#eab308"; // Medio - Amarillo
  return "#22c55e"; // Bajo - Verde
};

const getRiskLevel = (riskScore: number): string => {
  if (riskScore >= 75) return "Crítico";
  if (riskScore >= 50) return "Alto";
  if (riskScore >= 25) return "Medio";
  return "Bajo";
};

export const RiskHeatMap: React.FC<RiskHeatMapProps> = ({
  scores,
  polygons,
}) => {
  const isDark = useThemeStore((state) => state.isDark);
  const [hoveredPolygon, setHoveredPolygon] = useState<{
    id: string;
    name: string;
    risk: number;
    lng: number;
    lat: number;
  } | null>(null);

  const tilesBase = API_CONFIG.tilesBase || "";
  const mapStyleUrl = {
    version: 8 as const,
    sources: {
      basemap: {
        type: "raster" as const,
        tiles: isDark
          ? [`${tilesBase}/tiles/carto-dark/{z}/{x}/{y}.png`]
          : [`${tilesBase}/tiles/carto-light/{z}/{x}/{y}.png`],
        tileSize: 256,
        attribution: "&copy; CARTO",
      },
    },
    layers: [
      // Fondo sólido: evita zócalos blancos mientras cargan los tiles raster
      {
        id: "background",
        type: "background" as const,
        paint: { "background-color": isDark ? "#1a1b2e" : "#e8e0d8" },
      },
      { id: "basemap", type: "raster" as const, source: "basemap" },
    ],
  };

  // Datos para el heatmap (centroides)
  const heatData = useMemo(() => {
    const features = scores
      .map((score) => {
        const polygon = polygons.find((p) => p.id === score.polygon_id);
        if (
          !polygon ||
          !polygon.geometry ||
          polygon.geometry.coordinates.length === 0
        )
          return null;

        // Calculate centroid for heatmap point
        try {
          const poly = turf.polygon(polygon.geometry.coordinates);
          const center = turf.centerOfMass(poly);
          return {
            type: "Feature",
            geometry: center.geometry,
            properties: {
              id: score.polygon_id,
              risk: score.final_risk_score, // Weight for heatmap
            },
          };
        } catch (e) {
          console.warn(
            "Error calculating center for polygon:",
            score.polygon_id,
          );
          return null;
        }
      })
      .filter(Boolean);

    return {
      type: "FeatureCollection",
      features,
    };
  }, [scores, polygons]);

  const heatFeatureCount = heatData.features.length;

  // Datos para los polígonos (geometría completa)
  const polygonsData = useMemo(() => {
    const features = polygons
      .map((polygon) => {
        if (!polygon.geometry || polygon.geometry.coordinates.length === 0)
          return null;

        const score = scores.find((s) => s.polygon_id === polygon.id);
        const riskScore = score?.final_risk_score || 0;

        return {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: polygon.geometry.coordinates,
          },
          properties: {
            id: polygon.id,
            name: polygon.name || polygon.id,
            risk: riskScore,
            color: getRiskColor(riskScore),
          },
        };
      })
      .filter(Boolean);

    return {
      type: "FeatureCollection",
      features,
    };
  }, [polygons, scores]);

  // Manejar hover sobre polígonos
  const onMouseMove = useCallback((event: any) => {
    const features = event.features;
    if (features && features.length > 0) {
      const feature = features[0];
      setHoveredPolygon({
        id: feature.properties.id,
        name: feature.properties.name,
        risk: feature.properties.risk,
        lng: event.lngLat.lng,
        lat: event.lngLat.lat,
      });
    }
  }, []);

  const onMouseLeave = useCallback(() => {
    setHoveredPolygon(null);
  }, []);

  return (
    <div className="relative w-full h-[600px] min-h-[600px] rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-veltrix-border">
      {/* absolute inset-0: evita altura 0 con % dentro de grid/flex; mapLib + reuseMaps: Vite + React StrictMode */}
      <div className="absolute inset-0 z-0">
        <Map
          mapLib={maplibregl}
          reuseMaps
          initialViewState={INITIAL_VIEW_STATE}
          style={{ width: "100%", height: "100%", minHeight: 600 }}
          mapStyle={mapStyleUrl}
          attributionControl={false}
          interactiveLayerIds={["polygon-fill-layer"]}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
        >
        <NavigationControl position="top-right" showCompass={false} />

        {/* Capa de Polígonos - Debajo del heatmap */}
        <Source id="polygons-source" type="geojson" data={polygonsData as any}>
          {/* Relleno de polígonos con color basado en riesgo */}
          <Layer
            id="polygon-fill-layer"
            type="fill"
            paint={{
              "fill-color": ["get", "color"],
              "fill-opacity": [
                "case",
                ["==", ["get", "id"], hoveredPolygon?.id || ""],
                0.5,
                0.25,
              ],
            }}
          />
          {/* Borde de polígonos */}
          <Layer
            id="polygon-outline-layer"
            type="line"
            paint={{
              "line-color": ["get", "color"],
              "line-width": [
                "case",
                ["==", ["get", "id"], hoveredPolygon?.id || ""],
                3,
                1.5,
              ],
              "line-opacity": 0.9,
            }}
          />
          {/* Etiquetas de polígonos */}
          <Layer
            id="polygon-labels"
            type="symbol"
            minzoom={11}
            layout={{
              "text-field": ["get", "name"],
              "text-size": 11,
              "text-anchor": "center",
              "text-allow-overlap": false,
              "text-ignore-placement": false,
            }}
            paint={{
              "text-color": isDark ? "#ffffff" : "#1f2937",
              "text-halo-color": isDark ? "#1f2937" : "#ffffff",
              "text-halo-width": 1.5,
            }}
          />
        </Source>

        {/* Capa de Heatmap - Encima de los polígonos */}
        <Source id="risk-heat" type="geojson" data={heatData as any}>
          {/* Heatmap Layer */}
          <Layer
            id="risk-heatmap-layer"
            type="heatmap"
            paint={{
              // Increase the heatmap weight based on risk score (0-100)
              "heatmap-weight": [
                "interpolate",
                ["linear"],
                ["get", "risk"],
                0,
                0,
                100,
                1,
              ],
              // Increase the heatmap intensity as zoom level increases
              "heatmap-intensity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0,
                1,
                15,
                3,
              ],
              // Color ramp for heatmap: Blue -> Green -> Yellow -> Red
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0,
                "rgba(33,102,172,0)", // Transparent
                0.2,
                "rgb(103,169,207)", // Blue
                0.4,
                "rgb(209,229,240)", // Light Blue
                0.6,
                "rgb(253,219,199)", // Light Orange
                0.8,
                "rgb(239,138,98)", // Orange
                1,
                "rgb(178,24,43)", // Red
              ],
              // Radius of influence
              "heatmap-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0,
                12,
                9,
                40,
                14,
                60,
              ],
              "heatmap-opacity": 0.78,
            }}
          />
          {/* Circle Layer for High Zoom */}
          <Layer
            id="risk-point"
            type="circle"
            minzoom={13}
            paint={{
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                13,
                4,
                16,
                10,
              ],
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "risk"],
                0,
                "rgba(33,102,172,0)",
                50,
                "rgb(209,229,240)",
                100,
                "rgb(178,24,43)",
              ],
              "circle-stroke-color": "white",
              "circle-stroke-width": 1,
              "circle-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                13,
                0,
                14,
                1,
              ],
            }}
          />
        </Source>

        {/* Popup al hacer hover */}
        {hoveredPolygon && (
          <Popup
            longitude={hoveredPolygon.lng}
            latitude={hoveredPolygon.lat}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
            offset={10}
          >
            <div className="p-2 min-w-[140px]">
              <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {hoveredPolygon.name}
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getRiskColor(hoveredPolygon.risk) }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Riesgo: <strong>{hoveredPolygon.risk.toFixed(0)}%</strong>
                </span>
              </div>
              <div
                className="text-xs mt-1 font-medium"
                style={{ color: getRiskColor(hoveredPolygon.risk) }}
              >
                Nivel: {getRiskLevel(hoveredPolygon.risk)}
              </div>
            </div>
          </Popup>
        )}
        </Map>
      </div>

      {heatFeatureCount === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-[5] flex justify-center px-4">
          <div className="rounded-lg bg-amber-500/90 px-3 py-2 text-center text-xs font-medium text-white shadow-md dark:bg-amber-600/90">
            Sin datos para el mapa de calor (sin tramos con geometría o scores
            coincidentes). Prueba ver todos los grupos, quita filtros de riesgo o
            pulsa Recalcular.
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div className="absolute bottom-4 left-4 z-[5] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
          Nivel de Riesgo
        </div>
        <div className="space-y-1">
          {[
            { color: "#22c55e", label: "Bajo (0-24%)" },
            { color: "#eab308", label: "Medio (25-49%)" },
            { color: "#f97316", label: "Alto (50-74%)" },
            { color: "#ef4444", label: "Crítico (75-100%)" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-4 h-3 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
