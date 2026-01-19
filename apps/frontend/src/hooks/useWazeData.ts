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
import { useGlobalRealtime } from "./useWazeRealtime";

/**
 * Hook para consumir la API del Backend
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
  state: "low" | "medium" | "high";
  metrics: {
    alertCount: number;
    jamCount: number;
    totalDelay: number;
    avgSpeed: number | null;
    criticalAlerts: number;
  };
  lastUpdate: string;
}

export const usePolygonsStatus = () => {
  return useQuery<BackendPolygonStatus[]>({
    queryKey: ["polygons"],
    queryFn: () => fetcher<BackendPolygonStatus[]>("/polygons"),
    refetchInterval: REFRESH_INTERVALS.realTimeData,
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
  });
};

export const useAllJams = () => {
  return useQuery<TrafficJam[]>({
    queryKey: ["jams"],
    queryFn: async () => {
      const jams = await fetcher<any[]>("/jams/all");
      // Transform polyline to line for MapLibre compatibility
      return jams.map((jam) => ({
        ...jam,
        line: jam.polyline || jam.line, // Map polyline to line
        speed: jam.speedKMH || jam.speed, // Ensure speed is available
      }));
    },
    refetchInterval: REFRESH_INTERVALS.realTimeData,
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
export const useBlockingAnalysis = () => {
  return useQuery<BlockingAnalysisResponse>({
    queryKey: ["blocking-analysis"],
    queryFn: () =>
      fetcher<BlockingAnalysisResponse>("/incidents/blocking-analysis"),
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
      (trafficMetricsQuery.data || []).map((m) => [m.polygonId, m])
    );

    return realCordobaPolygons.map((localPoly) => {
      const backendData = backendMap.get(localPoly.id);
      const metricsData = metricsMap.get(localPoly.id);

      if (!backendData) return localPoly;

      return {
        ...localPoly,
        state: backendData.state,
        name: backendData.name,
        group: backendData.group,
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
    [polygonsQuery.isLoading, incidentsQuery.isLoading, jamsQuery.isLoading]
  );

  const isError = useMemo(
    () => polygonsQuery.isError || incidentsQuery.isError || jamsQuery.isError,
    [polygonsQuery.isError, incidentsQuery.isError, jamsQuery.isError]
  );

  // Memoizar última actualización
  const lastUpdate = useMemo(
    () => new Date(),
    [
      polygonsQuery.dataUpdatedAt,
      incidentsQuery.dataUpdatedAt,
      jamsQuery.dataUpdatedAt,
    ]
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
