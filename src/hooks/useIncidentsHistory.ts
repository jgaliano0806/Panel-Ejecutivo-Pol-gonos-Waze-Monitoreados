import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface IncidentHistoryRecord {
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

interface HotspotResult {
    latitude: number;
    longitude: number;
    incident_count: number;
    avg_duration_minutes: number;
    most_common_type: string;
    street?: string;
}

interface IncidentStats {
    category: string;
    total_incidents: number;
    avg_duration: number;
    avg_delay: number;
    total_blocking_jams: number;
}

export const useIncidentsHistory = (filters: {
    polygon_id?: string;
    type?: string;
    from?: string;
    to?: string;
    limit?: number;
}) => {
    return useQuery({
        queryKey: ['incidents-history', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.polygon_id) params.append('polygon_id', filters.polygon_id);
            if (filters.type) params.append('type', filters.type);
            if (filters.from) params.append('from', filters.from);
            if (filters.to) params.append('to', filters.to);
            if (filters.limit) params.append('limit', filters.limit.toString());

            const response = await fetch(`${API_URL}/api/historical/incidents?${params}`);
            if (!response.ok) throw new Error('Failed to fetch incidents history');
            return response.json() as Promise<IncidentHistoryRecord[]>;
        },
        enabled: true
    });
};

export const useIncidentsHotspots = (params?: {
    min_incidents?: number;
    radius_meters?: number;
    from?: string;
    to?: string;
    limit?: number;
}) => {
    return useQuery({
        queryKey: ['incidents-hotspots', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.min_incidents) searchParams.append('min_incidents', params.min_incidents.toString());
            if (params?.radius_meters) searchParams.append('radius_meters', params.radius_meters.toString());
            if (params?.from) searchParams.append('from', params.from);
            if (params?.to) searchParams.append('to', params.to);
            if (params?.limit) searchParams.append('limit', params.limit.toString());

            const response = await fetch(`${API_URL}/api/historical/incidents/hotspots?${searchParams}`);
            if (!response.ok) throw new Error('Failed to fetch hotspots');
            return response.json() as Promise<HotspotResult[]>;
        }
    });
};

export const useIncidentsStats = (params: {
    polygon_id?: string;
    group_by: 'type' | 'hour' | 'day';
    from?: string;
    to?: string;
}) => {
    return useQuery({
        queryKey: ['incidents-stats', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params.polygon_id) searchParams.append('polygon_id', params.polygon_id);
            searchParams.append('group_by', params.group_by);
            if (params.from) searchParams.append('from', params.from);
            if (params.to) searchParams.append('to', params.to);

            const response = await fetch(`${API_URL}/api/historical/incidents/stats?${searchParams}`);
            if (!response.ok) throw new Error('Failed to fetch incident stats');
            return response.json() as Promise<IncidentStats[]>;
        }
    });
};

