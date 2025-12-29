import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface DailyStats {
    date: string;
    avg_fluidity_percentage?: number;
    min_fluidity_percentage?: number;
    max_fluidity_percentage?: number;
    avg_speed?: number;
    min_speed?: number;
    total_incidents?: number;
    critical_incidents?: number;
    incidents_by_type?: Record<string, number>;
    total_jams?: number;
    avg_jam_duration_minutes?: number;
    critical_km_hours?: number;
    total_alerts?: number;
    critical_alerts?: number;
    avg_response_time_minutes?: number;
    worst_polygon_id?: string;
    worst_polygon_score?: number;
    best_polygon_id?: string;
    best_polygon_score?: number;
    peak_congestion_hour?: number;
    peak_incidents_hour?: number;
}

interface AggregatedStats {
    week?: string;
    month?: string;
    avg_fluidity: number;
    avg_speed: number;
    total_incidents: number;
    total_jams: number;
    total_alerts: number;
}

export const useDailyStats = (from?: string, to?: string) => {
    return useQuery({
        queryKey: ['daily-stats', from, to],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (from) params.append('from', from);
            if (to) params.append('to', to);

            const response = await fetch(`${API_URL}/api/stats/daily?${params}`);
            if (!response.ok) throw new Error('Failed to fetch daily stats');
            return response.json() as Promise<DailyStats[]>;
        }
    });
};

export const useWeeklyStats = (from?: string, to?: string) => {
    return useQuery({
        queryKey: ['weekly-stats', from, to],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (from) params.append('from', from);
            if (to) params.append('to', to);

            const response = await fetch(`${API_URL}/api/stats/weekly?${params}`);
            if (!response.ok) throw new Error('Failed to fetch weekly stats');
            return response.json() as Promise<AggregatedStats[]>;
        }
    });
};

export const useMonthlyStats = (from?: string, to?: string) => {
    return useQuery({
        queryKey: ['monthly-stats', from, to],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (from) params.append('from', from);
            if (to) params.append('to', to);

            const response = await fetch(`${API_URL}/api/stats/monthly?${params}`);
            if (!response.ok) throw new Error('Failed to fetch monthly stats');
            return response.json() as Promise<AggregatedStats[]>;
        }
    });
};



