import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { GlobalKPIs, Incident, TrafficJam } from '../types';
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

/**
 * Hook principal que combina todos los datos
 * AHORA USA DATOS REALES DEL BACKEND (no mock)
 */
export const useWazeData = () => {
    const polygonsQuery = usePolygonsStatus();
    const kpisQuery = useGlobalKPIs();
    const incidentsQuery = useAllIncidents();
    const jamsQuery = useAllJams();

    // Memoizar polígonos combinados (geometría local + estado backend)
    const polygons = useMemo(() => {
        if (!polygonsQuery.data) return realCordobaPolygons;

        // Crear un Map para búsqueda O(1) en lugar de find O(n)
        const backendMap = new Map(
            polygonsQuery.data.map(p => [p.id, p])
        );

        return realCordobaPolygons.map(localPoly => {
            const backendData = backendMap.get(localPoly.id);
            if (!backendData) return localPoly;

            return {
                ...localPoly,
                state: backendData.state,
                name: backendData.name,
                group: backendData.group,
            };
        });
    }, [polygonsQuery.data]);

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
        isLoading,
        isError,
        lastUpdate,
        globalKPIs: kpisQuery.data
    };
};
