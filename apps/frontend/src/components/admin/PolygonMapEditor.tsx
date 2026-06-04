/**
 * Editor de polígonos interactivo con Leaflet + Leaflet.draw
 * Modos: Crear, Editar, Eliminar
 * Validaciones: anti auto-intersección, anti superposición (Turf.js)
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import {
  validatePolygon,
  type ValidationResult,
} from "../../utils/polygonValidation";
import { API_CONFIG, TILES_VERSION } from "../../config/constants";

const getCartoLight = () => `${API_CONFIG.tilesBase || ""}/tiles/v2/carto-light/{z}/{x}/{y}.png?v=${TILES_VERSION}`;
const getCartoDark = () => `${API_CONFIG.tilesBase || ""}/tiles/v2/carto-dark/{z}/{x}/{y}.png?v=${TILES_VERSION}`;
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://carto.com">CARTO</a>';

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
const CONFLICT_STYLE = {
  color: "#f44336",
  fillColor: "#f44336",
  fillOpacity: 0.5,
  weight: 3,
};
const DRAW_STYLE = {
  color: "#22c55e",
  fillColor: "#22c55e",
  fillOpacity: 0.4,
  weight: 2,
};

export interface PolygonGeo {
  id: string;
  name: string;
  group?: string;
  feedUrl: string;
  tvtFeedUrl?: string;
  coordinates?: { lat: number; lon: number };
  geometry: GeoJSON.Polygon;
}

interface PolygonMapEditorProps {
  polygons: PolygonGeo[];
  darkMode?: boolean;
  onPolygonsChange: (polygons: PolygonGeo[]) => void;
  onCreateRequest: (geometry: GeoJSON.Polygon) => void;
  onEditRequest: (polygon: PolygonGeo) => void;
  onEditGeometry?: (polygonId: string, geometry: GeoJSON.Polygon) => void;
  onDeleteRequest: (polygonId: string) => void;
  onValidationError?: (result: ValidationResult) => void;
  selectedPolygonId: string | null;
  conflictPolygonId?: string | null;
}

export const PolygonMapEditor: React.FC<PolygonMapEditorProps> = ({
  polygons,
  darkMode = false,
  onPolygonsChange,
  onCreateRequest,
  onEditRequest,
  onEditGeometry,
  onDeleteRequest,
  onValidationError,
  selectedPolygonId,
  conflictPolygonId,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const refLayerRef = useRef<L.GeoJSON | null>(null);
  const editLayerRef = useRef<L.FeatureGroup | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const drawHandlerRef = useRef<L.Draw.Polygon | null>(null);
  const layersByIdRef = useRef<Map<string, L.Polygon>>(new Map());

  const [drawMode, setDrawMode] = useState(false);

  const tileUrl = darkMode ? getCartoDark() : getCartoLight();

  const geoJsonToLeafletLatLngs = useCallback(
    (coords: number[][][]): L.LatLng[][] => {
      return coords.map((ring) =>
        ring.map(([lng, lat]) => L.latLng(lat, lng))
      );
    },
    []
  );

  const leafletToGeoJson = useCallback((latlngs: L.LatLng[][]): GeoJSON.Polygon => {
    const outer = latlngs[0].map((ll) => [ll.lng, ll.lat] as [number, number]);
    if (outer.length > 0 && (outer[0][0] !== outer[outer.length - 1][0] || outer[0][1] !== outer[outer.length - 1][1])) {
      outer.push(outer[0]);
    }
    return { type: "Polygon", coordinates: [outer] };
  }, []);

  const createRefLayer = useCallback(() => {
    if (!mapRef.current) return;
    if (refLayerRef.current) {
      mapRef.current.removeLayer(refLayerRef.current);
    }
    const geoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: polygons
        .filter((p) => p.geometry?.coordinates && p.id !== selectedPolygonId)
        .map((p) => ({
          type: "Feature" as const,
          properties: { id: p.id },
          geometry: {
            type: "Polygon" as const,
            coordinates: p.geometry.coordinates,
          },
        })),
    };
    const geoJsonLayer = L.geoJSON(geoJson, {
      style: (feat) => {
        const id = feat?.properties?.id;
        if (id === conflictPolygonId) return CONFLICT_STYLE;
        return REF_STYLE;
      },
      onEachFeature: (feat, layer) => {
        const id = feat.properties?.id;
        if (id) layersByIdRef.current.set(id, layer as L.Polygon);
        if (!drawMode) {
          (layer as L.Polygon).on("click", () => onEditRequest(polygons.find((p) => p.id === id)!));
        }
      },
    });
    geoJsonLayer.addTo(mapRef.current);
    refLayerRef.current = geoJsonLayer;
    if (editLayerRef.current) {
      mapRef.current.removeLayer(editLayerRef.current);
      mapRef.current.addLayer(editLayerRef.current);
    }
  }, [polygons, selectedPolygonId, conflictPolygonId, drawMode, onEditRequest]);

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

    map.on(L.Draw.Event.CREATED, (e: L.LeafletEvent & { layer: L.Polygon }) => {
      const layer = e.layer as L.Polygon;
      const latlngs = layer.getLatLngs() as L.LatLng[][];
      const geometry = leafletToGeoJson(latlngs);
      const result = validatePolygon(
        geometry,
        polygons.map((p) => ({ id: p.id, geometry: p.geometry }))
      );
      layer.remove();
      if (!result.valid) {
        onValidationError?.(result);
        return;
      }
      onCreateRequest(geometry);
      setDrawMode(false);
      if (drawHandlerRef.current) {
        drawHandlerRef.current.disable();
      }
    });

    mapRef.current = map;
    return () => {
      if (drawControlRef.current && mapRef.current) {
        mapRef.current.removeControl(drawControlRef.current);
      }
      if (drawHandlerRef.current) drawHandlerRef.current.disable();
      map.remove();
      mapRef.current = null;
      refLayerRef.current = null;
      editLayerRef.current = null;
      layersByIdRef.current.clear();
    };
  }, []);

  const tileLayerRef = useRef<L.TileLayer | null>(null);
  useEffect(() => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }
    const tile = L.tileLayer(tileUrl, { attribution: CARTO_ATTRIBUTION });
    tile.addTo(mapRef.current);
    tileLayerRef.current = tile;
  }, [tileUrl]);

  useEffect(() => {
    createRefLayer();
  }, [createRefLayer]);

  useEffect(() => {
    if (!mapRef.current || !refLayerRef.current) return;
    const allLatLngs: L.LatLng[] = [];
    polygons.forEach((p) => {
      if (p.geometry?.coordinates?.[0]) {
        p.geometry.coordinates[0].forEach((c: number[]) => {
          const [lng, lat] = c;
          allLatLngs.push(L.latLng(lat, lng));
        });
      }
    });
    if (allLatLngs.length >= 2) {
      mapRef.current.fitBounds(L.latLngBounds(allLatLngs), { padding: [50, 50], maxZoom: 14 });
    }
  }, [polygons]);

  const editHandlerRef = useRef<L.Handler | null>(null);

  useEffect(() => {
    if (!mapRef.current || !editLayerRef.current) return;
    const sel = polygons.find((p) => p.id === selectedPolygonId);
    if (!sel?.geometry?.coordinates) {
      editLayerRef.current.clearLayers();
      if (editHandlerRef.current) {
        editHandlerRef.current.disable();
        editHandlerRef.current = null;
      }
      return;
    }
    editLayerRef.current.clearLayers();
    if (editHandlerRef.current) {
      editHandlerRef.current.disable();
      editHandlerRef.current = null;
    }
    const latlngs = geoJsonToLeafletLatLngs(sel.geometry.coordinates);
    const poly = L.polygon(latlngs, ACTIVE_STYLE);
    (poly as any)._polygonId = sel.id;
    editLayerRef.current.addLayer(poly);

    const EditPoly = (L as any).Edit?.Poly;
    if (EditPoly) {
      const editHandler = new EditPoly(poly, { poly: { allowIntersection: false } });
      editHandlerRef.current = editHandler;
      editHandler.enable();

      poly.on("edit", () => {
        const newLatlngs = poly.getLatLngs() as L.LatLng[][];
        const newGeom = leafletToGeoJson(newLatlngs);
        const result = validatePolygon(
          newGeom,
          polygons.filter((p) => p.id !== sel.id).map((p) => ({ id: p.id, geometry: p.geometry })),
          sel.id
        );
        if (result.valid) {
          onEditGeometry?.(sel.id, newGeom);
          onEditRequest({ ...sel, geometry: newGeom });
        }
      });
    }
  }, [selectedPolygonId, polygons, geoJsonToLeafletLatLngs, leafletToGeoJson, onEditRequest]);

  const handleStartDraw = () => {
    if (!mapRef.current) return;
    setDrawMode(true);
    if (drawHandlerRef.current) drawHandlerRef.current.disable();
    const handler = new L.Draw.Polygon(mapRef.current as any, {
      allowIntersection: false,
      showArea: true,
      shapeOptions: DRAW_STYLE,
      repeatMode: false,
    });
    drawHandlerRef.current = handler;
    handler.enable();
  };

  const handleCancelDraw = () => {
    setDrawMode(false);
    if (drawHandlerRef.current) {
      drawHandlerRef.current.disable();
      drawHandlerRef.current = null;
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <button
          type="button"
          onClick={handleStartDraw}
          disabled={!!selectedPolygonId}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg shadow-lg flex items-center gap-2"
        >
          <span>+</span> Crear Polígono
        </button>
        {drawMode && (
          <button
            type="button"
            onClick={handleCancelDraw}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow-lg"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
};
