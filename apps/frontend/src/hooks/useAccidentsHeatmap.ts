/**
 * Hook para el heatmap de siniestros.
 *
 * Trae hasta `limit` siniestros en un rango [from, to] con solo los campos
 * necesarios para el mapa (coordenadas + severidad + subtipo). Los buckets
 * se calculan en cliente para poder sumarizarlos vía `clusterProperties`
 * de MapLibre sin lógica extra en cada frame.
 */
import { useQuery } from "@tanstack/react-query";
import {
  classifyAccident,
  type SeverityBucket,
} from "../lib/accidentSeverity";

export type { SeverityBucket };
export {
  classifyAccident,
  SEVERITY_COLORS,
  SEVERITY_LABELS,
} from "../lib/accidentSeverity";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export interface HeatmapAccident {
  id: string;
  lat: number;
  lng: number;
  severity: number | null;
  subtype: string | null;
  bucket: SeverityBucket;
  street: string | null;
  accident_at: string;
  polygon_id: string | null;
}

export interface AccidentsHeatmapFilters {
  from?: string;
  to?: string;
  limit?: number;
}

async function fetchAccidentsForHeatmap(
  filters: AccidentsHeatmapFilters,
  signal?: AbortSignal,
): Promise<HeatmapAccident[]> {
  const params = new URLSearchParams();
  if (filters.from) params.append("from", filters.from);
  if (filters.to) params.append("to", filters.to);
  params.append("limit", String(filters.limit ?? 5000));
  params.append("offset", "0");

  const baseUrl = API_URL.endsWith("/api") ? API_URL : `${API_URL}/api`;
  const response = await fetch(`${baseUrl}/accidents?${params}`, { signal });
  if (!response.ok) {
    throw new Error(
      `Error al obtener siniestros para heatmap: ${response.status}`,
    );
  }
  const raw = await response.json();
  const list: unknown[] = Array.isArray(raw) ? raw : raw?.data ?? [];

  const result: HeatmapAccident[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const lat = Number(rec.location_lat);
    const lng = Number(rec.location_lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;

    const severityRaw = rec.severity;
    const severity =
      severityRaw === null || severityRaw === undefined
        ? null
        : Number(severityRaw);
    const subtype =
      typeof rec.subtype === "string" && rec.subtype.length > 0
        ? rec.subtype
        : null;

    result.push({
      id: String(rec.id ?? ""),
      lat,
      lng,
      severity: Number.isFinite(severity) ? (severity as number) : null,
      subtype,
      bucket: classifyAccident(severity, subtype),
      street: typeof rec.street === "string" ? rec.street : null,
      accident_at:
        typeof rec.accident_at === "string"
          ? rec.accident_at
          : new Date().toISOString(),
      polygon_id:
        typeof rec.polygon_id === "string" && rec.polygon_id.length > 0
          ? rec.polygon_id
          : null,
    });
  }
  return result;
}

export function useAccidentsHeatmap(filters: AccidentsHeatmapFilters) {
  return useQuery({
    queryKey: ["accidents-heatmap", filters],
    queryFn: ({ signal }) => fetchAccidentsForHeatmap(filters, signal),
    staleTime: 60_000,
  });
}
