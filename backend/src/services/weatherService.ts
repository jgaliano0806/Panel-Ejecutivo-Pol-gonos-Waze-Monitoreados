import { DatabaseService } from '../database/dbService';

interface WeatherData {
    polygon_id: string;
    timestamp: Date;
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

interface OpenMeteoResponse {
    current: {
        time: string;
        temperature_2m: number;
        apparent_temperature: number;
        precipitation: number;
        rain: number;
        snowfall: number;
        weather_code: number;
        cloud_cover: number;
        wind_speed_10m: number;
        wind_direction_10m: number;
        wind_gusts_10m: number;
    };
    hourly?: {
        time: string[];
        precipitation_probability?: number[];
        visibility?: number[];
    };
}

// Mapeo de códigos WMO a descripciones en español
const WMO_WEATHER_CODES: Record<number, string> = {
    0: 'Despejado',
    1: 'Mayormente despejado',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Niebla',
    48: 'Niebla con escarcha',
    51: 'Llovizna ligera',
    53: 'Llovizna moderada',
    55: 'Llovizna intensa',
    61: 'Lluvia ligera',
    63: 'Lluvia moderada',
    65: 'Lluvia intensa',
    71: 'Nieve ligera',
    73: 'Nieve moderada',
    75: 'Nieve intensa',
    77: 'Granizo',
    80: 'Chubascos ligeros',
    81: 'Chubascos moderados',
    82: 'Chubascos intensos',
    85: 'Chubascos de nieve ligeros',
    86: 'Chubascos de nieve intensos',
    95: 'Tormenta',
    96: 'Tormenta con granizo ligero',
    99: 'Tormenta con granizo intenso'
};

export class WeatherService {
    private db: DatabaseService;
    private readonly OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

    constructor() {
        this.db = DatabaseService.getInstance();
    }

    async fetchWeatherForPolygon(
        polygonId: string,
        latitude: number,
        longitude: number
    ): Promise<WeatherData | null> {
        try {
            const url = new URL(this.OPEN_METEO_BASE_URL);
            url.searchParams.append('latitude', latitude.toString());
            url.searchParams.append('longitude', longitude.toString());
            url.searchParams.append('current', [
                'temperature_2m',
                'apparent_temperature',
                'precipitation',
                'rain',
                'snowfall',
                'weather_code',
                'cloud_cover',
                'wind_speed_10m',
                'wind_direction_10m',
                'wind_gusts_10m'
            ].join(','));
            url.searchParams.append('hourly', 'precipitation_probability,visibility');
            url.searchParams.append('timezone', 'auto');

            const response = await fetch(url.toString());

            if (!response.ok) {
                console.error(`Open-Meteo API error: ${response.status}`);
                return null;
            }

            const data: OpenMeteoResponse = await response.json();

            // Calcular temperatura de carretera (aproximación)
            const roadTemp = this.calculateRoadTemperature(
                data.current.temperature_2m,
                data.current.wind_speed_10m,
                data.current.cloud_cover
            );

            // Detectar riesgo de congelamiento
            const isFreezingRisk = this.detectFreezingRisk(
                data.current.temperature_2m,
                roadTemp,
                data.current.precipitation > 0
            );

            // Obtener visibilidad (primera hora disponible)
            const visibility = data.hourly?.visibility?.[0];

            // Obtener probabilidad de precipitación (primera hora)
            const precipProb = data.hourly?.precipitation_probability?.[0];

            const weatherData: WeatherData = {
                polygon_id: polygonId,
                timestamp: new Date(data.current.time),
                temperature_celsius: data.current.temperature_2m,
                temperature_feels_like: data.current.apparent_temperature,
                precipitation_mm: data.current.precipitation,
                rain_mm: data.current.rain,
                snow_mm: data.current.snowfall,
                precipitation_probability: precipProb,
                wind_speed_kmh: data.current.wind_speed_10m,
                wind_direction_degrees: data.current.wind_direction_10m,
                wind_gusts_kmh: data.current.wind_gusts_10m,
                visibility_meters: visibility,
                cloud_cover_percentage: data.current.cloud_cover,
                road_temperature_celsius: roadTemp,
                is_freezing_risk: isFreezingRisk,
                weather_code: data.current.weather_code,
                weather_description: WMO_WEATHER_CODES[data.current.weather_code] || 'Desconocido'
            };

            // Detectar alertas meteorológicas
            const alert = this.detectWeatherAlert(weatherData);
            if (alert) {
                weatherData.has_weather_alert = true;
                weatherData.alert_severity = alert.severity;
                weatherData.alert_description = alert.description;
            }

            return weatherData;
        } catch (error) {
            console.error('Error fetching weather data:', error);
            return null;
        }
    }

