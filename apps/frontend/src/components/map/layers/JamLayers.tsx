/**
 * JamLayers.tsx — Capas de atascos/congestión severa (memoizado).
 */
import React from "react";
import { Source, Layer } from "react-map-gl/maplibre";

interface JamLayersProps {
  jamsGeoJSON: GeoJSON.FeatureCollection;
  jamLabelsGeoJSON: GeoJSON.FeatureCollection;
}

export const JamLayers: React.FC<JamLayersProps> = React.memo(
  ({ jamsGeoJSON, jamLabelsGeoJSON }) => {
    return (
      <>
        {/* Jams/Atascos - Capas con efecto Waze.
            Optimización: 2 capas de glow combinadas en 1 (line-blur de 6→2,
            que es ~9× más barato de renderizar en GPU manteniendo el efecto
            visual). minzoom 10 para no dibujar atascos invisibles a z<10. */}
        <Source id="jams-source" type="geojson" data={jamsGeoJSON as any}>
          {/* Glow unificado (antes: jams-outer-glow + jams-glow). */}
          <Layer
            id="jams-glow"
            type="line"
            minzoom={10}
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{
              "line-color": ["get", "color"],
              "line-width": [
                "interpolate", ["linear"], ["get", "level"],
                2, 10, 3, 13, 4, 17, 5, 22,
              ],
              "line-opacity": [
                "interpolate", ["linear"], ["get", "level"],
                2, 0.25, 5, 0.45,
              ],
              "line-blur": 2,
            }}
          />
          {/* Capa núcleo - línea principal */}
          <Layer
            id="jams-core"
            type="line"
            minzoom={10}
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{
              "line-color": ["get", "color"],
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                ["interpolate", ["linear"], ["get", "level"], 2, 3, 5, 5],
                14,
                ["interpolate", ["linear"], ["get", "level"], 2, 4, 5, 7],
                18,
                ["interpolate", ["linear"], ["get", "level"], 2, 6, 5, 10],
              ],
              "line-opacity": 1,
            }}
          />
          {/* Patrón animado para indicar dirección - solo a zoom alto
              (a z<12 las líneas son tan finas que el dash no se distingue). */}
          <Layer
            id="jams-animated"
            type="line"
            minzoom={12}
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{
              "line-color": "#ffffff",
              "line-width": [
                "interpolate", ["linear"], ["get", "level"],
                2, 1, 5, 2,
              ],
              "line-opacity": [
                "interpolate", ["linear"], ["get", "level"],
                2, 0.3, 5, 0.6,
              ],
              "line-dasharray": [0.5, 3],
            }}
          />
        </Source>

        {/* Etiquetas de velocidad en atascos severos */}
        <Source
          id="jam-labels-source"
          type="geojson"
          data={jamLabelsGeoJSON as any}
        >
          {/* Fondo del label */}
          <Layer
            id="jam-labels-bg"
            type="circle"
            minzoom={13}
            paint={{
              "circle-radius": [
                "interpolate", ["linear"], ["zoom"],
                13, 10, 16, 14,
              ],
              "circle-color": [
                "case",
                ["<", ["get", "speed"], 5], "#b71c1c",
                ["<", ["get", "speed"], 15], "#c62828",
                ["<", ["get", "speed"], 25], "#e53935",
                "#ff7043",
              ],
              "circle-opacity": 0.95,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            }}
          />
          {/* Texto de velocidad */}
          <Layer
            id="jam-labels-text"
            type="symbol"
            minzoom={13}
            layout={{
              "text-field": ["get", "speedLabel"],
              "text-size": [
                "interpolate", ["linear"], ["zoom"],
                13, 9, 16, 12,
              ],
              "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
              "text-allow-overlap": true,
              "text-ignore-placement": true,
            }}
            paint={{
              "text-color": "#ffffff",
              "text-halo-color": "rgba(0,0,0,0.3)",
              "text-halo-width": 1,
            }}
          />
          {/* Label de demora */}
          <Layer
            id="jam-delay-labels"
            type="symbol"
            minzoom={14}
            layout={{
              "text-field": ["get", "delayLabel"],
              "text-size": 10,
              "text-font": ["Open Sans Semibold", "Arial Unicode MS Regular"],
              "text-offset": [0, 1.8],
              "text-allow-overlap": false,
            }}
            paint={{
              "text-color": "#ffcdd2",
              "text-halo-color": "rgba(0,0,0,0.7)",
              "text-halo-width": 1,
            }}
          />
        </Source>
      </>
    );
  },
);

JamLayers.displayName = "JamLayers";
