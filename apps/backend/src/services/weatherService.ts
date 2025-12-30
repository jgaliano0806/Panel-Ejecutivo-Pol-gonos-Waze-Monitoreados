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

// Tipos para proveedores de clima
type WeatherProvider = 'accuweather' | 'openmeteo';

interface AccuWeatherResponse {
    WeatherText: string;
    WeatherIcon: number;
    Temperature: {
        Metric: { Value: number; Unit: string };
        Imperial: { Value: number; Unit: string };
    };
    RealFeelTemperature: {
        Metric: { Value: number; Unit: string };
    };
    RelativeHumidity: number;
    PrecipitationSummary: {
        Precipitation: {
            Metric: { Value: number; Unit: string };
        };
        PastHour: {
            Metric: { Value: number; Unit: string };
        };
    };
    Wind: {
        Speed: {
            Metric: { Value: number; Unit: string };
        };
        Direction: {
            Degrees: number;
            Localized: string;
        };
    };
    WindGust: {
        Speed: {
            Metric: { Value: number; Unit: string };
        };
    };
    Visibility: {
        Metric: { Value: number; Unit: string };
    };
    CloudCover: number;
    HasPrecipitation: boolean;
    PrecipitationType?: string;
    IsDayTime: boolean;
}

export class WeatherService {
    private db: DatabaseService;
    private readonly OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
    private readonly ACCUWEATHER_BASE_URL = 'https://dataservice.accuweather.com';
    private readonly ACCUWEATHER_API_KEY = process.env.ACCUWEATHER_API_KEY;
    private readonly WEATHER_PROVIDER: WeatherProvider = (process.env.WEATHER_PROVIDER as WeatherProvider) || 'openmeteo';

    constructor() {
        this.db = DatabaseService.getInstance();

        console.log(`🌤️ Proveedor de clima configurado: ${this.WEATHER_PROVIDER}`);

        if (this.WEATHER_PROVIDER === 'accuweather') {
            if (this.ACCUWEATHER_API_KEY) {
                console.log('✅ AccuWeather API Key configurada');
            } else {
                console.warn('⚠️ AccuWeather configurado pero ACCUWEATHER_API_KEY no está definida. Usando Open-Meteo como fallback.');
                console.warn('   Para usar AccuWeather, agrega ACCUWEATHER_API_KEY a tu archivo .env');
            }
        } else {
            console.log('✅ Usando Open-Meteo (gratuito)');
        }
    }

    /**
     * Obtiene el location key de AccuWeather para las coordenadas dadas
     */
    private async getAccuWeatherLocationKey(latitude: number, longitude: number): Promise<string | null> {
        if (!this.ACCUWEATHER_API_KEY) return null;

        try {
            const url = `${this.ACCUWEATHER_BASE_URL}/locations/v1/cities/geoposition/search`;
            const params = new URLSearchParams({
                apikey: this.ACCUWEATHER_API_KEY,
                q: `${latitude},${longitude}`,
                language: 'es-ar'
            });

            const response = await fetch(`${url}?${params}`);
            if (!response.ok) {
                console.error(`AccuWeather location error: ${response.status}`);
                return null;
            }

            const data = await response.json();
            return data.Key || null;
        } catch (error) {
            console.error('Error obteniendo location key de AccuWeather:', error);
            return null;
        }
    }

