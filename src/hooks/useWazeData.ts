import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { GlobalKPIs, Incident, TrafficJam, PolygonTrafficMetrics, TrafficAlert, AlertStats, HistoricalSnapshot, AllTrends } from '../types';
import { realCordobaPolygons } from '../data/mock/realCordobaPolygons';

/**
 * Hook para consumir la API del Backend
 */

const API_BASE = '/api'; // Usando proxy de Vite

// Fetcher genérico con mejor manejo de errores
const fetcher = async <T>(url: string): Promise<T> => {
    const response = await fetch(`${API_BASE}${url}`, {
        headers: {
            'Content-Type': 'application/json',
        },
    });
    
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
    state: 'low' | 'medium' | 'high';
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
        queryKey: ['polygons'],
        queryFn: () => fetcher<BackendPolygonStatus[]>('/polygons'),
        refetchInterval: 30000,
    });
};

export const useGlobalKPIs = () => {
    return useQuery<GlobalKPIs>({
        queryKey: ['kpis'],
        queryFn: () => fetcher<GlobalKPIs>('/kpis/global'),
        refetchInterval: 30000,
    });
};

export const useAllIncidents = () => {
    return useQuery<Incident[]>({
        queryKey: ['incidents'],
        queryFn: () => fetcher<Incident[]>('/incidents/all'),
        refetchInterval: 30000,
    });
};

export const useAllJams = () => {
    return useQuery<TrafficJam[]>({
        queryKey: ['jams'],
        queryFn: () => fetcher<TrafficJam[]>('/jams/all'),
        refetchInterval: 30000,
    });
};

export const usePolygonDetail = (id: string | null) => {
    return useQuery({
        queryKey: ['polygon', id],
        queryFn: () => fetcher<any>(`/polygons/${id}`),
        enabled: !!id,
        refetchInterval: 30000,
    });
};

export const useTrafficMetrics = () => {
    return useQuery<PolygonTrafficMetrics[]>({
        queryKey: ['traffic-metrics'],
        queryFn: () => fetcher<PolygonTrafficMetrics[]>('/traffic-metrics'),
        refetchInterval: 30000,
    });
};

export const useAlerts = () => {
    return useQuery<TrafficAlert[]>({
        queryKey: ['alerts'],
        queryFn: () => fetcher<TrafficAlert[]>('/alerts'),
        refetchInterval: 30000,
    });
};

export const useAlertStats = () => {
    return useQuery<AlertStats>({
        queryKey: ['alert-stats'],
        queryFn: () => fetcher<AlertStats>('/alerts/stats'),
        refetchInterval: 30000,
    });
};

export const useHistoricalData = (hours: number = 24) => {
    return useQuery<HistoricalSnapshot[]>({
        queryKey: ['historical', hours],
        queryFn: () => fetcher<HistoricalSnapshot[]>(`/historical/global?hours=${hours}`),
        refetchInterval: 300000, // 5 minutos (datos históricos no cambian tan rápido)
    });
};

export const useTrends = () => {
    return useQuery<AllTrends>({
        queryKey: ['trends'],
        queryFn: () => fetcher<AllTrends>('/historical/trends'),
        refetchInterval: 60000, // 1 minuto
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
        const backendMap = new Map(
            polygonsQuery.data.map(p => [p.id, p])
        );
        
        const metricsMap = new Map(
            (trafficMetricsQuery.data || []).map(m => [m.polygonId, m])
        );

        return realCordobaPolygons.map(localPoly => {
            const backendData = backendMap.get(localPoly.id);
            const metricsData = metricsMap.get(localPoly.id);
            
            if (!backendData) return localPoly;

            return {
                ...localPoly,
                state: backendData.state,
                name: backendData.name,
                group: backendData.group,
                trafficMetrics: metricsData,
            };
        });
    }, [polygonsQuery.data, trafficMetricsQuery.data]);

    // Memoizar estados de carga y error
    const isLoading = useMemo(() => 
        polygonsQuery.isLoading || incidentsQuery.isLoading || jamsQuery.isLoading,
        [polygonsQuery.isLoading, incidentsQuery.isLoading, jamsQuery.isLoading]
    );

    const isError = useMemo(() =>
        polygonsQuery.isError || incidentsQuery.isError || jamsQuery.isError,
        [polygonsQuery.isError, incidentsQuery.isError, jamsQuery.isError]
    );

    // Memoizar última actualización
    const lastUpdate = useMemo(() => new Date(), [
        polygonsQuery.dataUpdatedAt,
        incidentsQuery.dataUpdatedAt,
        jamsQuery.dataUpdatedAt
    ]);

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
        globalKPIs: kpisQuery.data
    };
};
