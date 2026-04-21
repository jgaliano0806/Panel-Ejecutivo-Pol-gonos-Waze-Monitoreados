import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type {
  GlobalKPIs,
  Incident,
  TrafficJam,
  PolygonTrafficMetrics,
  TrafficAlert,
  AlertStats,
  HistoricalSnapshot,
  AllTrends,
} from "../types";
import { realCordobaPolygons } from "../data/mock/realCordobaPolygons";
import { REFRESH_INTERVALS, API_CONFIG } from "../config/constants";

/**
 * Hook para consumir la API del Backend
 *
 * Las alertas en tiempo real (Socket.IO), p. ej. `red_zone_critical_alert`
 * con sirena + TTS, se registran en el singleton `src/services/websocket.ts`
 * al importar ese módulo desde `useWazeRealtime` / `useRealtimeNotifications`.
 */

const API_BASE = API_CONFIG.baseUrl;

// Fetcher genérico con mejor manejo de errores
const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(`${API_BASE}${url}`);

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText);
    throw new Error(`API Error (${response.status}): ${error}`);
  }

  return response.json();
};

// Tipos de respuesta del backend (deben coincidir con backend/src/types/index.ts)
interface BackendPolygonStatus {
  id: string;
  name: string;
  group: string;
  state?: "low" | "medium" | "high";
  metrics?: {
    alertCount: number;
    jamCount: number;
    totalDelay: number;
    avgSpeed: number | null;
    criticalAlerts: number;
  };
  lastUpdate?: string;
  geometry?: import("../types").GeoJSONPolygon;
}

export const usePolygonsStatus = () => {
  return useQuery<BackendPolygonStatus[]>({
    queryKey: ["polygons"],
    queryFn: () => fetcher<BackendPolygonStatus[]>("/polygons"),
    refetchInterval: REFRESH_INTERVALS.realTimeData,
    structuralSharing: false,
  });
};

export const useGlobalKPIs = () => {
  return useQuery<GlobalKPIs>({
    queryKey: ["kpis"],
    queryFn: () => fetcher<GlobalKPIs>("/kpis/global"),
    refetchInterval: REFRESH_INTERVALS.globalKpis,
  });
};

export const useAllIncidents = () => {
  return useQuery<Incident[]>({
    queryKey: ["incidents"],
    queryFn: () => fetcher<Incident[]>("/incidents/all"),
    refetchInterval: REFRESH_INTERVALS.realTimeData,
    structuralSharing: false,
  });
};

function parseLine(raw: unknown): Array<{ x: number; y: number }> | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* invalid JSON */
    }
  }
  return undefined;
}

export const useAllJams = () => {
  return useQuery<TrafficJam[]>({
    queryKey: ["jams"],
    queryFn: async () => {
      const jams = await fetcher<any[]>("/jams/all");
      return jams.map((jam) => ({
        ...jam,
        line: parseLine(jam.polyline ?? jam.line),
        speed: jam.speedKMH || jam.speed,
      }));
    },
    refetchInterval: REFRESH_INTERVALS.realTimeData,
    structuralSharing: false,
  });
};

export const usePolygonDetail = (id: string | null) => {
  return useQuery({
    queryKey: ["polygon", id],
    queryFn: () => fetcher<any>(`/polygons/${id}`),
    enabled: !!id,
    refetchInterval: REFRESH_INTERVALS.realTimeData,
  });
};

export const useTrafficMetrics = () => {
  return useQuery<PolygonTrafficMetrics[]>({
    queryKey: ["traffic-metrics"],
    queryFn: () => fetcher<PolygonTrafficMetrics[]>("/traffic-metrics"),
    refetchInterval: REFRESH_INTERVALS.trafficMetrics,
  });
};

/**
 * TVT (Traffic View Technology) metrics from Waze official feed.
 * Reference: https://support.google.com/waze/partners/answer/13658466
 *
 * usersOnJams: [{wazersCount, jamLevel}] - Users at each jam level (0-4)
 * lengthOfJams: [{jamLevel, jamLength}] - Total jam length by level (1-5) in meters
 */
export interface TvtMetrics {
  polygonId: string;
  wazersCount: number;
  usersOnJams: Array<{ wazersCount: number; jamLevel: number }>;
  lengthOfJams: Array<{ jamLevel: number; jamLength: number }>;
  updateTime: string;
  createdAt: string;
}

