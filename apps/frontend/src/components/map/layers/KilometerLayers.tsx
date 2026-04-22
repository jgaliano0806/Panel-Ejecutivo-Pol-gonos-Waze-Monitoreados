/**
 * KilometerLayers.tsx — Capas de hitos kilométricos (memoizado).
 */
import React from "react";
import { Source, Layer } from "react-map-gl/maplibre";

interface KilometerLayersProps {
  kilometersGeoJSON: GeoJSON.FeatureCollection;
  isDark: boolean;
}

export const KilometerLayers: React.FC<KilometerLayersProps> = React.memo(
  ({ kilometersGeoJSON, isDark }) => {
    if (kilometersGeoJSON.features.length === 0) return null;

    return (
      <Source
        id="kilometer-markers"
        type="geojson"
        data={kilometersGeoJSON}
      >
        <Layer
          id="km-circles"
          type="circle"
          minzoom={13}
          paint={{
            "circle-radius": 5,
            "circle-color": "#06b6d4",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.9,
          }}
        />
        <Layer
          id="km-labels"
          type="symbol"
          minzoom={14}
          layout={{
            "text-field": ["get", "name"],
            "text-size": 11,
            "text-offset": [0, 1.5],
            "text-anchor": "top",
            "text-allow-overlap": false,
          }}
          paint={{
            "text-color": isDark ? "#67e8f9" : "#0891b2",
            "text-halo-color": isDark
              ? "rgba(0,0,0,0.8)"
              : "rgba(255,255,255,0.9)",
            "text-halo-width": 1.5,
          }}
        />
      </Source>
    );
  },
);

KilometerLayers.displayName = "KilometerLayers";
