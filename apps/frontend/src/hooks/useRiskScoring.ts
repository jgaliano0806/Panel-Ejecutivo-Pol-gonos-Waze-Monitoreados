/**
 * Hook para obtener datos de Risk Scoring
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface RiskScore {
    polygon_id: string;
    polygon_name: string;
    group_name: string;
    calculated_at: string;
    traffic_score: number;
    incident_score: number;
    weather_score: number;
    speed_score: number;
    delay_score: number;
    final_risk_score: number;
    risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'SEVERE';
    risk_category: string;
    alert_triggered: boolean;
    raw_data?: {
        total_jams: number;
        total_incidents: number;
        avg_speed: number | null;
        avg_delay: number;
        conditions_summary: string;
    };
}

export interface GroupRiskSummary {
    group_name: string;
    polygon_count: number;
    avg_risk_score: number;
    max_risk_score: number;
    critical_polygons: number;
    risk_distribution: {
        low: number;
        moderate: number;
        high: number;
        critical: number;
        severe: number;
    };
}

/**
 * Hook para obtener resumen global de riesgos por grupo
 */
export const useRiskSummary = () => {
    return useQuery<{ summaries: GroupRiskSummary[]; timestamp: string }>({
        queryKey: ['riskSummary'],
        queryFn: async () => {
            const response = await fetch('/api/risk/summary');
            if (!response.ok) throw new Error('Error obteniendo resumen de riesgos');
            return response.json();
        },
        refetchInterval: 120000, // Cada 2 minutos
    });
};

/**
 * Hook para obtener scores de un grupo específico o todos
 */
export const useRiskScores = (groupName?: string) => {
    return useQuery<{ scores: RiskScore[]; group: string; timestamp: string }>({
        queryKey: ['riskScores', groupName],
        queryFn: async () => {
            const url = groupName
                ? `/api/risk/scores?group=${encodeURIComponent(groupName)}`
                : '/api/risk/scores';
            const response = await fetch(url);
            if (!response.ok) throw new Error('Error obteniendo scores');
            return response.json();
        },
        refetchInterval: 120000,
    });
};

/**
 * Hook para obtener score de un polígono específico
 */
export const usePolygonRiskScore = (polygonId: string | null) => {
    return useQuery<RiskScore>({
        queryKey: ['polygonRiskScore', polygonId],
        queryFn: async () => {
            if (!polygonId) throw new Error('polygonId requerido');
            const response = await fetch(`/api/risk/polygon/${polygonId}`);
            if (!response.ok) throw new Error('Error obteniendo score del polígono');
            return response.json();
        },
        enabled: !!polygonId,
        refetchInterval: 120000,
    });
};

/**
 * Hook para calcular scores de todos los polígonos
 */
export const useCalculateAllScores = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/risk/calculate', { method: 'POST' });
            if (!response.ok) throw new Error('Error calculando scores');
            return response.json();
        },
        onSuccess: () => {
            // Invalidar todas las queries de risk scoring
            queryClient.invalidateQueries({ queryKey: ['riskSummary'] });
            queryClient.invalidateQueries({ queryKey: ['riskScores'] });
        },
    });
};

/**
 * Hook para recalcular score de un polígono específico
 */
export const useRecalculatePolygonScore = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (polygonId: string) => {
            const response = await fetch(`/api/risk/polygon/${polygonId}/recalculate`, {
                method: 'POST'
            });
            if (!response.ok) throw new Error('Error recalculando score');
            return response.json();
        },
        onSuccess: (_data, polygonId) => {
            queryClient.invalidateQueries({ queryKey: ['polygonRiskScore', polygonId] });
            queryClient.invalidateQueries({ queryKey: ['riskScores'] });
            queryClient.invalidateQueries({ queryKey: ['riskSummary'] });
        },
    });
};

/**
 * Hook para obtener lista de grupos disponibles
 */
export const useRiskGroups = () => {
    return useQuery<{ groups: string[] }>({
        queryKey: ['riskGroups'],
        queryFn: async () => {
            const response = await fetch('/api/risk/groups');
            if (!response.ok) throw new Error('Error obteniendo grupos');
            return response.json();
        },
        staleTime: Infinity, // Los grupos no cambian frecuentemente
    });
};

