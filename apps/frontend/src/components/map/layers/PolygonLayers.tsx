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
        {/* minzoom 8: a z<8 los polígonos miden 1-2px, no aportan info y
            cargan triangulación + fill innecesariamente. */}
        <Layer
          id="polygons-fill"
          type="fill"
          minzoom={8}
          paint={{
            "fill-color": ["get", "color"],
            "fill-opacity": isDark ? 0.1 : 0.2,
          }}
        />
        <Layer
          id="polygons-border"
          type="line"
          minzoom={8}
          paint={{
            "line-color": ["get", "color"],
            "line-width": 1,
            "line-opacity": isDark ? 0.5 : 0.7,
          }}
        />
        {selectedPolygon && (
          <Layer
            id="polygons-selected"
            type="line"
            minzoom={8}
            filter={["==", ["get", "id"], selectedPolygon]}
            paint={{
              "line-color": "#6366f1",
              "line-width": 4,
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
