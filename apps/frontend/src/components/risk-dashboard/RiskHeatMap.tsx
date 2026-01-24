import React, { useMemo } from "react";
import Map, { Source, Layer, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useThemeStore } from "../../stores/useThemeStore";
import type { RiskScore } from "../../hooks/useRiskScoring";
import type { Polygon } from "../../types";
import * as turf from "@turf/turf";

interface RiskHeatMapProps {
  scores: RiskScore[];
  polygons: Polygon[];
}

const INITIAL_VIEW_STATE = {
  longitude: -64.1888, // Córdoba
  latitude: -31.4201,
  zoom: 11,
  pitch: 0,
  bearing: 0,
};

export const RiskHeatMap: React.FC<RiskHeatMapProps> = ({
  scores,
  polygons,
}) => {
  const isDark = useThemeStore((state) => state.isDark);

  const mapStyleUrl = isDark
    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

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

  return (
    <div className="w-full h-[600px] rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-veltrix-border relative">
      <Map
        initialViewState={INITIAL_VIEW_STATE}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyleUrl}
        attributionControl={false}
      >
        <NavigationControl position="top-right" showCompass={false} />

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
                2,
                9,
                20,
              ],
              "heatmap-opacity": 0.8,
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
      </Map>
    </div>
  );
};
