/**
 * Vista del heatmap a restaurar al volver desde el detalle de un siniestro.
 * Se guarda en sessionStorage al hacer clic en un punto del mapa.
 */
import type { SeverityBucket } from "./accidentSeverity";

export const HEATMAP_RETURN_VIEW_KEY = "accidents-heatmap-return-view";

export interface HeatmapReturnView {
  lng: number;
  lat: number;
  zoom: number;
  bearing: number;
  pitch: number;
  dateFrom: string;
  dateTo: string;
  activeBuckets: SeverityBucket[];
  accidentId?: string;
  savedAt: number;
}

export function saveHeatmapReturnView(view: HeatmapReturnView): void {
  try {
    sessionStorage.setItem(HEATMAP_RETURN_VIEW_KEY, JSON.stringify(view));
  } catch {
    /* private mode / quota */
  }
}

export function readHeatmapReturnView(): HeatmapReturnView | null {
  try {
    const raw = sessionStorage.getItem(HEATMAP_RETURN_VIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HeatmapReturnView;
    if (
      typeof parsed?.lng !== "number" ||
      typeof parsed?.lat !== "number" ||
      typeof parsed?.zoom !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearHeatmapReturnView(): void {
  try {
    sessionStorage.removeItem(HEATMAP_RETURN_VIEW_KEY);
  } catch {
    /* noop */
  }
}

export function hasHeatmapReturnView(): boolean {
  return readHeatmapReturnView() != null;
}
