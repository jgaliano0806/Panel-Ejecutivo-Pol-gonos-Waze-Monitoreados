/**
 * Editor de polígono embebido para modales.
 * Muestra un mapa con el polígono actual editable.
 */
import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import { validatePolygon, tryAutoAdjustOverlap } from "../../utils/polygonValidation";

const CARTO_LIGHT =
  "https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png";
const CARTO_DARK =
  "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png";
const CARTO_ATTRIBUTION = '&copy; <a href="https://carto.com">CARTO</a>';

const REF_STYLE = {
  color: "#999",
  fillColor: "#ccc",
  fillOpacity: 0.3,
  weight: 1,
};
const ACTIVE_STYLE = {
  color: "#2196F3",
  fillColor: "#2196F3",
  fillOpacity: 0.4,
  weight: 3,
};

interface PolygonMapEditorInlineProps {
  geometry: GeoJSON.Polygon | null;
  otherPolygons: Array<{ id: string; geometry: GeoJSON.Polygon }>;
  excludeId?: string;
  darkMode?: boolean;
  height?: string;
  onGeometryChange: (geometry: GeoJSON.Polygon) => void;
  onValidationError?: (message: string) => void;
  onGeometryAutoAdjusted?: (message: string) => void;
}

export const PolygonMapEditorInline: React.FC<PolygonMapEditorInlineProps> = ({
  geometry,
  otherPolygons,
  excludeId,
  darkMode = false,
  height = "300px",
  onGeometryChange,
  onValidationError,
  onGeometryAutoAdjusted,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const refLayerRef = useRef<L.GeoJSON | null>(null);
  const editLayerRef = useRef<L.FeatureGroup | null>(null);
  const polyRef = useRef<L.Polygon | null>(null);
  const editHandlerRef = useRef<L.Handler | null>(null);
  const onGeometryChangeRef = useRef(onGeometryChange);
  const onValidationErrorRef = useRef(onValidationError);
  const onGeometryAutoAdjustedRef = useRef(onGeometryAutoAdjusted);
  onGeometryChangeRef.current = onGeometryChange;
  onValidationErrorRef.current = onValidationError;
  onGeometryAutoAdjustedRef.current = onGeometryAutoAdjusted;

  const tileUrl = darkMode ? CARTO_DARK : CARTO_LIGHT;

  const geoJsonToLeafletLatLngs = (coords: number[][][]): L.LatLng[][] =>
    coords.map((ring) => ring.map(([lng, lat]) => L.latLng(lat, lng)));

  const leafletToGeoJson = (latlngs: L.LatLng[][]): GeoJSON.Polygon => {
    const outer = latlngs[0].map((ll) => [ll.lng, ll.lat] as [number, number]);
    if (
      outer.length > 0 &&
      (outer[0][0] !== outer[outer.length - 1][0] ||
        outer[0][1] !== outer[outer.length - 1][1])
    ) {
      outer.push(outer[0]);
    }
    return { type: "Polygon", coordinates: [outer] };
  };

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-31.4, -64.2],
      zoom: 10,
      zoomControl: false,
    });
    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer(tileUrl, { attribution: CARTO_ATTRIBUTION }).addTo(map);

    const editLayer = new L.FeatureGroup();
    map.addLayer(editLayer);
    editLayerRef.current = editLayer;
    mapRef.current = map;

    return () => {
      if (editHandlerRef.current) editHandlerRef.current.disable();
      map.remove();
      mapRef.current = null;
      refLayerRef.current = null;
      editLayerRef.current = null;
      polyRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const tiles = mapRef.current.getPanes()?.tilePane?.querySelectorAll(".leaflet-tile-layer");
    if (tiles?.length) {
      mapRef.current.eachLayer((l) => {
        if (l instanceof L.TileLayer) mapRef.current!.removeLayer(l);
      });
      L.tileLayer(tileUrl, { attribution: CARTO_ATTRIBUTION }).addTo(mapRef.current);
    }
  }, [tileUrl]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (refLayerRef.current) {
      mapRef.current.removeLayer(refLayerRef.current);
      refLayerRef.current = null;
    }

    const others = otherPolygons.filter((p) => p.id !== excludeId && p.geometry?.coordinates);
    if (others.length === 0) {
      refLayerRef.current = null;
      return;
    }

    const geoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: others.map((p) => ({
        type: "Feature" as const,
        properties: { id: p.id },
        geometry: { type: "Polygon" as const, coordinates: p.geometry.coordinates },
      })),
    };

    const layer = L.geoJSON(geoJson, {
      style: () => REF_STYLE,
    });
    layer.addTo(mapRef.current);
    refLayerRef.current = layer;
  }, [otherPolygons, excludeId]);

  useEffect(() => {
    if (!mapRef.current || !editLayerRef.current) return;

    editLayerRef.current.clearLayers();
    if (editHandlerRef.current) {
      editHandlerRef.current.disable();
      editHandlerRef.current = null;
    }
    polyRef.current = null;

    if (!geometry?.coordinates?.[0] || geometry.coordinates[0].length < 3) return;

    const latlngs = geoJsonToLeafletLatLngs(geometry.coordinates);
    const poly = L.polygon(latlngs, ACTIVE_STYLE);
    editLayerRef.current.addLayer(poly);
    polyRef.current = poly;

    mapRef.current.fitBounds(poly.getBounds(), { padding: [20, 20], maxZoom: 16 });

    const EditPoly = (L as any).Edit?.Poly;
    if (EditPoly) {
      const editHandler = new EditPoly(poly, { poly: { allowIntersection: false } });
      editHandlerRef.current = editHandler;
      editHandler.enable();

      poly.on("edit", () => {
        const newLatlngs = poly.getLatLngs() as L.LatLng[][];
        const newGeom = leafletToGeoJson(newLatlngs);
        const result = validatePolygon(newGeom, otherPolygons, excludeId);
        if (result.valid) {
          onGeometryChangeRef.current(newGeom);
        } else if (result.overlappingPolygonId) {
          const adjusted = tryAutoAdjustOverlap(newGeom, otherPolygons, excludeId);
          if (adjusted) {
            onGeometryChangeRef.current(adjusted.geometry);
            onGeometryAutoAdjustedRef.current?.(
              `Polígono auto-ajustado para evitar superposición con ${adjusted.adjustedFrom}`
            );
          } else {
            onValidationErrorRef.current?.(result.error || "Error de validación");
          }
        } else {
          onValidationErrorRef.current?.(result.error || "Error de validación");
        }
      });
    }
  }, [geometry, otherPolygons, excludeId]);

  if (!geometry?.coordinates?.[0] || geometry.coordinates[0].length < 3) {
    return (
      <div
        className="rounded-lg border border-gray-200 dark:border-veltrix-border bg-gray-50 dark:bg-veltrix-bg flex items-center justify-center text-gray-500 dark:text-veltrix-muted text-sm"
        style={{ height }}
      >
        Ingresa geometría GeoJSON para editar en el mapa
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-lg overflow-hidden border border-gray-200 dark:border-veltrix-border"
      style={{ height }}
    />
  );
};