export const useAllTvtMetrics = () => {
  return useQuery<TvtMetrics[]>({
    queryKey: ["tvt-metrics"],
    queryFn: () => fetcher<TvtMetrics[]>("/tvt-metrics"),
    refetchInterval: REFRESH_INTERVALS.trafficMetrics,
  });
};

export const useTvtMetricsByPolygon = (polygonId: string | null) => {
  return useQuery<TvtMetrics>({
    queryKey: ["tvt-metrics", polygonId],
    queryFn: () => fetcher<TvtMetrics>(`/tvt-metrics/${polygonId}`),
    enabled: !!polygonId,
    refetchInterval: REFRESH_INTERVALS.trafficMetrics,
  });
};

export const useAlerts = () => {
  return useQuery<TrafficAlert[]>({
    queryKey: ["alerts"],
    queryFn: () => fetcher<TrafficAlert[]>("/alerts"),
    refetchInterval: REFRESH_INTERVALS.realTimeData,
  });
};

export const useAlertStats = () => {
  return useQuery<AlertStats>({
    queryKey: ["alert-stats"],
    queryFn: () => fetcher<AlertStats>("/alerts/stats"),
    refetchInterval: REFRESH_INTERVALS.alertStats,
  });
};

export const useHistoricalData = (hours: number = 24) => {
  return useQuery<HistoricalSnapshot[]>({
    queryKey: ["historical", hours],
    queryFn: () =>
      fetcher<HistoricalSnapshot[]>(`/historical/global?hours=${hours}`),
    refetchInterval: REFRESH_INTERVALS.historicalData,
  });
};

export const useTrends = () => {
  return useQuery<AllTrends>({
    queryKey: ["trends"],
    queryFn: () => fetcher<AllTrends>("/historical/trends"),
    refetchInterval: REFRESH_INTERVALS.trends,
  });
};

// --- Hook para Incidentes Históricos ---

export interface HistoricalIncident {
  incident_id: string;
  polygon_id: string;
  polygon_name?: string;
  type: string;
  subtype?: string;
  severity?: number;
  street?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  confidence?: number;
  reliability?: number;
  n_thumbs_up?: number;
  first_seen_at: string;
  last_seen_at?: string;
  duration_minutes?: number;
  blocking_jams?: number;
  estimated_delay_minutes?: number;
}

export interface HistoricalIncidentsParams {
  polygon_id?: string;
  type?: string;
  from?: string; // ISO date string
  to?: string; // ISO date string
  limit?: number;
  enabled?: boolean;
}

