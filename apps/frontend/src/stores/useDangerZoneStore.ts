import { create } from "zustand";
import { DangerZone } from "@panel-waze/types";

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

  setDrawing: (drawing: boolean) => void;
  addDrawingPoint: (point: [number, number]) => void;
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

  setDrawing: (drawing) => set({ isDrawing: drawing, drawingPoints: [] }),
  addDrawingPoint: (point) =>
    set((s) => ({ drawingPoints: [...s.drawingPoints, point] })),
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
  reset: () =>
    set({
      isDrawing: false,
      drawingPoints: [],
      selectedZone: null,
      showPanel: false,
      tempGeometry: null,
    }),
}));
