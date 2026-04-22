/**
 * RoadClosureLayers.tsx — Capas de cierres de camino (memoizado).
 */
import React from "react";
import { Source, Layer } from "react-map-gl/maplibre";

interface RoadClosureLayersProps {
  roadClosuresGeoJSON: GeoJSON.FeatureCollection;
}

export const RoadClosureLayers: React.FC<RoadClosureLayersProps> = React.memo(
  ({ roadClosuresGeoJSON }) => {
    return (
      <Source
        id="road-closures"
        type="geojson"
        data={roadClosuresGeoJSON as any}
      >
        {/* Línea roja gruesa para el cierre */}
        <Layer
          id="road-closure-lines"
          type="line"
          paint={{
            "line-color": ["get", "color"],
            "line-width": 8,
            "line-opacity": 0.85,
            "line-dasharray": [2, 3],
          }}
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
        />
        {/* Línea blanca punteada encima para contraste */}
        <Layer
          id="road-closure-dashed"
          type="line"
          paint={{
            "line-color": "#ffffff",
            "line-width": 3,
            "line-opacity": 0.7,
            "line-dasharray": [3, 3],
          }}
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
        />
      </Source>
    );
  },
);

RoadClosureLayers.displayName = "RoadClosureLayers";
