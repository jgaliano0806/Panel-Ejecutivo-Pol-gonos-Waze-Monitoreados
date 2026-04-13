import React, { useEffect, useMemo, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import type { MapMouseEvent, MapLayerMouseEvent } from "maplibre-gl";
import { Source, Layer } from "react-map-gl/maplibre";
import { kinks, polygon } from "@turf/turf";
import { useDangerZoneStore } from "@/stores/useDangerZoneStore";
import { Check, X, Undo2 } from "lucide-react";

const POINTS_LAYER_ID = "drawing-points";
const FILL_LAYER_ID = "drawing-fill";
const LINE_LAYER_ID = "drawing-line";

function ringIsSimple(pts: [number, number][]): boolean {
  if (pts.length < 3) return true;
  try {
    return kinks(polygon([[...pts, pts[0]]])).features.length === 0;
  } catch {
    return false;
  }
}

export const DangerZoneEditor: React.FC<{ map: maplibregl.Map }> = ({ map }) => {
  const isDrawing = useDangerZoneStore((s) => s.isDrawing);
  const drawingPoints = useDangerZoneStore((s) => s.drawingPoints);
  const addDrawingPoint = useDangerZoneStore((s) => s.addDrawingPoint);
  const updateDrawingPoint = useDangerZoneStore((s) => s.updateDrawingPoint);
  const removeLastDrawingPoint = useDangerZoneStore((s) => s.removeLastDrawingPoint);
  const clearDrawingPoints = useDangerZoneStore((s) => s.clearDrawingPoints);
  const setDrawing = useDangerZoneStore((s) => s.setDrawing);
  const setTempGeometry = useDangerZoneStore((s) => s.setTempGeometry);
  const setShowPanel = useDangerZoneStore((s) => s.setShowPanel);

  const dragIndexRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const polygonSimple = useMemo(() => ringIsSimple(drawingPoints), [drawingPoints]);

  const geojson = useMemo(() => {
    if (drawingPoints.length === 0) return null;
    const showFill = drawingPoints.length >= 3 && polygonSimple;
    const closed = drawingPoints.length >= 3 ? [...drawingPoints, drawingPoints[0]] : drawingPoints;

    return {
      type: "FeatureCollection" as const,
      features: [
        ...(showFill
          ? [{
              type: "Feature" as const,
              geometry: { type: "Polygon" as const, coordinates: [closed] },
              properties: { type: "area" },
            }]
          : []),
        ...(drawingPoints.length >= 2
          ? [{
              type: "Feature" as const,
              geometry: { type: "LineString" as const, coordinates: drawingPoints },
              properties: { type: "edge" },
            }]
          : []),
        ...drawingPoints.map((pt, i) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: pt },
          properties: { index: i, type: "vertex" },
        })),
      ],
    };
  }, [drawingPoints, polygonSimple]);

  const onMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (suppressClickRef.current) { suppressClickRef.current = false; return; }
      if (dragIndexRef.current !== null) return;
      const hits = map.queryRenderedFeatures(e.point, { layers: [POINTS_LAYER_ID] });
      if (hits.length > 0) return;
      addDrawingPoint([e.lngLat.lng, e.lngLat.lat]);
    },
    [map, addDrawingPoint],
  );

  const endDrag = useCallback(() => {
    if (dragIndexRef.current !== null) {
      suppressClickRef.current = true;
      dragIndexRef.current = null;
      map.dragPan.enable();
      map.getCanvas().style.cursor = "";
    }
  }, [map]);

  useEffect(() => {
    if (!isDrawing || !map) return;

    const onVertexDown = (e: MapLayerMouseEvent) => {
      e.preventDefault();
      const raw = e.features?.[0]?.properties?.index;
      const idx = typeof raw === "number" ? raw : typeof raw === "string" ? parseInt(raw, 10) : NaN;
      if (Number.isNaN(idx)) return;
      dragIndexRef.current = idx;
      map.dragPan.disable();
      map.getCanvas().style.cursor = "grabbing";
    };

    const onMouseMove = (e: MapMouseEvent) => {
      if (dragIndexRef.current === null) return;
      updateDrawingPoint(dragIndexRef.current, [e.lngLat.lng, e.lngLat.lat]);
    };

    const onMouseUp = () => endDrag();
    const onPointEnter = () => { if (dragIndexRef.current === null) map.getCanvas().style.cursor = "grab"; };
    const onPointLeave = () => { if (dragIndexRef.current === null) map.getCanvas().style.cursor = ""; };

    map.on("click", onMapClick);
    map.on("mousedown", POINTS_LAYER_ID, onVertexDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);
    map.on("mouseenter", POINTS_LAYER_ID, onPointEnter);
    map.on("mouseleave", POINTS_LAYER_ID, onPointLeave);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      map.off("click", onMapClick);
      map.off("mousedown", POINTS_LAYER_ID, onVertexDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);
      map.off("mouseenter", POINTS_LAYER_ID, onPointEnter);
      map.off("mouseleave", POINTS_LAYER_ID, onPointLeave);
      window.removeEventListener("mouseup", onMouseUp);
      map.dragPan.enable();
      map.getCanvas().style.cursor = "";
    };
  }, [isDrawing, map, onMapClick, endDrag, updateDrawingPoint]);

  if (!isDrawing) return null;

  const handleFinish = () => {
    if (drawingPoints.length < 3) return;
    if (!ringIsSimple(drawingPoints)) {
      window.alert("El polígono se cruza a sí mismo. Arrastra los vértices blancos para corregirlo.");
      return;
    }
    setTempGeometry({ type: "Polygon", coordinates: [[...drawingPoints, drawingPoints[0]]] as any });
    setDrawing(false);
    setShowPanel(true);
  };

  const handleCancel = () => { setDrawing(false); clearDrawingPoints(); };

  return (
    <>
      {geojson && (
        <Source id="drawing-source" type="geojson" data={geojson as GeoJSON.GeoJSON}>
          <Layer id={FILL_LAYER_ID} type="fill" filter={["==", ["get", "type"], "area"]} paint={{ "fill-color": "#DC2626", "fill-opacity": 0.2 }} />
          <Layer id={LINE_LAYER_ID} type="line" filter={["==", ["get", "type"], "edge"]} paint={{ "line-color": "#DC2626", "line-width": 2, "line-dasharray": [2, 1] }} />
          <Layer id={POINTS_LAYER_ID} type="circle" filter={["==", ["get", "type"], "vertex"]} paint={{ "circle-radius": 8, "circle-color": "#FFFFFF", "circle-stroke-width": 2, "circle-stroke-color": "#DC2626" }} />
        </Source>
      )}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[5000] flex gap-2 max-w-[min(96vw,520px)]">
        <div className="bg-white dark:bg-slate-800 rounded-full shadow-2xl border border-gray-200 dark:border-slate-700 px-4 py-2 flex flex-wrap items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-300 max-w-[220px]">
            {drawingPoints.length === 0 ? "Clic en el mapa para añadir vértices"
              : drawingPoints.length < 3 ? "Mínimo 3 puntos"
              : !polygonSimple ? "Polígono inválido (cruces): arrastra los puntos"
              : `${drawingPoints.length} vértices — arrastra para ajustar`}
          </p>
          <div className="flex items-center gap-1.5 border-l border-gray-100 dark:border-slate-700 pl-3">
            <button type="button" onClick={() => removeLastDrawingPoint()} disabled={drawingPoints.length === 0} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 transition-colors disabled:opacity-40" title="Deshacer último vértice"><Undo2 className="h-4 w-4" /></button>
            <button type="button" onClick={handleCancel} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 transition-colors" title="Cancelar dibujo"><X className="h-4 w-4" /></button>
            <button type="button" onClick={handleFinish} disabled={drawingPoints.length < 3 || !polygonSimple} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Check className="h-3.5 w-3.5" />Finalizar</button>
          </div>
        </div>
      </div>
    </>
  );
};
