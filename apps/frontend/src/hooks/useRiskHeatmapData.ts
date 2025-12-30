import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

interface RiskScoreData {
    polygon_id: string;
    final_risk_score: number;
    centroid_lat: number;
    centroid_lon: number;
    traffic_score?: number;
    incident_score?: number;
    weather_score?: number;
}

interface HeatmapPoint {
    lat: number;
    lon: number;
    score: number;
    polygonId?: string;
}

/**
 * Hook para obtener datos de riesgo formateados para el heatmap
 */
export function useRiskHeatmapData() {
    const { data: scores, isLoading, error, refetch } = useQuery<RiskScoreData[]>({
        queryKey: ['risk', 'scores', 'all'],
        queryFn: async () => {
            const response = await fetch('/api/risk/scores');
            if (!response.ok) {
                throw new Error('Error fetching risk scores');
            }
            return response.json();
        },
        staleTime: 60000, // 1 minuto
        refetchInterval: 120000, // Refetch cada 2 minutos
    });

    const heatmapData = useMemo((): HeatmapPoint[] => {
        if (!scores || !Array.isArray(scores)) return [];

        return scores
            .filter(s =>
                s.centroid_lat != null &&
                s.centroid_lon != null &&
                s.final_risk_score != null
            )
            .map(s => ({
                lat: s.centroid_lat,
                lon: s.centroid_lon,
                score: s.final_risk_score,
                polygonId: s.polygon_id,
            }));
    }, [scores]);

    return {
        data: heatmapData,
        rawScores: scores,
        isLoading,
        error,
        refetch,
    };
}

/**
 * Hook para obtener scores de un polígono específico
 */
export function usePolygonRiskScore(polygonId: string | null) {
    const { data, isLoading, error, refetch } = useQuery<RiskScoreData>({
        queryKey: ['risk', 'scores', polygonId],
        queryFn: async () => {
            const response = await fetch(`/api/risk/scores/${polygonId}`);
            if (!response.ok) {
                throw new Error('Error fetching polygon risk score');
            }
            return response.json();
        },
        enabled: !!polygonId,
        staleTime: 60000,
    });

    return {
        score: data?.final_risk_score ?? 0,
        trafficScore: data?.traffic_score ?? 0,
        incidentScore: data?.incident_score ?? 0,
        weatherScore: data?.weather_score ?? 0,
        isLoading,
        error,
        refetch,
    };
}

export default useRiskHeatmapData;
