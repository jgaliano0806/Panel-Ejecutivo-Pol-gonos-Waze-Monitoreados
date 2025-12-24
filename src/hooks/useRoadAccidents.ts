import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface RoadAccident {
    id: string;
    incident_id?: string;
    waze_data: any;
    weather_data: any;
    type?: string;
    subtype?: string;
    severity?: number;
    street?: string;
    location_lat: number;
    location_lng: number;
    operator_notes?: string;
    accident_at: string;
    created_at: string;
    media: AccidentMedia[];
}

export interface AccidentMedia {
    id: string;
    accident_id: string;
    file_path: string;
    file_type: 'image' | 'video';
    original_name?: string;
    file_size_bytes?: number;
    created_at: string;
}

export const useRoadAccidents = (filters: {
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
} = {}) => {
    return useQuery({
        queryKey: ['road-accidents', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.from) params.append('from', filters.from);
            if (filters.to) params.append('to', filters.to);
            if (filters.limit) params.append('limit', filters.limit.toString());
            if (filters.offset) params.append('offset', filters.offset.toString());

            const response = await fetch(`${API_URL}/api/accidents?${params}`);
            if (!response.ok) throw new Error('Failed to fetch road accidents');
            return response.json() as Promise<RoadAccident[]>;
        }
    });
};

export const useRoadAccident = (id: string | null) => {
    return useQuery({
        queryKey: ['road-accident', id],
        queryFn: async () => {
            if (!id) return null;
            const response = await fetch(`${API_URL}/api/accidents/${id}`);
            if (!response.ok) throw new Error('Failed to fetch accident detail');
            return response.json() as Promise<RoadAccident>;
        },
        enabled: !!id
    });
};

export const useCreateAccident = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Partial<RoadAccident>) => {
            const response = await fetch(`${API_URL}/api/accidents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to create accident');
            return response.json() as Promise<RoadAccident>;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['road-accidents'] });
        }
    });
};

export const useUploadAccidentMedia = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, files }: { id: string; files: FileList }) => {
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }

            const response = await fetch(`${API_URL}/api/accidents/${id}/media`, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) throw new Error('Failed to upload media');
            return response.json();
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['road-accident', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['road-accidents'] });
        }
    });
};
