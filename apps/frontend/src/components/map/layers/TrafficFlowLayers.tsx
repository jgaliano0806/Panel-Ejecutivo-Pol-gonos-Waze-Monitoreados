/**
 * TrafficFlowLayers.tsx — Capas de flujo de tráfico (memoizado).
 */
import React from "react";
import { Source, Layer } from "react-map-gl/maplibre";

interface TrafficFlowLayersProps {
  flowGeoJSON: GeoJSON.FeatureCollection;
  flowFluidGeoJSON: GeoJSON.FeatureCollection;
  mapLoaded: boolean;
}

export const TrafficFlowLayers: React.FC<TrafficFlowLayersProps> = React.memo(
  ({ flowGeoJSON, flowFluidGeoJSON, mapLoaded }) => {
    return (
      <>
        {/* Flujo de Tráfico - Capa base con gradiente.
            Oculta a zoom muy bajo: a z<10 los segmentos son <1px y solo
            queman GPU sin aportar info legible. */}
        <Source id="flow" type="geojson" data={flowGeoJSON as any}>
          {/* Borde/sombra sin blur (line-blur dispara render off-screen
              caro y a 7px de width casi no se nota visualmente). */}
          <Layer
            id="flow-line-border"
            type="line"
            minzoom={10}
            paint={{
              "line-color": "#000000",
              "line-width": 7,
              "line-opacity": 0.15,
            }}
            layout={{
              "line-cap": "round",
              "line-join": "round",
            }}
          />
          <Layer
            id="flow-line"
            type="line"
            minzoom={10}
            paint={{
              "line-color": ["get", "color"],
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 3,
                14, 5,
                18, 8,
              ],
              "line-opacity": 0.9,
            }}
            layout={{
              "line-cap": "round",
              "line-join": "round",
            }}
          />
        </Source>

        {/* Tráfico fluido (speed >= 50): línea verde animada */}
        {mapLoaded && (
          <Source id="flow-fluid" type="geojson" data={flowFluidGeoJSON as any}>
            <Layer
              id="flow-fluid-line"
              type="line"
              minzoom={10}
              paint={{
                "line-color": "#00c853",
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10, 4,
                  14, 6,
                  18, 10,
                ],
                "line-opacity": 0.95,
                "line-dasharray": [2, 4],
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
            />
          </Source>
        )}
      </>
    );
  },
);

TrafficFlowLayers.displayName = "TrafficFlowLayers";