export const useHistoricalIncidents = (
  params: HistoricalIncidentsParams = {},
) => {
  const { polygon_id, type, from, to, limit = 100, enabled = true } = params;

  const queryParams = new URLSearchParams();
  if (polygon_id) queryParams.append("polygon_id", polygon_id);
  if (type) queryParams.append("type", type);
  if (from) queryParams.append("from", from);
  if (to) queryParams.append("to", to);
  if (limit) queryParams.append("limit", String(limit));

  const queryString = queryParams.toString();

  return useQuery<HistoricalIncident[]>({
    queryKey: ["historical-incidents", polygon_id, type, from, to, limit],
    queryFn: () =>
      fetcher<HistoricalIncident[]>(
        `/historical/incidents${queryString ? `?${queryString}` : ""}`,
      ),
    enabled,
    refetchInterval: false, // Datos históricos no requieren refresh constante
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

// --- Tipos para análisis de demoras mejorado ---

export interface DelayBreakdown {
  linkedJamsDelay: number;
  proximityDelay: number;
  detourDelay: number;
  historicalDelta: number;
}

export interface DelayCalculationResult {
  totalDelaySeconds: number;
  totalDelayMinutes: number;
  breakdown: DelayBreakdown;
  confidence: number;
  consideredJams: {
    linked: number;
    nearby: number;
  };
  primaryMethod: "linked" | "proximity" | "detour" | "minimal";
  details: string;
  // Nuevos campos de calidad de datos
  dataQuality?: "high" | "medium" | "low";
  rawDataUsed?: {
    totalJamsConsidered: number;
    avgJamSpeed: number | null;
    totalAffectedLength: number;
  };
}

export interface BlockingAnalysisIncident {
  id: string;
  type: string;
  subtype?: string;
  description?: string; // reportDescription de Waze (descripción del usuario)
  street?: string;
  city?: string;
  severity: number;
  polygonId: string | null;
  location: { lat: number; lng: number };
  timestamp: Date;
}

export interface BlockingAnalysisItem {
  incident: BlockingAnalysisIncident;
  delay: DelayCalculationResult;
  linkedJams: number;
  affectedLength: number;
  affectedLengthKm: string;
  impactScore: number;
  // Campos de agrupación/deduplicación
  reportCount: number;
  allLocations: Array<{ lat: number; lng: number; id: string }>;
  relatedIncidentIds: string[];
  // Nuevos campos para grupo y tramos afectados
  nearbyJams: number;
  polygonName: string | null;
  polygonGroup: string | null;
  affectedStreets: string[];
}

export interface BlockingAnalysisResponse {
  count: number;
  analyses: BlockingAnalysisItem[];
  summary: {
    totalIncidents: number;
    totalReports: number;
    duplicatesRemoved: number;
    totalDelayMinutes: number;
    avgConfidence: number;
  };
}

/**
 * Hook para obtener análisis de incidentes bloqueantes con cálculo mejorado de demoras
 */
export const useBlockingAnalysis = (options?: { limit?: number }) => {
  const limit = options?.limit ?? 200;
  return useQuery<BlockingAnalysisResponse>({
    queryKey: ["blocking-analysis", limit],
    queryFn: () =>
      fetcher<BlockingAnalysisResponse>(
        `/incidents/blocking-analysis?limit=${limit}`,
      ),
    refetchInterval: REFRESH_INTERVALS.realTimeData,
  });
};

/**
 * Hook principal que combina todos los datos
 * AHORA USA DATOS REALES DEL BACKEND (no mock)
 */
export const useWazeData = () => {
  const polygonsQuery = usePolygonsStatus();
  const kpisQuery = useGlobalKPIs();
  const incidentsQuery = useAllIncidents();
  const jamsQuery = useAllJams();
  const trafficMetricsQuery = useTrafficMetrics();
  const alertsQuery = useAlerts();
  const alertStatsQuery = useAlertStats();

  // Memoizar polígonos combinados (geometría local + estado backend + métricas de tráfico)
  const polygons = useMemo(() => {
    if (!polygonsQuery.data) return realCordobaPolygons;

    // Crear Maps para búsqueda O(1)
    const backendMap = new Map(polygonsQuery.data.map((p) => [p.id, p]));

    const metricsMap = new Map(
      (trafficMetricsQuery.data || []).map((m) => [m.polygonId, m]),
    );

    return realCordobaPolygons.map((localPoly) => {
      const backendData = backendMap.get(localPoly.id);
      const metricsData = metricsMap.get(localPoly.id);

      if (!backendData) return localPoly;

      return {
        ...localPoly,
        geometry: backendData.geometry ?? localPoly.geometry,
        state: backendData.state ?? localPoly.state,
        name: backendData.name ?? localPoly.name,
        group: backendData.group ?? localPoly.group,
        trafficMetrics: metricsData
          ? {
              ...metricsData,
              totalAlerts: backendData.metrics?.alertCount || 0,
            }
          : undefined,
      };
    });
  }, [polygonsQuery.data, trafficMetricsQuery.data]);

  // Memoizar estados de carga y error
  const isLoading = useMemo(
    () =>
      polygonsQuery.isLoading ||
      incidentsQuery.isLoading ||
      jamsQuery.isLoading,
    [polygonsQuery.isLoading, incidentsQuery.isLoading, jamsQuery.isLoading],
  );

  const isError = useMemo(
    () => polygonsQuery.isError || incidentsQuery.isError || jamsQuery.isError,
    [polygonsQuery.isError, incidentsQuery.isError, jamsQuery.isError],
  );

  // Memoizar última actualización
  const lastUpdate = useMemo(
    () => new Date(),
    [
      polygonsQuery.dataUpdatedAt,
      incidentsQuery.dataUpdatedAt,
      jamsQuery.dataUpdatedAt,
    ],
  );

  return {
    polygons,
    incidents: incidentsQuery.data || [],
    jams: jamsQuery.data || [],
    trafficMetrics: trafficMetricsQuery.data || [],
    alerts: alertsQuery.data || [],
    alertStats: alertStatsQuery.data,
    isLoading,
    isError,
    lastUpdate,
    globalKPIs: kpisQuery.data,
  };
};
