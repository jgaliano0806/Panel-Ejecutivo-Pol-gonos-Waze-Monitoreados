/**
 * PolygonLayers.tsx — Capas de polígonos del mapa (memoizado).
 */
import React from "react";
import { Source, Layer } from "react-map-gl/maplibre";

interface PolygonLayersProps {
  polygonsGeoJSON: GeoJSON.FeatureCollection;
  selectedPolygon: string | null | undefined;
  isDark: boolean;
}

export const PolygonLayers: React.FC<PolygonLayersProps> = React.memo(
  ({ polygonsGeoJSON, selectedPolygon, isDark }) => {
    return (
      <Source
        id="polygons-source"
        type="geojson"
        data={polygonsGeoJSON as any}
      >
        {/* Relleno solo desde z8 (triangulación costosa sin valor a zoom lejano). */}
        <Layer
          id="polygons-fill"
          type="fill"
          minzoom={8}
          paint={{
            "fill-color": ["get", "color"],
            "fill-opacity": isDark ? 0.1 : 0.2,
          }}
        />
        {/* Contorno siempre visible (sin minzoom); ancho mayor a zoom bajo para legibilidad. */}
        <Layer
          id="polygons-border"
          type="line"
          layout={{ "line-join": "round", "line-cap": "round" }}
          paint={{
            "line-color": ["get", "color"],
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              5,
              2.5,
              8,
              2,
              12,
              1.5,
              16,
              2,
            ],
            "line-opacity": isDark ? 0.65 : 0.85,
          }}
        />
        {selectedPolygon && (
          <Layer
            id="polygons-selected"
            type="line"
            filter={["==", ["get", "id"], selectedPolygon]}
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{
              "line-color": "#6366f1",
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                5,
                4,
                12,
                4,
                16,
                5,
              ],
              "line-opacity": 1,
            }}
          />
        )}
        {selectedPolygon && (
          <Layer
            id="polygons-selected-fill"
            type="fill"
            minzoom={8}
            filter={["==", ["get", "id"], selectedPolygon]}
            paint={{
              "fill-color": "#6366f1",
              "fill-opacity": isDark ? 0.25 : 0.35,
            }}
          />
        )}
      </Source>
    );
  },
);

PolygonLayers.displayName = "PolygonLayers";
