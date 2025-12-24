import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface WeatherData {
    polygon_id: string;
    timestamp: string;
    temperature_celsius?: number;
    temperature_feels_like?: number;
    precipitation_mm?: number;
    rain_mm?: number;
    snow_mm?: number;
    precipitation_probability?: number;
    wind_speed_kmh?: number;
    wind_direction_degrees?: number;
    wind_gusts_kmh?: number;
    visibility_meters?: number;
    cloud_cover_percentage?: number;
    road_temperature_celsius?: number;
    is_freezing_risk?: boolean;
    weather_code?: number;
    weather_description?: string;
    has_weather_alert?: boolean;
    alert_severity?: string;
    alert_description?: string;
}

export const usePolygonWeather = (polygonId: string) => {
    return useQuery({
        queryKey: ['weather', polygonId],
        queryFn: async () => {
            const response = await fetch(`${API_URL}/api/weather/${polygonId}`);
            if (!response.ok) throw new Error('Failed to fetch weather');
            return response.json() as Promise<WeatherData>;
        },
        refetchInterval: 60 * 60 * 1000, // Actualizar cada 1 hora
        staleTime: 30 * 60 * 1000 // 30 minutos
    });
};

export const useWeatherHistory = (polygonId: string, from: string, to: string) => {
    return useQuery({
        queryKey: ['weather-history', polygonId, from, to],
        queryFn: async () => {
            const params = new URLSearchParams({ from, to });
            const response = await fetch(`${API_URL}/api/weather/${polygonId}/history?${params}`);
            if (!response.ok) throw new Error('Failed to fetch weather history');
            return response.json() as Promise<WeatherData[]>;
        }
    });
};

export const useWeatherAlerts = () => {
    return useQuery({
        queryKey: ['weather-alerts'],
        queryFn: async () => {
            const response = await fetch(`${API_URL}/api/weather/alerts`);
            if (!response.ok) throw new Error('Failed to fetch weather alerts');
            return response.json() as Promise<WeatherData[]>;
        },
        refetchInterval: 10 * 60 * 1000 // Actualizar cada 10 minutos
    });
};

export const useAllWeather = () => {
    return useQuery({
        queryKey: ['weather-all'],
        queryFn: async () => {
            const response = await fetch(`${API_URL}/api/weather/all`);
            if (!response.ok) throw new Error('Failed to fetch all weather');
            return response.json() as Promise<Array<{
                polygon_id: string;
                polygon_name: string;
                weather: WeatherData | null;
            }>>;
        },
        refetchInterval: 60 * 60 * 1000,
        staleTime: 30 * 60 * 1000
    });
};