    /**
     * Obtiene datos del clima desde AccuWeather
     */
    private async fetchAccuWeather(
        polygonId: string,
        latitude: number,
        longitude: number
    ): Promise<WeatherData | null> {
        try {
            // Obtener location key
            const locationKey = await this.getAccuWeatherLocationKey(latitude, longitude);
            if (!locationKey) {
                console.warn(`⚠️ No se pudo obtener location key de AccuWeather para ${polygonId}`);
                return null;
            }

            // Obtener condiciones actuales
            const currentConditionsUrl = `${this.ACCUWEATHER_BASE_URL}/currentconditions/v1/${locationKey}`;
            const params = new URLSearchParams({
                apikey: this.ACCUWEATHER_API_KEY!,
                language: 'es-ar',
                details: 'true'
            });

            const response = await fetch(`${currentConditionsUrl}?${params}`);
            if (!response.ok) {
                console.error(`AccuWeather API error: ${response.status}`);
                return null;
            }

            const data: AccuWeatherResponse[] = await response.json();
            if (!data || data.length === 0) {
                console.warn('AccuWeather: No se recibieron datos');
                return null;
            }

            const current = data[0];

            // Convertir velocidad del viento (AccuWeather ya viene en km/h)
            const windSpeedKmh = current.Wind?.Speed?.Metric?.Value || 0;
            const windGustsKmh = current.WindGust?.Speed?.Metric?.Value || windSpeedKmh;

            // Precipitación en mm - Log detallado para debugging
            const precipitation = current.PrecipitationSummary?.Precipitation?.Metric?.Value || 0;
            const pastHourPrecipitation = current.PrecipitationSummary?.PastHour?.Metric?.Value || 0;
            const effectivePrecipitation = precipitation > 0 ? precipitation : pastHourPrecipitation;

            // Log detallado de precipitación para debugging
            console.log(`🌧️ AccuWeather Precipitation Data for ${polygonId}:`, {
                hasPrecipitation: current.HasPrecipitation,
                precipitationType: current.PrecipitationType,
                precipitation: precipitation,
                pastHourPrecipitation: pastHourPrecipitation,
                effectivePrecipitation: effectivePrecipitation,
                weatherText: current.WeatherText
            });

            // Determinar si está lloviendo - lógica mejorada
            const isRaining = Boolean(
                current.HasPrecipitation === true ||
                (current.PrecipitationType && current.PrecipitationType.toLowerCase().includes('rain')) ||
                effectivePrecipitation > 0.1 || // Umbral mínimo de 0.1mm
                (current.WeatherText && (
                    current.WeatherText.toLowerCase().includes('lluvia') ||
                    current.WeatherText.toLowerCase().includes('tormenta') ||
                    current.WeatherText.toLowerCase().includes('precipitación')
                ))
            );

            console.log(`🌧️ Rain detection result: ${isRaining} for ${polygonId}`);

            // Calcular temperatura de carretera
            const roadTemp = this.calculateRoadTemperature(
                current.Temperature.Metric.Value,
                windSpeedKmh,
                current.CloudCover || 0
            );

            // Detectar riesgo de congelamiento
            const isFreezingRisk = this.detectFreezingRisk(
                current.Temperature.Metric.Value,
                roadTemp,
                isRaining
            );

            // Mapear descripción del clima
            const weatherDescription = current.WeatherText || 'Desconocido';

            // Determinar código WMO aproximado basado en descripción
            let weatherCode = 0;
            const weatherTextLower = weatherDescription.toLowerCase();
            if (weatherTextLower.includes('lluvia') || weatherTextLower.includes('rain')) {
                weatherCode = effectivePrecipitation > 5 ? 65 : 61;
            } else if (weatherTextLower.includes('llovizna') || weatherTextLower.includes('drizzle')) {
                weatherCode = 51;
            } else if (weatherTextLower.includes('nieve') || weatherTextLower.includes('snow')) {
                weatherCode = 71;
            } else if (weatherTextLower.includes('tormenta') || weatherTextLower.includes('storm')) {
                weatherCode = 95;
            } else if (weatherTextLower.includes('niebla') || weatherTextLower.includes('fog')) {
                weatherCode = 45;
            } else if (current.CloudCover && current.CloudCover > 75) {
                weatherCode = 3;
            } else if (current.CloudCover && current.CloudCover > 50) {
                weatherCode = 2;
            }

            const weatherData: WeatherData = {
                polygon_id: polygonId,
                timestamp: new Date(),
                temperature_celsius: current.Temperature.Metric.Value,
                temperature_feels_like: current.RealFeelTemperature?.Metric?.Value || current.Temperature.Metric.Value,
                precipitation_mm: effectivePrecipitation,
                rain_mm: isRaining ? effectivePrecipitation : 0,
                snow_mm: current.PrecipitationType?.toLowerCase().includes('snow') ? effectivePrecipitation : 0,
                precipitation_probability: isRaining ? 100 : 0,
                wind_speed_kmh: windSpeedKmh,
                wind_direction_degrees: current.Wind?.Direction?.Degrees || 0,
                wind_gusts_kmh: windGustsKmh,
                visibility_meters: current.Visibility?.Metric?.Value ? current.Visibility.Metric.Value * 1000 : undefined,
                cloud_cover_percentage: current.CloudCover || 0,
                road_temperature_celsius: roadTemp,
                is_freezing_risk: isFreezingRisk,
                weather_code: weatherCode,
                weather_description: weatherDescription
            };

            // Detectar alertas meteorológicas
            const alert = this.detectWeatherAlert(weatherData);
            if (alert) {
                weatherData.has_weather_alert = true;
                weatherData.alert_severity = alert.severity;
                weatherData.alert_description = alert.description;
            }

            console.log(`🌤️ AccuWeather data for ${polygonId}:`, {
                temperature: weatherData.temperature_celsius,
                precipitation: weatherData.precipitation_mm,
                rain: weatherData.rain_mm,
                description: weatherData.weather_description,
                isRaining: isRaining
            });

            if (isRaining) {
                console.log(`🌧️ LLUVIA DETECTADA (AccuWeather) en ${polygonId}:`, {
                    precipitation_mm: weatherData.precipitation_mm,
                    description: weatherData.weather_description
                });
            }

            return weatherData;
        } catch (error) {
            console.error('Error fetching AccuWeather data:', error);
            return null;
        }
    }

