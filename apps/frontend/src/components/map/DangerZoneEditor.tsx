import React, { useEffect, useMemo, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import type { MapMouseEvent, MapLayerMouseEvent } from "maplibre-gl";
import { Source, Layer } from "react-map-gl/maplibre";
import { useDangerZoneStore } from "@/stores/useDangerZoneStore";
import {
  insertAfterSegmentCopy,
  isClosedRingSimple,
} from "@/utils/dangerZonePolygon";
import { Check, X, Undo2 } from "lucide-react";

const POINTS_LAYER_ID = "drawing-points";
const FILL_LAYER_ID = "drawing-fill";
const LINE_LAYER_ID = "drawing-line";
/** Distancia máx. en px del clic al segmento para insertar vértice */
const EDGE_HIT_PX = 14;
/** Si el clic está más cerca de un vértice que esto (px), no insertar en arista */
const VERTEX_GUARD_PX = 10;
/** Si al soltar el primer vértice te moviste menos que esto (px), se interpreta como “cerrar” */
const CLOSE_POLYGON_DRAG_THRESHOLD_PX = 8;

function minVertexDistancePx(
  map: maplibregl.Map,
  pts: [number, number][],
  lng: number,
  lat: number,
): number {
  const p = map.project([lng, lat]);
  let d = Infinity;
  for (const pt of pts) {
    const v = map.project(pt);
    d = Math.min(d, Math.hypot(p.x - v.x, p.y - v.y));
  }
  return d;
}

/** Mejor punto sobre la polilínea (incluye arista de cierre último → primero si n ≥ 3). */
function nearestInsertOnDrawingRing(
  map: maplibregl.Map,
  pts: [number, number][],
  lng: number,
  lat: number,
): { segmentStart: number; lng: number; lat: number; distPx: number } | null {
  const n = pts.length;
  if (n < 2) return null;
  const pClick = map.project([lng, lat]);
  let best: { segmentStart: number; lng: number; lat: number; distPx: number } | null = null;

  const consider = (i: number, a: [number, number], b: [number, number]) => {
    const pa = map.project(a);
    const pb = map.project(b);
    const abx = pb.x - pa.x;
    const aby = pb.y - pa.y;
    const apx = pClick.x - pa.x;
    const apy = pClick.y - pa.y;
    const ab2 = abx * abx + aby * aby;
    const t = ab2 < 1e-8 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
    const cx = pa.x + t * abx;
    const cy = pa.y + t * aby;
    const dist = Math.hypot(pClick.x - cx, pClick.y - cy);
    if (!best || dist < best.distPx) {
      const c = map.unproject({ x: cx, y: cy } as maplibregl.Point);
      best = { segmentStart: i, lng: c.lng, lat: c.lat, distPx: dist };
    }
  };

  for (let i = 0; i < n - 1; i++) {
    consider(i, pts[i]!, pts[i + 1]!);
  }
  if (n >= 3) {
    consider(n - 1, pts[n - 1]!, pts[0]!);
  }
  return best;
}

export const DangerZoneEditor: React.FC<{ map: maplibregl.Map }> = ({ map }) => {
  const isDrawing = useDangerZoneStore((s) => s.isDrawing);
  const drawingPoints = useDangerZoneStore((s) => s.drawingPoints);
  const addDrawingPoint = useDangerZoneStore((s) => s.addDrawingPoint);
  const insertDrawingPointAfterSegment = useDangerZoneStore(
    (s) => s.insertDrawingPointAfterSegment,
  );
  const updateDrawingPoint = useDangerZoneStore((s) => s.updateDrawingPoint);
  const removeLastDrawingPoint = useDangerZoneStore((s) => s.removeLastDrawingPoint);
  const clearDrawingPoints = useDangerZoneStore((s) => s.clearDrawingPoints);
  const setDrawing = useDangerZoneStore((s) => s.setDrawing);

  const dragIndexRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const dragStartPxRef = useRef<{ x: number; y: number } | null>(null);
  const dragMovedEnoughRef = useRef(false);
  /** Copia de vértices al iniciar arrastre; si al soltar sigue inválido, se restaura. */
  const dragSnapshotRef = useRef<[number, number][] | null>(null);

  const polygonSimple = useMemo(
    () => isClosedRingSimple(drawingPoints),
    [drawingPoints],
  );

  const lineStringCoords = useMemo(() => {
    if (drawingPoints.length === 0) return [];
    if (drawingPoints.length >= 3) {
      return [...drawingPoints, drawingPoints[0]];
    }
    return [...drawingPoints];
  }, [drawingPoints]);

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
              geometry: { type: "LineString" as const, coordinates: lineStringCoords },
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
  }, [drawingPoints, polygonSimple, lineStringCoords]);

  const tryFinishPolygon = useCallback(() => {
    const pts = useDangerZoneStore.getState().drawingPoints;
    if (pts.length < 3) return false;
    if (!isClosedRingSimple(pts)) {
      window.alert(
        "El polígono se cruza a sí mismo. Arrastra los vértices blancos para corregirlo.",
      );
      return false;
    }
    return useDangerZoneStore.getState().finishDangerZoneDrawing();
  }, []);

  const onMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      if (dragIndexRef.current !== null) return;
      const lng = e.lngLat.lng;
      const lat = e.lngLat.lat;
      const hits = map.queryRenderedFeatures(e.point, { layers: [POINTS_LAYER_ID] });
      if (hits.length > 0) return;

      const pts = useDangerZoneStore.getState().drawingPoints;
      if (pts.length >= 2) {
        const nearest = nearestInsertOnDrawingRing(map, pts, lng, lat);
        const vDist = minVertexDistancePx(map, pts, lng, lat);
        if (
          nearest &&
          nearest.distPx <= EDGE_HIT_PX &&
          vDist > VERTEX_GUARD_PX
        ) {
          const trial = insertAfterSegmentCopy(pts, nearest.segmentStart, [
            nearest.lng,
            nearest.lat,
          ]);
          if (
            trial &&
            (trial.length < 3 || isClosedRingSimple(trial))
          ) {
            insertDrawingPointAfterSegment(nearest.segmentStart, [
              nearest.lng,
              nearest.lat,
            ]);
            suppressClickRef.current = true;
          }
          return;
        }
      }

      const trialAdd = [...pts, [lng, lat] as [number, number]];
      if (trialAdd.length < 3 || isClosedRingSimple(trialAdd)) {
        addDrawingPoint([lng, lat]);
      }
    },
    [map, addDrawingPoint, insertDrawingPointAfterSegment],
  );

  const endDrag = useCallback(() => {
    if (dragIndexRef.current !== null) {
      suppressClickRef.current = true;
      dragIndexRef.current = null;
      map.dragPan.enable();
      map.getCanvas().style.cursor = "";
    }
    dragStartPxRef.current = null;
    dragMovedEnoughRef.current = false;
  }, [map]);

  useEffect(() => {
    if (!isDrawing || !map) return;

    const onVertexDown = (e: MapLayerMouseEvent) => {
      e.preventDefault();
      const raw = e.features?.[0]?.properties?.index;
      const idx =
        typeof raw === "number"
          ? raw
          : typeof raw === "string"
            ? parseInt(raw, 10)
            : NaN;
      if (Number.isNaN(idx)) return;
      dragSnapshotRef.current = [
        ...useDangerZoneStore.getState().drawingPoints,
      ];
      dragIndexRef.current = idx;
      dragStartPxRef.current = map.project(e.lngLat);
      dragMovedEnoughRef.current = false;
      map.dragPan.disable();
      map.getCanvas().style.cursor = "grabbing";
    };

    const onMouseMove = (e: MapMouseEvent) => {
      if (dragIndexRef.current === null) return;
      if (dragStartPxRef.current) {
        const p = map.project(e.lngLat);
        if (
          Math.hypot(
            p.x - dragStartPxRef.current.x,
            p.y - dragStartPxRef.current.y,
          ) > CLOSE_POLYGON_DRAG_THRESHOLD_PX
        ) {
          dragMovedEnoughRef.current = true;
        }
      }
      updateDrawingPoint(dragIndexRef.current, [e.lngLat.lng, e.lngLat.lat]);
    };

    const onMouseUp = () => {
      const idx = dragIndexRef.current;
      const moved = dragMovedEnoughRef.current;
      if (
        idx === 0 &&
        !moved &&
        dragStartPxRef.current
      ) {
        const pts = useDangerZoneStore.getState().drawingPoints;
        if (pts.length >= 3 && isClosedRingSimple(pts)) {
          suppressClickRef.current = true;
          tryFinishPolygon();
          dragIndexRef.current = null;
          map.dragPan.enable();
          map.getCanvas().style.cursor = "";
          dragStartPxRef.current = null;
          dragMovedEnoughRef.current = false;
          dragSnapshotRef.current = null;
          return;
        }
      }
      if (
        dragMovedEnoughRef.current &&
        dragSnapshotRef.current &&
        dragSnapshotRef.current.length >= 3
      ) {
        const pts = useDangerZoneStore.getState().drawingPoints;
        if (pts.length >= 3 && !isClosedRingSimple(pts)) {
          useDangerZoneStore.setState({
            drawingPoints: dragSnapshotRef.current,
          });
        }
      }
      dragSnapshotRef.current = null;
      endDrag();
    };

    const onPointEnter = () => {
      if (dragIndexRef.current === null) map.getCanvas().style.cursor = "grab";
    };
    const onPointLeave = () => {
      if (dragIndexRef.current === null) map.getCanvas().style.cursor = "";
    };

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
  }, [isDrawing, map, onMapClick, endDrag, updateDrawingPoint, tryFinishPolygon]);

  if (!isDrawing) return null;

  const handleFinish = () => {
    tryFinishPolygon();
  };

  const handleCancel = () => {
    setDrawing(false);
    clearDrawingPoints();
  };

  return (
    <>
      {geojson && (
        <Source id="drawing-source" type="geojson" data={geojson as GeoJSON.GeoJSON}>
          <Layer
            id={FILL_LAYER_ID}
            type="fill"
            filter={["==", ["get", "type"], "area"]}
            paint={{ "fill-color": "#DC2626", "fill-opacity": 0.2 }}
          />
          <Layer
            id={LINE_LAYER_ID}
            type="line"
            filter={["==", ["get", "type"], "edge"]}
            paint={{
              "line-color": "#DC2626",
              "line-width": 5,
              "line-dasharray": [2, 1],
            }}
          />
          <Layer
            id={POINTS_LAYER_ID}
            type="circle"
            filter={["==", ["get", "type"], "vertex"]}
            paint={{
              "circle-radius": 9,
              "circle-color": "#FFFFFF",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#DC2626",
            }}
          />
        </Source>
      )}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[5000] flex gap-2 max-w-[min(96vw,520px)]">
        <div className="bg-white dark:bg-slate-800 rounded-full shadow-2xl border border-gray-200 dark:border-slate-700 px-4 py-2 flex flex-wrap items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-300 max-w-[260px]">
            {drawingPoints.length === 0
              ? "Clic en el mapa para añadir vértices"
              : drawingPoints.length < 3
                ? "Mínimo 3 puntos"
                : !polygonSimple
                  ? "Polígono inválido (cruces): arrastra los puntos"
                  : "Clic en una arista roja para añadir vértice (no se permiten cruces). Clic corto en el primer punto para cerrar. Si al arrastrar queda inválido, al soltar se deshace el movimiento."}
          </p>
          <div className="flex items-center gap-1.5 border-l border-gray-100 dark:border-slate-700 pl-3">
            <button
              type="button"
              onClick={() => removeLastDrawingPoint()}
              disabled={drawingPoints.length === 0}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 transition-colors disabled:opacity-40"
              title="Deshacer último vértice"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 transition-colors"
              title="Cancelar dibujo"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleFinish}
              disabled={drawingPoints.length < 3 || !polygonSimple}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-3.5 w-3.5" />
              Finalizar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
