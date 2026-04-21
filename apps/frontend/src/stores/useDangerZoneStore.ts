import { create } from "zustand";
import { DangerZone } from "@panel-waze/types";
import {
  insertAfterSegmentCopy,
  isClosedRingSimple,
} from "@/utils/dangerZonePolygon";

/** Anillo exterior GeoJSON → puntos abiertos para el editor (sin repetir el cierre). */
export function polygonRingToOpenDrawingPoints(
  geometry: GeoJSON.Polygon | undefined,
): [number, number][] {
  const ring = geometry?.coordinates?.[0];
  if (!ring?.length) return [];
  let coords = ring.map((c) => [c[0], c[1]] as [number, number]);
  if (coords.length >= 4) {
    const first = coords[0]!;
    const last = coords[coords.length - 1]!;
    const same =
      Math.abs(first[0] - last[0]) < 1e-9 &&
      Math.abs(first[1] - last[1]) < 1e-9;
    if (same) coords = coords.slice(0, -1);
  }
  return coords.length >= 3 ? coords : [];
}

interface DangerZoneStoreState {
  isDrawing: boolean;
  selectedZone: DangerZone | null;
  showZones: boolean;
  showPanel: boolean;
  tempGeometry: GeoJSON.Polygon | null;
  drawingPoints: [number, number][];
  /** IDs de zonas ocultas individualmente (patrón show/hide como Google Maps) */
  hiddenZoneIds: Set<string>;
  /** ID de la zona actualmente con hover (resaltado) */
  hoveredZoneId: string | null;

  /** Si `drawing` es true y `initialRing` tiene ≥3 puntos, precarga el perímetro (edición). */
  setDrawing: (drawing: boolean, initialRing?: [number, number][]) => void;
  addDrawingPoint: (point: [number, number]) => void;
  /** Inserta un vértice en el segmento que empieza en `segmentStartIndex` (último segmento = n-1 → 0). */
  insertDrawingPointAfterSegment: (
    segmentStartIndex: number,
    point: [number, number],
  ) => void;
  updateDrawingPoint: (index: number, point: [number, number]) => void;
  removeLastDrawingPoint: () => void;
  clearDrawingPoints: () => void;
  selectZone: (zone: DangerZone | null) => void;
  toggleZonesVisibility: () => void;
  /** Alterna visibilidad de una zona individual (como polygon.show()/polygon.hide()) */
  toggleZoneVisibility: (zoneId: string) => void;
  isZoneVisible: (zoneId: string) => boolean;
  setHoveredZone: (zoneId: string | null) => void;
  setShowPanel: (show: boolean) => void;
  setTempGeometry: (geometry: GeoJSON.Polygon | null) => void;
  /**
   * Persiste `drawingPoints` en `tempGeometry`, cierra el modo dibujo y muestra el panel
   * en una sola actualización (evita condiciones de carrera).
   */
  finishDangerZoneDrawing: () => boolean;
  reset: () => void;
}

export const useDangerZoneStore = create<DangerZoneStoreState>((set, get) => ({
  isDrawing: false,
  drawingPoints: [],
  selectedZone: null,
  showZones: true,
  showPanel: false,
  tempGeometry: null,
  hiddenZoneIds: new Set(),
  hoveredZoneId: null,

  setDrawing: (drawing, initialRing) =>
    set(() => {
      if (!drawing) {
        return { isDrawing: false, drawingPoints: [] };
      }
      if (initialRing && initialRing.length >= 3) {
        return { isDrawing: true, drawingPoints: initialRing };
      }
      return { isDrawing: true, drawingPoints: [] };
    }),
  addDrawingPoint: (point) =>
    set((s) => {
      const next = [...s.drawingPoints, point];
      if (next.length >= 3 && !isClosedRingSimple(next)) return s;
      return { drawingPoints: next };
    }),
  insertDrawingPointAfterSegment: (segmentStartIndex, point) =>
    set((s) => {
      const next = insertAfterSegmentCopy(
        s.drawingPoints,
        segmentStartIndex,
        point,
      );
      if (!next) return s;
      if (next.length >= 3 && !isClosedRingSimple(next)) return s;
      return { drawingPoints: next };
    }),
  updateDrawingPoint: (index, point) =>
    set((s) => {
      if (index < 0 || index >= s.drawingPoints.length) return s;
      const pts = [...s.drawingPoints];
      pts[index] = point;
      return { drawingPoints: pts };
    }),
  removeLastDrawingPoint: () =>
    set((s) => ({ drawingPoints: s.drawingPoints.slice(0, -1) })),
  clearDrawingPoints: () => set({ drawingPoints: [] }),
  selectZone: (zone) => set({ selectedZone: zone, showPanel: !!zone }),
  toggleZonesVisibility: () => set((s) => ({ showZones: !s.showZones })),

  toggleZoneVisibility: (zoneId) =>
    set((s) => {
      const next = new Set(s.hiddenZoneIds);
      if (next.has(zoneId)) {
        next.delete(zoneId);
      } else {
        next.add(zoneId);
      }
      return { hiddenZoneIds: next };
    }),
  isZoneVisible: (zoneId) => !get().hiddenZoneIds.has(zoneId),
  setHoveredZone: (zoneId) => set({ hoveredZoneId: zoneId }),

  setShowPanel: (show) => set({ showPanel: show }),
  setTempGeometry: (geometry) => set({ tempGeometry: geometry }),

  finishDangerZoneDrawing: () => {
    const pts = get().drawingPoints;
    if (pts.length < 3 || !isClosedRingSimple(pts)) return false;
    const closedRing: [number, number][] = [
      ...pts.map((p) => [p[0], p[1]] as [number, number]),
      [pts[0]![0], pts[0]![1]],
    ];
    set({
      tempGeometry: {
        type: "Polygon",
        coordinates: [closedRing],
      } as GeoJSON.Polygon,
      isDrawing: false,
      drawingPoints: [],
      showPanel: true,
    });
    return true;
  },

  reset: () =>
    set({
      isDrawing: false,
      drawingPoints: [],
      selectedZone: null,
      showPanel: false,
      tempGeometry: null,
    }),
}));