    async fetchWeatherForPolygon(
        polygonId: string,
        latitude: number,
        longitude: number
    ): Promise<WeatherData | null> {
        // Intentar con el proveedor configurado
        if (this.WEATHER_PROVIDER === 'accuweather' && this.ACCUWEATHER_API_KEY) {
            const accuWeatherData = await this.fetchAccuWeather(polygonId, latitude, longitude);
            if (accuWeatherData) {
                return accuWeatherData;
            }
            console.warn(`⚠️ AccuWeather falló para ${polygonId}, usando Open-Meteo como fallback`);
        }

        // Usar Open-Meteo como proveedor principal o fallback
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

            // Log para debugging - ver qué datos está devolviendo la API
            console.log(`🌤️ Open-Meteo data for ${polygonId}:`, {
                time: data.current.time,
                temperature: data.current.temperature_2m,
                precipitation: data.current.precipitation,
                rain: data.current.rain,
                snowfall: data.current.snowfall,
                weather_code: data.current.weather_code,
                weather_desc: WMO_WEATHER_CODES[data.current.weather_code] || 'Desconocido',
                cloud_cover: data.current.cloud_cover
            });

            // Detectar si está lloviendo basado en weather_code (más confiable que precipitation)
            // Códigos que indican lluvia: 51-67 (llovizna y lluvia), 80-82 (chubascos), 95-99 (tormentas)
            const isRaining = data.current.weather_code >= 51 && data.current.weather_code <= 67 ||
                             data.current.weather_code >= 80 && data.current.weather_code <= 82 ||
                             data.current.weather_code >= 95 && data.current.weather_code <= 99;

            // Si el weather_code indica lluvia pero precipitation es 0, usar un valor mínimo
            // Open-Meteo puede reportar 0mm de precipitación acumulada pero el código indica lluvia actual
            const effectivePrecipitation = isRaining && data.current.precipitation === 0
                ? 0.1 // Mínimo para indicar que está lloviendo
                : data.current.precipitation;

            const effectiveRain = isRaining && data.current.rain === 0 && data.current.weather_code >= 61 && data.current.weather_code <= 67
                ? 0.1
                : data.current.rain;

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
                effectivePrecipitation > 0 || isRaining
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
                precipitation_mm: effectivePrecipitation,
                rain_mm: effectiveRain,
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

            // Log adicional si detectamos lluvia
            if (isRaining) {
                console.log(`🌧️ LLUVIA DETECTADA en ${polygonId}:`, {
                    weather_code: data.current.weather_code,
                    description: weatherData.weather_description,
                    precipitation_mm: weatherData.precipitation_mm,
                    rain_mm: weatherData.rain_mm,
                    probability: weatherData.precipitation_probability
                });
            }

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
            weatherData.temperature_celsius ?? null,
            weatherData.temperature_feels_like ?? null,
            weatherData.precipitation_mm ?? null,
            weatherData.rain_mm ?? null,
            weatherData.snow_mm ?? null,
            weatherData.precipitation_probability ?? null,
            weatherData.wind_speed_kmh ?? null,
            weatherData.wind_direction_degrees ?? null,
            weatherData.wind_gusts_kmh ?? null,
            weatherData.visibility_meters ?? null,
            weatherData.cloud_cover_percentage ?? null,
            weatherData.road_temperature_celsius ?? null,
            weatherData.is_freezing_risk ?? false,
            weatherData.weather_code ?? null,
            weatherData.weather_description ?? null,
            weatherData.has_weather_alert ?? false,
            weatherData.alert_severity ?? null,
            weatherData.alert_description ?? null
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
        try {
            const query = `
                SELECT * FROM polygon_weather_data
                WHERE has_weather_alert = true
                AND timestamp >= NOW() - INTERVAL '1 hour'
                ORDER BY timestamp DESC
            `;

            const result = await this.db.query(query);
            return result.rows as WeatherData[];
        } catch (error) {
            console.error('Error getting active weather alerts:', error);
            // Retornar array vacío en caso de error para no romper el frontend
            return [];
        }
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

        // Alerta por lluvia (usar weather_code además de rain_mm)
        const weatherCode = weather.weather_code ?? 0;
        const isRaining = (weatherCode >= 51 && weatherCode <= 67) ||
                         (weatherCode >= 80 && weatherCode <= 82) ||
                         (weatherCode >= 95 && weatherCode <= 99);

        if (isRaining || (weather.rain_mm && weather.rain_mm > 0)) {
            if (weather.rain_mm && weather.rain_mm > 10) {
                alerts.push({
                    severity: 'HIGH',
                    description: `Lluvia intensa: ${weather.rain_mm.toFixed(1)}mm - ${weather.weather_description}`
                });
            } else if (weather.rain_mm && weather.rain_mm > 5) {
                alerts.push({
                    severity: 'MEDIUM',
                    description: `Lluvia moderada: ${weather.rain_mm.toFixed(1)}mm - ${weather.weather_description}`
                });
            } else if (isRaining) {
                alerts.push({
                    severity: 'LOW',
                    description: `Lluvia detectada: ${weather.weather_description}`
                });
            }
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

export const weatherService = new WeatherService();



