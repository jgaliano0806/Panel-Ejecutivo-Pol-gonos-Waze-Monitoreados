import { useQuery } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "/api";

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
    queryKey: ["weather", polygonId],
    queryFn: async ({ queryKey }) => {
      // Verificar si es un refetch manual (buscar force_refresh en la key)
      const forceRefresh = queryKey.length > 2 && queryKey[2] === "force";
      const url = forceRefresh
        ? `${API_URL}/weather/${polygonId}?force_refresh=true`
        : `${API_URL}/weather/${polygonId}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch weather");
      const data = (await response.json()) as WeatherData;

      // Agregar metadata de proveedor para UI
      return {
        ...data,
        _provider: "open-meteo", // Indicador de que usa Open-Meteo
        _lastUpdate: new Date().toISOString(),
      } as WeatherData & { _provider: string; _lastUpdate: string };
    },
    refetchInterval: 60 * 60 * 1000, // Actualizar cada hora (Open-Meteo)
    staleTime: 15 * 60 * 1000, // 15 minutos (más fresco)
    gcTime: 60 * 60 * 1000, // Mantener en cache por 1 hora
  });
};

export const useWeatherHistory = (
  polygonId: string,
  from: string,
  to: string,
) => {
  return useQuery({
    queryKey: ["weather-history", polygonId, from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      const response = await fetch(
        `${API_URL}/weather/${polygonId}/history?${params}`,
      );
      if (!response.ok) throw new Error("Failed to fetch weather history");
      return response.json() as Promise<WeatherData[]>;
    },
  });
};

export const useWeatherAlerts = () => {
  return useQuery({
    queryKey: ["weather-alerts"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/weather/alerts`);
      if (!response.ok) throw new Error("Failed to fetch weather alerts");
      return response.json() as Promise<WeatherData[]>;
    },
    refetchInterval: 10 * 60 * 1000, // Actualizar cada 10 minutos
  });
};

export const useAllWeather = () => {
  return useQuery({
    queryKey: ["weather-all"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/weather/all`);
      if (!response.ok) throw new Error("Failed to fetch all weather");
      return response.json() as Promise<
        Array<{
          polygon_id: string;
          polygon_name: string;
          weather: WeatherData | null;
        }>
      >;
    },
    refetchInterval: 60 * 60 * 1000,
    staleTime: 30 * 60 * 1000,
  });
};