    async saveWeatherData(weatherData: WeatherData): Promise<void> {
        const query = `
            INSERT INTO polygon_weather_data (
                polygon_id, timestamp, temperature_celsius, temperature_feels_like,
                precipitation_mm, rain_mm, snow_mm, precipitation_probability,
                wind_speed_kmh, wind_direction_degrees, wind_gusts_kmh,
                visibility_meters, cloud_cover_percentage,
                road_temperature_celsius, is_freezing_risk,
                weather_code, weather_description,
                has_weather_alert, alert_severity, alert_description
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        `;

        await this.db.query(query, [
            weatherData.polygon_id,
            weatherData.timestamp,
            weatherData.temperature_celsius,
            weatherData.temperature_feels_like,
            weatherData.precipitation_mm,
            weatherData.rain_mm,
            weatherData.snow_mm,
            weatherData.precipitation_probability,
            weatherData.wind_speed_kmh,
            weatherData.wind_direction_degrees,
            weatherData.wind_gusts_kmh,
            weatherData.visibility_meters,
            weatherData.cloud_cover_percentage,
            weatherData.road_temperature_celsius,
            weatherData.is_freezing_risk,
            weatherData.weather_code,
            weatherData.weather_description,
            weatherData.has_weather_alert,
            weatherData.alert_severity,
            weatherData.alert_description
        ]);
    }

    async getLatestWeather(polygonId: string): Promise<WeatherData | null> {
        const query = `
            SELECT * FROM polygon_weather_data
            WHERE polygon_id = $1
            ORDER BY timestamp DESC
            LIMIT 1
        `;

        const result = await this.db.query(query, [polygonId]);
        return result.rows[0] as WeatherData || null;
    }

    async getWeatherHistory(
        polygonId: string,
        from: Date,
        to: Date
    ): Promise<WeatherData[]> {
        const query = `
            SELECT * FROM polygon_weather_data
            WHERE polygon_id = $1
            AND timestamp >= $2
            AND timestamp <= $3
            ORDER BY timestamp DESC
        `;

        const result = await this.db.query(query, [polygonId, from, to]);
        return result.rows as WeatherData[];
    }

    async getActiveWeatherAlerts(): Promise<WeatherData[]> {
        const query = `
            SELECT * FROM polygon_weather_data
            WHERE has_weather_alert = TRUE
            AND timestamp >= NOW() - INTERVAL '1 hour'
            ORDER BY timestamp DESC
        `;

        const result = await this.db.query(query);
        return result.rows as WeatherData[];
    }

    // Cálculo aproximado de temperatura de carretera
    private calculateRoadTemperature(
        airTemp: number,
        windSpeed: number,
        cloudCover: number
    ): number {
        // Fórmula simplificada: la carretera puede ser más fría que el aire
        // especialmente con cielo despejado (radiación) y viento bajo
        let roadTemp = airTemp;

        // Ajuste por nubosidad (cielo despejado = más frío de noche)
        const hour = new Date().getHours();
        if (hour >= 20 || hour <= 6) {
            // Noche: cielo despejado enfría más
            roadTemp -= (100 - cloudCover) / 50; // Hasta -2°C
        }

        // Ajuste por viento (viento reduce diferencia)
        roadTemp += windSpeed / 20; // Viento atenúa enfriamiento

        return Math.round(roadTemp * 10) / 10;
    }

    // Detectar riesgo de congelamiento
    private detectFreezingRisk(
        airTemp: number,
        roadTemp: number,
        hasPrecipitation: boolean
    ): boolean {
        // Riesgo si temperatura de carretera cerca o bajo 0°C
        if (roadTemp <= 0) return true;

        // Riesgo si hay precipitación y temperatura cercana a 0°C
        if (hasPrecipitation && roadTemp <= 2) return true;

        // Riesgo si aire está bajo 0°C
        if (airTemp <= 0) return true;

        return false;
    }

    // Detectar alertas meteorológicas críticas
    private detectWeatherAlert(weather: WeatherData): {
        severity: string;
        description: string;
    } | null {
        const alerts: Array<{ severity: string; description: string }> = [];

        // Alerta por congelamiento
        if (weather.is_freezing_risk) {
            alerts.push({
                severity: 'HIGH',
                description: 'Riesgo de congelamiento en carretera'
            });
        }

        // Alerta por lluvia intensa
        if (weather.rain_mm && weather.rain_mm > 10) {
            alerts.push({
                severity: 'MEDIUM',
                description: 'Lluvia intensa - reducir velocidad'
            });
        }

        // Alerta por nieve
        if (weather.snow_mm && weather.snow_mm > 0) {
            alerts.push({
                severity: 'HIGH',
                description: 'Nevadas - extremar precauciones'
            });
        }

        // Alerta por viento fuerte
        if (weather.wind_gusts_kmh && weather.wind_gusts_kmh > 60) {
            alerts.push({
                severity: 'MEDIUM',
                description: 'Vientos fuertes - cuidado con vehículos altos'
            });
        }

        // Alerta por baja visibilidad
        if (weather.visibility_meters && weather.visibility_meters < 1000) {
            alerts.push({
                severity: 'HIGH',
                description: 'Visibilidad reducida - encender luces'
            });
        }

        // Alerta por tormenta
        if (weather.weather_code && weather.weather_code >= 95) {
            alerts.push({
                severity: 'CRITICAL',
                description: 'Tormenta eléctrica - extremar precauciones'
            });
        }

        // Retornar la alerta más severa
        if (alerts.length === 0) return null;

        const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
        alerts.sort((a, b) =>
            severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
        );

        return alerts[0];
    }
}

