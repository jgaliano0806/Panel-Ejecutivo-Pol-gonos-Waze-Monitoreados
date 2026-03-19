import { DatabaseService } from "../database/dbService";
import { logger } from "../utils/logger";

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
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Niebla",
  48: "Niebla con escarcha",
  51: "Llovizna ligera",
  53: "Llovizna moderada",
  55: "Llovizna intensa",
  61: "Lluvia ligera",
  63: "Lluvia moderada",
  65: "Lluvia intensa",
  71: "Nieve ligera",
  73: "Nieve moderada",
  75: "Nieve intensa",
  77: "Granizo",
  80: "Chubascos ligeros",
  81: "Chubascos moderados",
  82: "Chubascos intensos",
  85: "Chubascos de nieve ligeros",
  86: "Chubascos de nieve intensos",
  95: "Tormenta",
  96: "Tormenta con granizo ligero",
  99: "Tormenta con granizo intenso",
};

// Tipos para proveedores de clima
type WeatherProvider = "accuweather" | "openmeteo";

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
  private readonly OPEN_METEO_BASE_URL =
    "https://api.open-meteo.com/v1/forecast";
  private readonly ACCUWEATHER_BASE_URL = "https://dataservice.accuweather.com";
  private readonly ACCUWEATHER_API_KEY = process.env.ACCUWEATHER_API_KEY;
  private readonly WEATHER_PROVIDER: WeatherProvider =
    (process.env.WEATHER_PROVIDER as WeatherProvider) || "openmeteo";
  private initialized = false;

  constructor() {
    this.db = DatabaseService.getInstance();

    logger.info(`🌤️ Proveedor de clima configurado: ${this.WEATHER_PROVIDER}`);

    if (this.WEATHER_PROVIDER === "accuweather") {
      if (this.ACCUWEATHER_API_KEY) {
        logger.info("✅ AccuWeather API Key configurada");
      } else {
        logger.warn(
          "⚠️ AccuWeather configurado pero ACCUWEATHER_API_KEY no está definida. Usando Open-Meteo como fallback.",
        );
        logger.warn(
          "   Para usar AccuWeather, agrega ACCUWEATHER_API_KEY a tu archivo .env",
        );
      }
    } else {
      logger.info("✅ Usando Open-Meteo (gratuito)");
    }

    // Inicializar tabla en background
    this.initializeTable().catch((err) =>
      logger.error(`Error inicializando tabla weather: ${err}`),
    );
  }

  /**
   * Inicializa/actualiza la tabla polygon_weather_data con el esquema completo
   */
  private async initializeTable(): Promise<void> {
    if (this.initialized) return;

    try {
      // Agregar todas las columnas necesarias (IF NOT EXISTS es seguro)
      await this.db.query(`
                ALTER TABLE polygon_weather_data
                ADD COLUMN IF NOT EXISTS temperature_feels_like DECIMAL(5,2);

                ALTER TABLE polygon_weather_data
                ADD COLUMN IF NOT EXISTS rain_mm DECIMAL(6,2);

                ALTER TABLE polygon_weather_data
                ADD COLUMN IF NOT EXISTS snow_mm DECIMAL(6,2);

                ALTER TABLE polygon_weather_data
                ADD COLUMN IF NOT EXISTS precipitation_probability INTEGER;

                ALTER TABLE polygon_weather_data
                ADD COLUMN IF NOT EXISTS wind_direction_degrees INTEGER;

                ALTER TABLE polygon_weather_data
                ADD COLUMN IF NOT EXISTS wind_gusts_kmh DECIMAL(5,2);

                ALTER TABLE polygon_weather_data
                ADD COLUMN IF NOT EXISTS visibility_meters INTEGER;

                ALTER TABLE polygon_weather_data
                ADD COLUMN IF NOT EXISTS cloud_cover_percentage INTEGER;

                ALTER TABLE polygon_weather_data
                ADD COLUMN IF NOT EXISTS road_temperature_celsius DECIMAL(5,2);

                ALTER TABLE polygon_weather_data
                ADD COLUMN IF NOT EXISTS is_freezing_risk BOOLEAN DEFAULT false;

                ALTER TABLE polygon_weather_data
                ADD COLUMN IF NOT EXISTS weather_description VARCHAR(255);

                ALTER TABLE polygon_weather_data
                ADD COLUMN IF NOT EXISTS has_weather_alert BOOLEAN DEFAULT false;

                ALTER TABLE polygon_weather_data
                ADD COLUMN IF NOT EXISTS alert_severity VARCHAR(50);

                ALTER TABLE polygon_weather_data
                ADD COLUMN IF NOT EXISTS alert_description TEXT;
            `);

      this.initialized = true;
      logger.info("✅ Tabla polygon_weather_data inicializada/actualizada");
    } catch (error: any) {
      // Si el error es por columna ya existente, es OK
      if (error.code === "42701") {
        this.initialized = true;
        logger.info(
          "✅ Tabla polygon_weather_data ya tiene el esquema correcto",
        );
      } else {
        logger.error(`Error inicializando tabla weather: ${error}`);
      }
    }
  }

  /**
   * Obtiene el location key de AccuWeather para las coordenadas dadas
   */
  private async getAccuWeatherLocationKey(
    latitude: number,
    longitude: number,
  ): Promise<string | null> {
    if (!this.ACCUWEATHER_API_KEY) return null;

    try {
      const url = `${this.ACCUWEATHER_BASE_URL}/locations/v1/cities/geoposition/search`;
      const params = new URLSearchParams({
        apikey: this.ACCUWEATHER_API_KEY,
        q: `${latitude},${longitude}`,
        language: "es-ar",
      });

      const response = await fetch(`${url}?${params}`);
      if (!response.ok) {
        logger.error(`AccuWeather location error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data.Key || null;
    } catch (error) {
      logger.error(`Error obteniendo location key de AccuWeather: ${error}`);
      return null;
    }
  }

  /**
   * Obtiene datos del clima desde AccuWeather
   */
  private async fetchAccuWeather(
    polygonId: string,
    latitude: number,
    longitude: number,
  ): Promise<WeatherData | null> {
    try {
      // Obtener location key
      const locationKey = await this.getAccuWeatherLocationKey(
        latitude,
        longitude,
      );
      if (!locationKey) {
        logger.warn(
          `⚠️ No se pudo obtener location key de AccuWeather para ${polygonId}`,
        );
        return null;
      }

      // Obtener condiciones actuales
      const currentConditionsUrl = `${this.ACCUWEATHER_BASE_URL}/currentconditions/v1/${locationKey}`;
      const params = new URLSearchParams({
        apikey: this.ACCUWEATHER_API_KEY!,
        language: "es-ar",
        details: "true",
      });

      const response = await fetch(`${currentConditionsUrl}?${params}`);
      if (!response.ok) {
        logger.error(`AccuWeather API error: ${response.status}`);
        return null;
      }

      const data: AccuWeatherResponse[] = await response.json();
      if (!data || data.length === 0) {
        logger.warn("AccuWeather: No se recibieron datos");
        return null;
      }

      const current = data[0];

      // Convertir velocidad del viento (AccuWeather ya viene en km/h)
      const windSpeedKmh = current.Wind?.Speed?.Metric?.Value || 0;
      const windGustsKmh =
        current.WindGust?.Speed?.Metric?.Value || windSpeedKmh;

      // Precipitación en mm - Log detallado para debugging
      const precipitation =
        current.PrecipitationSummary?.Precipitation?.Metric?.Value || 0;
      const pastHourPrecipitation =
        current.PrecipitationSummary?.PastHour?.Metric?.Value || 0;
      const effectivePrecipitation =
        precipitation > 0 ? precipitation : pastHourPrecipitation;

      // Log detallado de precipitación para debugging
      logger.debug(
        {
          hasPrecipitation: current.HasPrecipitation,
          precipitationType: current.PrecipitationType,
          precipitation: precipitation,
          pastHourPrecipitation: pastHourPrecipitation,
          effectivePrecipitation: effectivePrecipitation,
          weatherText: current.WeatherText,
        },
        `🌧️ AccuWeather Precipitation Data for ${polygonId}`,
      );

      // Determinar si está lloviendo - lógica mejorada
      const isRaining = Boolean(
        current.HasPrecipitation === true ||
        (current.PrecipitationType &&
          current.PrecipitationType.toLowerCase().includes("rain")) ||
        effectivePrecipitation > 0.1 || // Umbral mínimo de 0.1mm
        (current.WeatherText &&
          (current.WeatherText.toLowerCase().includes("lluvia") ||
            current.WeatherText.toLowerCase().includes("tormenta") ||
            current.WeatherText.toLowerCase().includes("precipitación"))),
      );

      logger.debug(`🌧️ Rain detection result: ${isRaining} for ${polygonId}`);

      // Calcular temperatura de carretera
      const roadTemp = this.calculateRoadTemperature(
        current.Temperature.Metric.Value,
        windSpeedKmh,
        current.CloudCover || 0,
      );

      // Detectar riesgo de congelamiento
      const isFreezingRisk = this.detectFreezingRisk(
        current.Temperature.Metric.Value,
        roadTemp,
        isRaining,
      );

      // Mapear descripción del clima
      const weatherDescription = current.WeatherText || "Desconocido";

      // Determinar código WMO aproximado basado en descripción
      let weatherCode = 0;
      const weatherTextLower = weatherDescription.toLowerCase();
      if (
        weatherTextLower.includes("lluvia") ||
        weatherTextLower.includes("rain")
      ) {
        weatherCode = effectivePrecipitation > 5 ? 65 : 61;
      } else if (
        weatherTextLower.includes("llovizna") ||
        weatherTextLower.includes("drizzle")
      ) {
        weatherCode = 51;
      } else if (
        weatherTextLower.includes("nieve") ||
        weatherTextLower.includes("snow")
      ) {
        weatherCode = 71;
      } else if (
        weatherTextLower.includes("tormenta") ||
        weatherTextLower.includes("storm")
      ) {
        weatherCode = 95;
      } else if (
        weatherTextLower.includes("niebla") ||
        weatherTextLower.includes("fog")
      ) {
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
        temperature_feels_like:
          current.RealFeelTemperature?.Metric?.Value ||
          current.Temperature.Metric.Value,
        precipitation_mm: effectivePrecipitation,
        rain_mm: isRaining ? effectivePrecipitation : 0,
        snow_mm: current.PrecipitationType?.toLowerCase().includes("snow")
          ? effectivePrecipitation
          : 0,
        precipitation_probability: isRaining ? 100 : 0,
        wind_speed_kmh: windSpeedKmh,
        wind_direction_degrees: current.Wind?.Direction?.Degrees || 0,
        wind_gusts_kmh: windGustsKmh,
        visibility_meters: current.Visibility?.Metric?.Value
          ? current.Visibility.Metric.Value * 1000
          : undefined,
        cloud_cover_percentage: current.CloudCover || 0,
        road_temperature_celsius: roadTemp,
        is_freezing_risk: isFreezingRisk,
        weather_code: weatherCode,
        weather_description: weatherDescription,
      };

      // Detectar alertas meteorológicas
      const alert = this.detectWeatherAlert(weatherData);
      if (alert) {
        weatherData.has_weather_alert = true;
        weatherData.alert_severity = alert.severity;
        weatherData.alert_description = alert.description;
      }

      logger.debug(
        {
          temperature: weatherData.temperature_celsius,
          precipitation: weatherData.precipitation_mm,
          rain: weatherData.rain_mm,
          description: weatherData.weather_description,
          isRaining: isRaining,
        },
        `🌤️ AccuWeather data for ${polygonId}`,
      );

      if (isRaining) {
        logger.info(
          {
            precipitation_mm: weatherData.precipitation_mm,
            description: weatherData.weather_description,
          },
          `🌧️ LLUVIA DETECTADA (AccuWeather) en ${polygonId}`,
        );
      }

      return weatherData;
    } catch (error) {
      logger.error(`Error fetching AccuWeather data: ${error}`);
      return null;
    }
  }

  async fetchWeatherForPolygon(
    polygonId: string,
    latitude: number,
    longitude: number,
  ): Promise<WeatherData | null> {
    // Intentar con el proveedor configurado
    if (this.WEATHER_PROVIDER === "accuweather" && this.ACCUWEATHER_API_KEY) {
      const accuWeatherData = await this.fetchAccuWeather(
        polygonId,
        latitude,
        longitude,
      );
      if (accuWeatherData) {
        return accuWeatherData;
      }
      logger.warn(
        `⚠️ AccuWeather falló para ${polygonId}, usando Open-Meteo como fallback`,
      );
    }

    // Usar Open-Meteo como proveedor principal o fallback
    try {
      const url = new URL(this.OPEN_METEO_BASE_URL);
      url.searchParams.append("latitude", latitude.toString());
      url.searchParams.append("longitude", longitude.toString());
      url.searchParams.append(
        "current",
        [
          "temperature_2m",
          "apparent_temperature",
          "precipitation",
          "rain",
          "snowfall",
          "weather_code",
          "cloud_cover",
          "wind_speed_10m",
          "wind_direction_10m",
          "wind_gusts_10m",
        ].join(","),
      );
      url.searchParams.append("hourly", "precipitation_probability,visibility");
      url.searchParams.append("timezone", "auto");

      const response = await fetch(url.toString());

      if (!response.ok) {
        logger.error(`Open-Meteo API error: ${response.status}`);
        return null;
      }

      const data: OpenMeteoResponse = await response.json();

      // Log para debugging - ver qué datos está devolviendo la API
      logger.debug(
        {
          time: data.current.time,
          temperature: data.current.temperature_2m,
          precipitation: data.current.precipitation,
          rain: data.current.rain,
          snowfall: data.current.snowfall,
          weather_code: data.current.weather_code,
          weather_desc:
            WMO_WEATHER_CODES[data.current.weather_code] || "Desconocido",
          cloud_cover: data.current.cloud_cover,
        },
        `🌤️ Open-Meteo data for ${polygonId}`,
      );

      // Detectar si está lloviendo basado en weather_code (más confiable que precipitation)
      // Códigos que indican lluvia: 51-67 (llovizna y lluvia), 80-82 (chubascos), 95-99 (tormentas)
      const isRaining =
        (data.current.weather_code >= 51 && data.current.weather_code <= 67) ||
        (data.current.weather_code >= 80 && data.current.weather_code <= 82) ||
        (data.current.weather_code >= 95 && data.current.weather_code <= 99);

      // Si el weather_code indica lluvia pero precipitation es 0, usar un valor mínimo
      // Open-Meteo puede reportar 0mm de precipitación acumulada pero el código indica lluvia actual
      const effectivePrecipitation =
        isRaining && data.current.precipitation === 0
          ? 0.1 // Mínimo para indicar que está lloviendo
          : data.current.precipitation;

      const effectiveRain =
        isRaining &&
        data.current.rain === 0 &&
        data.current.weather_code >= 61 &&
        data.current.weather_code <= 67
          ? 0.1
          : data.current.rain;

      // Calcular temperatura de carretera (aproximación)
      const roadTemp = this.calculateRoadTemperature(
        data.current.temperature_2m,
        data.current.wind_speed_10m,
        data.current.cloud_cover,
      );

      // Detectar riesgo de congelamiento
      const isFreezingRisk = this.detectFreezingRisk(
        data.current.temperature_2m,
        roadTemp,
        effectivePrecipitation > 0 || isRaining,
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
        weather_description:
          WMO_WEATHER_CODES[data.current.weather_code] || "Desconocido",
      };

      // Log adicional si detectamos lluvia
      if (isRaining) {
        logger.info(
          {
            weather_code: data.current.weather_code,
            description: weatherData.weather_description,
            precipitation_mm: weatherData.precipitation_mm,
            rain_mm: weatherData.rain_mm,
            probability: weatherData.precipitation_probability,
          },
          `🌧️ LLUVIA DETECTADA en ${polygonId}`,
        );
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
      logger.error(`Error fetching weather data: ${error}`);
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
            ON CONFLICT (polygon_id, timestamp) DO UPDATE SET
                temperature_celsius = EXCLUDED.temperature_celsius,
                temperature_feels_like = EXCLUDED.temperature_feels_like,
                precipitation_mm = EXCLUDED.precipitation_mm,
                rain_mm = EXCLUDED.rain_mm,
                snow_mm = EXCLUDED.snow_mm,
                precipitation_probability = EXCLUDED.precipitation_probability,
                wind_speed_kmh = EXCLUDED.wind_speed_kmh,
                wind_direction_degrees = EXCLUDED.wind_direction_degrees,
                wind_gusts_kmh = EXCLUDED.wind_gusts_kmh,
                visibility_meters = EXCLUDED.visibility_meters,
                cloud_cover_percentage = EXCLUDED.cloud_cover_percentage,
                road_temperature_celsius = EXCLUDED.road_temperature_celsius,
                is_freezing_risk = EXCLUDED.is_freezing_risk,
                weather_code = EXCLUDED.weather_code,
                weather_description = EXCLUDED.weather_description,
                has_weather_alert = EXCLUDED.has_weather_alert,
                alert_severity = EXCLUDED.alert_severity,
                alert_description = EXCLUDED.alert_description
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
      weatherData.alert_description ?? null,
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
    return (result.rows[0] as WeatherData) || null;
  }

  async getWeatherHistory(
    polygonId: string,
    from: Date,
    to: Date,
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
      logger.error(`Error getting active weather alerts: ${error}`);
      // Retornar array vacío en caso de error para no romper el frontend
      return [];
    }
  }

  /**
   * Obtiene y almacena datos históricos de las últimas 24 horas desde Open-Meteo.
   * Usado para inicializar el historial cuando la BD está vacía.
   */
  async fetchAndStoreHistorical24h(
    polygonId: string,
    latitude: number,
    longitude: number,
  ): Promise<WeatherData[]> {
    logger.info(
      `📊 Obteniendo historial 24h desde Open-Meteo para ${polygonId}...`,
    );

    try {
      const url = new URL(this.OPEN_METEO_BASE_URL);
      url.searchParams.append("latitude", latitude.toString());
      url.searchParams.append("longitude", longitude.toString());
      url.searchParams.append(
        "hourly",
        [
          "temperature_2m",
          "apparent_temperature",
          "precipitation",
          "rain",
          "snowfall",
          "weather_code",
          "cloud_cover",
          "wind_speed_10m",
          "wind_direction_10m",
          "wind_gusts_10m",
          "visibility",
          "precipitation_probability",
        ].join(","),
      );
      url.searchParams.append("past_hours", "24");
      url.searchParams.append("forecast_hours", "1"); // Solo necesitamos 1 hora de forecast
      url.searchParams.append("timezone", "auto");

      const response = await fetch(url.toString());
      if (!response.ok) {
        logger.error(`Open-Meteo Historical API error: ${response.status}`);
        return [];
      }

      const data = await response.json();

      if (!data.hourly || !data.hourly.time || data.hourly.time.length === 0) {
        logger.warn("Open-Meteo: No hourly data received");
        return [];
      }

      const weatherDataList: WeatherData[] = [];
      const times = data.hourly.time;

      // Procesar cada hora
      for (let i = 0; i < times.length; i++) {
        const timestamp = new Date(times[i]);
        const weatherCode = data.hourly.weather_code?.[i] ?? 0;

        const weatherData: WeatherData = {
          polygon_id: polygonId,
          timestamp,
          temperature_celsius: data.hourly.temperature_2m?.[i] ?? null,
          temperature_feels_like: data.hourly.apparent_temperature?.[i] ?? null,
          precipitation_mm: data.hourly.precipitation?.[i] ?? 0,
          rain_mm: data.hourly.rain?.[i] ?? 0,
          snow_mm: data.hourly.snowfall?.[i] ?? 0,
          precipitation_probability:
            data.hourly.precipitation_probability?.[i] ?? null,
          wind_speed_kmh: data.hourly.wind_speed_10m?.[i] ?? null,
          wind_direction_degrees: data.hourly.wind_direction_10m?.[i] ?? null,
          wind_gusts_kmh: data.hourly.wind_gusts_10m?.[i] ?? null,
          visibility_meters: data.hourly.visibility?.[i] ?? null,
          cloud_cover_percentage: data.hourly.cloud_cover?.[i] ?? null,
          weather_code: weatherCode,
          weather_description: WMO_WEATHER_CODES[weatherCode] || "Desconocido",
        };

        // Calcular temperatura de carretera
        if (
          weatherData.temperature_celsius !== null &&
          weatherData.wind_speed_kmh !== null &&
          weatherData.cloud_cover_percentage !== null
        ) {
          const tempC = weatherData.temperature_celsius!;
          const windSpeed = weatherData.wind_speed_kmh!;
          const cloudCover = weatherData.cloud_cover_percentage!;

          weatherData.road_temperature_celsius = this.calculateRoadTemperature(
            tempC,
            windSpeed,
            cloudCover,
          );

          // Detectar riesgo de congelamiento
          weatherData.is_freezing_risk = this.detectFreezingRisk(
            tempC,
            weatherData.road_temperature_celsius,
            (weatherData.precipitation_mm ?? 0) > 0,
          );
        }

        // Detectar alertas
        const alert = this.detectWeatherAlert(weatherData);
        if (alert) {
          weatherData.has_weather_alert = true;
          weatherData.alert_severity = alert.severity;
          weatherData.alert_description = alert.description;
        }

        weatherDataList.push(weatherData);

        // Guardar en la BD
        try {
          await this.saveWeatherData(weatherData);
        } catch (saveErr) {
          // Si falla un registro (ej: duplicado), continuar con los demás
          logger.warn(
            `No se pudo guardar registro para ${timestamp.toISOString()}`,
          );
        }
      }

      console.log(
        `✅ Historial 24h obtenido: ${weatherDataList.length} registros para ${polygonId}`,
      );
      return weatherDataList;
    } catch (error) {
      console.error("Error fetching historical weather data:", error);
      return [];
    }
  }

  // Cálculo aproximado de temperatura de carretera
  private calculateRoadTemperature(
    airTemp: number,
    windSpeed: number,
    cloudCover: number,
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
    hasPrecipitation: boolean,
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
        severity: "HIGH",
        description: "Riesgo de congelamiento en carretera",
      });
    }

    // Alerta por lluvia (usar weather_code además de rain_mm)
    const weatherCode = weather.weather_code ?? 0;
    const isRaining =
      (weatherCode >= 51 && weatherCode <= 67) ||
      (weatherCode >= 80 && weatherCode <= 82) ||
      (weatherCode >= 95 && weatherCode <= 99);

    if (isRaining || (weather.rain_mm && weather.rain_mm > 0)) {
      if (weather.rain_mm && weather.rain_mm > 10) {
        alerts.push({
          severity: "HIGH",
          description: `Lluvia intensa: ${weather.rain_mm.toFixed(1)}mm - ${
            weather.weather_description
          }`,
        });
      } else if (weather.rain_mm && weather.rain_mm > 5) {
        alerts.push({
          severity: "MEDIUM",
          description: `Lluvia moderada: ${weather.rain_mm.toFixed(1)}mm - ${
            weather.weather_description
          }`,
        });
      } else if (isRaining) {
        alerts.push({
          severity: "LOW",
          description: `Lluvia detectada: ${weather.weather_description}`,
        });
      }
    }

    // Alerta por nieve
    if (weather.snow_mm && weather.snow_mm > 0) {
      alerts.push({
        severity: "HIGH",
        description: "Nevadas - extremar precauciones",
      });
    }

    // Alerta por viento fuerte
    if (weather.wind_gusts_kmh && weather.wind_gusts_kmh > 60) {
      alerts.push({
        severity: "MEDIUM",
        description: "Vientos fuertes - cuidado con vehículos altos",
      });
    }

    // Alerta por baja visibilidad
    if (weather.visibility_meters && weather.visibility_meters < 1000) {
      alerts.push({
        severity: "HIGH",
        description: "Visibilidad reducida - encender luces",
      });
    }

    // Alerta por tormenta
    if (weather.weather_code && weather.weather_code >= 95) {
      alerts.push({
        severity: "CRITICAL",
        description: "Tormenta eléctrica - extremar precauciones",
      });
    }

    // Retornar la alerta más severa
    if (alerts.length === 0) return null;

    const severityOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
    alerts.sort(
      (a, b) =>
        severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
    );

    return alerts[0];
  }

  /**
   * Obtiene datos climáticos históricos para una fecha y ubicación específica
   * Usa la API de Open-Meteo con start_date/end_date para obtener datos pasados (hasta 92 días)
   *
   * @param latitude Latitud de la ubicación
   * @param longitude Longitud de la ubicación
   * @param date Fecha y hora del evento (se buscará la hora más cercana)
   * @returns WeatherData o null si no se pueden obtener datos
   */
  async fetchHistoricalWeatherForDate(
    latitude: number,
    longitude: number,
    date: Date,
  ): Promise<WeatherData | null> {
    try {
      // Verificar que la fecha no sea mayor a 92 días atrás
      const now = new Date();
      const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > 92) {
        console.warn(
          `⚠️ Fecha muy antigua para Open-Meteo: ${Math.floor(
            daysDiff,
          )} días atrás (máximo 92)`,
        );
        return null;
      }

      if (daysDiff < 0) {
        console.warn(
          `⚠️ Fecha en el futuro, usando datos actuales en su lugar`,
        );
        return null;
      }

      const url = new URL(this.OPEN_METEO_BASE_URL);

      // Formatear fecha como YYYY-MM-DD
      const dateStr = date.toISOString().split("T")[0];

      url.searchParams.append("latitude", latitude.toString());
      url.searchParams.append("longitude", longitude.toString());
      url.searchParams.append("start_date", dateStr);
      url.searchParams.append("end_date", dateStr);
      url.searchParams.append(
        "hourly",
        [
          "temperature_2m",
          "apparent_temperature",
          "precipitation",
          "rain",
          "snowfall",
          "weather_code",
          "cloud_cover",
          "wind_speed_10m",
          "wind_direction_10m",
          "wind_gusts_10m",
          "visibility",
          "precipitation_probability",
        ].join(","),
      );
      url.searchParams.append("timezone", "auto");

      console.log(
        `📊 Obteniendo clima histórico para ${dateStr} (${latitude}, ${longitude})...`,
      );

      // Intentar hasta 3 veces con timeout de 30 segundos
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

          const response = await fetch(url.toString(), {
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            console.error(
              `Open-Meteo Historical API error: ${response.status}`,
            );
            if (attempt < 3) {
              console.log(`⏳ Reintentando (${attempt}/3)...`);
              await new Promise((resolve) => setTimeout(resolve, 2000)); // Esperar 2s antes de reintentar
              continue;
            }
            return null;
          }

          const data = await response.json();

          if (
            !data.hourly ||
            !data.hourly.time ||
            data.hourly.time.length === 0
          ) {
            console.warn(
              "Open-Meteo: No hourly data received for historical date",
            );
            return null;
          }

          // Encontrar la hora más cercana al timestamp del accidente
          const targetTime = date.getTime();
          let closestIndex = 0;
          let minDiff = Infinity;

          for (let i = 0; i < data.hourly.time.length; i++) {
            const hourTime = new Date(data.hourly.time[i]).getTime();
            const diff = Math.abs(hourTime - targetTime);
            if (diff < minDiff) {
              minDiff = diff;
              closestIndex = i;
            }
          }

          const closestTime = new Date(data.hourly.time[closestIndex]);
          console.log(
            `🎯 Hora más cercana encontrada: ${closestTime.toISOString()} (índice ${closestIndex})`,
          );

          // Extraer datos de esa hora específica
          const weatherCode = data.hourly.weather_code?.[closestIndex] ?? 0;
          const precipitation = data.hourly.precipitation?.[closestIndex] ?? 0;
          const rain = data.hourly.rain?.[closestIndex] ?? 0;
          const temperature =
            data.hourly.temperature_2m?.[closestIndex] ?? null;
          const windSpeed = data.hourly.wind_speed_10m?.[closestIndex] ?? null;
          const cloudCover = data.hourly.cloud_cover?.[closestIndex] ?? null;

          // Calcular temperatura de carretera si tenemos los datos necesarios
          let roadTemp: number | undefined;
          let isFreezingRisk = false;

          if (
            temperature !== null &&
            windSpeed !== null &&
            cloudCover !== null
          ) {
            roadTemp = this.calculateRoadTemperature(
              temperature,
              windSpeed,
              cloudCover,
            );
            isFreezingRisk = this.detectFreezingRisk(
              temperature,
              roadTemp,
              precipitation > 0,
            );
          }

          const weatherData: WeatherData = {
            polygon_id: `historical-${date.getTime()}`, // ID temporal
            timestamp: closestTime,
            temperature_celsius: temperature,
            temperature_feels_like:
              data.hourly.apparent_temperature?.[closestIndex] ?? null,
            precipitation_mm: precipitation,
            rain_mm: rain,
            snow_mm: data.hourly.snowfall?.[closestIndex] ?? 0,
            precipitation_probability:
              data.hourly.precipitation_probability?.[closestIndex] ?? null,
            wind_speed_kmh: windSpeed,
            wind_direction_degrees:
              data.hourly.wind_direction_10m?.[closestIndex] ?? null,
            wind_gusts_kmh: data.hourly.wind_gusts_10m?.[closestIndex] ?? null,
            visibility_meters: data.hourly.visibility?.[closestIndex] ?? null,
            cloud_cover_percentage: cloudCover,
            road_temperature_celsius: roadTemp,
            is_freezing_risk: isFreezingRisk,
            weather_code: weatherCode,
            weather_description:
              WMO_WEATHER_CODES[weatherCode] || "Desconocido",
          };

          // Detectar alertas meteorológicas
          const alert = this.detectWeatherAlert(weatherData);
          if (alert) {
            weatherData.has_weather_alert = true;
            weatherData.alert_severity = alert.severity;
            weatherData.alert_description = alert.description;
          }

          console.log(`✅ Clima histórico obtenido:`, {
            date: closestTime.toISOString(),
            temperature: weatherData.temperature_celsius,
            precipitation: weatherData.precipitation_mm,
            description: weatherData.weather_description,
          });

          return weatherData;
        } catch (fetchError) {
          lastError =
            fetchError instanceof Error
              ? fetchError
              : new Error(String(fetchError));
          console.error(`❌ Intento ${attempt}/3 fallido:`, lastError.message);
          if (attempt < 3) {
            console.log(`⏳ Esperando antes de reintentar...`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      }

      // Si llegamos aquí, todos los intentos fallaron
      console.error("Error fetching historical weather data:", lastError);
      return null;
    } catch (error) {
      console.error("Error fetching historical weather data:", error);
      return null;
    }
  }
}

export const weatherService = new WeatherService();
