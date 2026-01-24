/**
 * Open-Meteo Weather API Types
 * API: https://api.open-meteo.com/v1/forecast
 */

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface OpenMeteoRequest {
  latitude: number;
  longitude: number;
  current?: string[];
  hourly?: string[];
  timezone?: string;
  forecast_hours?: number;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface OpenMeteoCurrentData {
  time: string;
  temperature_2m?: number;
  precipitation?: number;
  weather_code?: number;
  wind_speed_10m?: number;
  visibility?: number;
  relative_humidity_2m?: number;
  apparent_temperature?: number;
  rain?: number;
  snowfall?: number;
  cloud_cover?: number;
  wind_direction_10m?: number;
  wind_gusts_10m?: number;
}

export interface OpenMeteoHourlyData {
  time: string[];
  temperature_2m?: number[];
  precipitation?: number[];
  precipitation_probability?: number[];
  weather_code?: number[];
  visibility?: number[];
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current?: OpenMeteoCurrentData;
  hourly?: OpenMeteoHourlyData;
}

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface WeatherDataDB {
  id: string;
  polygon_id: string;
  timestamp: Date;
  temperature_celsius: number | null;
  precipitation_mm: number | null;
  weather_code: number | null;
  wind_speed_kmh: number | null;
  visibility_meters: number | null;
  humidity_percent: number | null;
  is_dangerous: boolean;
  created_at: Date;
}

// ============================================================================
// WMO WEATHER CODES
// https://open-meteo.com/en/docs (Weather interpretation codes)
// ============================================================================

export const WMO_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Drizzle light",
  53: "Drizzle moderate",
  55: "Drizzle dense",
  56: "Freezing drizzle light",
  57: "Freezing drizzle dense",
  61: "Rain slight",
  63: "Rain moderate",
  65: "Rain heavy",
  66: "Freezing rain light",
  67: "Freezing rain heavy",
  71: "Snow fall slight",
  73: "Snow fall moderate",
  75: "Snow fall heavy",
  77: "Snow grains",
  80: "Rain showers slight",
  81: "Rain showers moderate",
  82: "Rain showers violent",
  85: "Snow showers slight",
  86: "Snow showers heavy",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
} as const;

export const WMO_CODES_ES: Record<number, string> = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Niebla",
  48: "Niebla con escarcha",
  51: "Llovizna ligera",
  53: "Llovizna moderada",
  55: "Llovizna intensa",
  56: "Llovizna helada ligera",
  57: "Llovizna helada intensa",
  61: "Lluvia ligera",
  63: "Lluvia moderada",
  65: "Lluvia intensa",
  66: "Lluvia helada ligera",
  67: "Lluvia helada intensa",
  71: "Nieve ligera",
  73: "Nieve moderada",
  75: "Nieve intensa",
  77: "Aguanieve",
  80: "Chubascos ligeros",
  81: "Chubascos moderados",
  82: "Chubascos intensos",
  85: "Chubascos de nieve ligeros",
  86: "Chubascos de nieve intensos",
  95: "Tormenta",
  96: "Tormenta con granizo ligero",
  99: "Tormenta con granizo intenso",
} as const;

// ============================================================================
// DANGEROUS WEATHER CODES
// ============================================================================

export const DANGEROUS_WEATHER_CODES: number[] = [
  45,
  48, // Niebla
  63,
  65, // Lluvia moderada/intensa
  66,
  67, // Lluvia helada
  71,
  73,
  75, // Nieve
  77, // Aguanieve
  82, // Chubascos intensos
  85,
  86, // Chubascos de nieve
  95,
  96,
  99, // Tormentas
];

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface WeatherConditions {
  isDangerous: boolean;
  reasons: string[];
}

export interface WeatherUpdatePayload {
  polygonId: string;
  weather: WeatherDataDB;
  isDangerous: boolean;
  timestamp: string;
}
