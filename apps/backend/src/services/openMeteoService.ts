import { dbService } from "../database/dbService";
import { cacheService, TTL } from "./cacheService";
import { REAL_POLYGONS, RealPolygonConfig } from "../config/realPolygons";
import {
  OpenMeteoResponse,
  WeatherDataDB,
  WMO_CODES_ES,
  DANGEROUS_WEATHER_CODES,
  WeatherConditions,
} from "@panel-waze/types";

// Socket.io instance (injected)
let io: any = null;

/**
 * Servicio de clima Open-Meteo
 * - API gratuita sin API key
 * - Actualización cada hora
 * - Detección de condiciones peligrosas
 */
export class OpenMeteoService {
  private static instance: OpenMeteoService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private partitionCheckInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private lastPollTime: Date = new Date(0);

  // Configuración
  private readonly API_URL =
    process.env.OPENMETEO_API_URL || "https://api.open-meteo.com/v1/forecast";
  private readonly POLLING_INTERVAL_MS = 3600000; // 1 hora
  private readonly REQUEST_TIMEOUT_MS = 10000; // 10 segundos
  private readonly CACHE_TTL_MS = 300000; // 5 minutos
  private readonly PARTITION_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas
  private readonly PARTITION_MONTHS_AHEAD = 24; // buffer de 2 años

  // Cache simple en memoria
  private cache: Map<string, { data: WeatherDataDB; timestamp: number }> =
    new Map();

  private constructor() {
    console.log("🌤️ OpenMeteoService initialized");
  }

  /**
   * Singleton instance
   */
  public static getInstance(): OpenMeteoService {
    if (!OpenMeteoService.instance) {
      OpenMeteoService.instance = new OpenMeteoService();
    }
    return OpenMeteoService.instance;
  }

  /**
   * Inyecta Socket.io
   */
  public setSocketIO(socketIO: any): void {
    io = socketIO;
    console.log("🔌 Socket.io injected into OpenMeteoService");
  }

  /**
   * Inicia el polling horario
   */
  public async startPolling(): Promise<void> {
    if (this.isPolling) {
      console.warn("⚠️ OpenMeteoService already polling");
      return;
    }

    // Asegurar que la tabla existe
    await this.ensureTable();

    // Asegurar que existan particiones futuras antes de empezar a insertar
    await this.ensurePartitions();

    console.log(
      `🌤️ Starting weather polling (every ${this.POLLING_INTERVAL_MS / 60000} min)`,
    );
    this.isPolling = true;

    // Ejecutar inmediatamente
    this.fetchAllPolygons();

    // Programar polling horario
    this.pollingInterval = setInterval(
      () => this.fetchAllPolygons(),
      this.POLLING_INTERVAL_MS,
    );

    // Verificación diaria de particiones futuras
    this.partitionCheckInterval = setInterval(
      () => this.ensurePartitions(),
      this.PARTITION_CHECK_INTERVAL_MS,
    );
  }

  /**
   * Detiene el polling
   */
  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (this.partitionCheckInterval) {
      clearInterval(this.partitionCheckInterval);
      this.partitionCheckInterval = null;
    }
    this.isPolling = false;
    console.log("🛑 Weather polling stopped");
  }

  /**
   * Garantiza que existan particiones mensuales futuras en polygon_weather_data.
   * Llama a la función SQL idempotente ensure_weather_partitions(months_ahead)
   * creada en la migración 042. Se invoca al arrancar y cada 24 h.
   */
  private async ensurePartitions(): Promise<void> {
    try {
      const result = await dbService.query(
        "SELECT created FROM ensure_weather_partitions($1)",
        [this.PARTITION_MONTHS_AHEAD],
      );
      const created: string[] = result.rows.map((r: any) => r.created);
      if (created.length > 0) {
        console.log(
          `🗂️ Particiones de clima creadas (${created.length}): ${created.join(", ")}`,
        );
      }
    } catch (error) {
      console.error(
        "❌ ensure_weather_partitions falló:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  /**
   * Asegura que la tabla existe
   */
  private async ensureTable(): Promise<void> {
    console.log("🔧 Verificando tabla de clima...");

    try {
      /*
      await dbService.query(`
                CREATE TABLE IF NOT EXISTS polygon_weather_data (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    polygon_id VARCHAR(50) NOT NULL,
                    timestamp TIMESTAMPTZ NOT NULL,
                    temperature_celsius DECIMAL(5,2),
                    precipitation_mm DECIMAL(6,2),
                    weather_code INTEGER,
                    wind_speed_kmh DECIMAL(5,2),
                    visibility_m INTEGER,
                    humidity_percent DECIMAL(5,2),
                    is_dangerous BOOLEAN DEFAULT false,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(polygon_id, timestamp)
                )
            `);

      await dbService.query(`
                CREATE INDEX IF NOT EXISTS idx_weather_polygon_time
                ON polygon_weather_data(polygon_id, timestamp DESC)
            `);
*/

      console.log("✅ Tabla de clima verificada/creada");
    } catch (error) {
      console.error(
        "❌ Error creando tabla de clima:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  /**
   * Fetch clima para todos los polígonos
   */
  private async fetchAllPolygons(): Promise<void> {
    const startTime = Date.now();
    const polygonsWithCoords = REAL_POLYGONS.filter((p) => p.coordinates);

    console.log(
      `🌤️ Fetching weather for ${polygonsWithCoords.length} polygons...`,
    );

    let successCount = 0;
    let dangerousCount = 0;

    for (const polygon of polygonsWithCoords) {
      try {
        const weather = await this.getCurrentWeather(
          polygon.id,
          polygon.coordinates!.lat,
          polygon.coordinates!.lon,
        );

        if (weather) {
          await this.storeWeatherData(polygon.id, weather);
          successCount++;

          if (weather.is_dangerous) {
            dangerousCount++;
            this.emitWeatherUpdate(polygon.id, weather);
          }
        }

        // Rate limiting suave
        await this.sleep(100);
      } catch (error) {
        console.error(
          `❌ Weather error for ${polygon.name}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    const duration = Date.now() - startTime;
    this.lastPollTime = new Date();

    console.log(
      `✅ Weather poll completed in ${duration}ms. Success: ${successCount}/${polygonsWithCoords.length}, Dangerous: ${dangerousCount}`,
    );
  }

  /**
   * Obtiene clima actual de Open-Meteo
   */
  public async getCurrentWeather(
    polygonId: string,
    latitude: number,
    longitude: number,
  ): Promise<WeatherDataDB | null> {
    // Check cache
    const cached = this.cache.get(polygonId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.REQUEST_TIMEOUT_MS,
      );

      const url = new URL(this.API_URL);
      url.searchParams.set("latitude", latitude.toString());
      url.searchParams.set("longitude", longitude.toString());
      url.searchParams.set(
        "current",
        [
          "temperature_2m",
          "precipitation",
          "weather_code",
          "wind_speed_10m",
          "visibility",
          "relative_humidity_2m",
        ].join(","),
      );
      url.searchParams.set("timezone", "auto");

      const response = await fetch(url.toString(), {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Open-Meteo API error: ${response.status}`);
        return null;
      }

      const data: OpenMeteoResponse = await response.json();

      if (!data.current) {
        return null;
      }

      const conditions = this.isDangerous(data.current);

      const weather: WeatherDataDB = {
        id: "", // Auto-generado por DB
        polygon_id: polygonId,
        timestamp: new Date(data.current.time),
        temperature_celsius: data.current.temperature_2m ?? null,
        precipitation_mm: data.current.precipitation ?? null,
        weather_code: data.current.weather_code ?? null,
        wind_speed_kmh: data.current.wind_speed_10m ?? null,
        visibility_meters: data.current.visibility ?? null,
        humidity_percent: data.current.relative_humidity_2m ?? null,
        is_dangerous: conditions.isDangerous,
        created_at: new Date(),
      };

      // Update cache
      this.cache.set(polygonId, { data: weather, timestamp: Date.now() });

      return weather;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.error(`Open-Meteo timeout for ${polygonId}`);
      } else {
        console.error(
          `Open-Meteo error for ${polygonId}:`,
          error instanceof Error ? error.message : error,
        );
      }
      return null;
    }
  }

  /**
   * Obtiene pronóstico horario (24h)
   */
  public async getHourlyForecast(
    latitude: number,
    longitude: number,
  ): Promise<OpenMeteoResponse | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.REQUEST_TIMEOUT_MS,
      );

      const url = new URL(this.API_URL);
      url.searchParams.set("latitude", latitude.toString());
      url.searchParams.set("longitude", longitude.toString());
      url.searchParams.set(
        "hourly",
        ["temperature_2m", "precipitation", "weather_code", "visibility"].join(
          ",",
        ),
      );
      url.searchParams.set("forecast_hours", "24");
      url.searchParams.set("timezone", "auto");

      const response = await fetch(url.toString(), {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(
        "Open-Meteo hourly error:",
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  /**
   * Determina si las condiciones son peligrosas
   */
  public isDangerous(weather: {
    precipitation?: number;
    visibility?: number;
    wind_speed_10m?: number;
    weather_code?: number;
  }): WeatherConditions {
    const reasons: string[] = [];

    // Precipitación > 10mm/h
    if (weather.precipitation && weather.precipitation > 10) {
      reasons.push(
        `Precipitación intensa: ${weather.precipitation.toFixed(1)}mm/h`,
      );
    }

    // Visibilidad < 1000m
    if (weather.visibility && weather.visibility < 1000) {
      reasons.push(`Baja visibilidad: ${weather.visibility}m`);
    }

    // Viento > 60 km/h
    if (weather.wind_speed_10m && weather.wind_speed_10m > 60) {
      reasons.push(`Viento fuerte: ${weather.wind_speed_10m.toFixed(0)} km/h`);
    }

    // Códigos peligrosos (nieve, tormenta, niebla)
    if (
      weather.weather_code &&
      DANGEROUS_WEATHER_CODES.includes(weather.weather_code)
    ) {
      const description =
        WMO_CODES_ES[weather.weather_code] || `Código ${weather.weather_code}`;
      reasons.push(description);
    }

    return {
      isDangerous: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Almacena datos en PostgreSQL (UPSERT)
   */
  public async storeWeatherData(
    polygonId: string,
    data: WeatherDataDB,
  ): Promise<void> {
    try {
      await dbService.query(
        `
                INSERT INTO polygon_weather_data (
                    polygon_id, timestamp, temperature_celsius, precipitation_mm,
                    weather_code, wind_speed_kmh, visibility_meters, humidity_percent,
                    is_dangerous, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                ON CONFLICT (polygon_id, timestamp) DO UPDATE SET
                    temperature_celsius = EXCLUDED.temperature_celsius,
                    precipitation_mm = EXCLUDED.precipitation_mm,
                    weather_code = EXCLUDED.weather_code,
                    wind_speed_kmh = EXCLUDED.wind_speed_kmh,
                    visibility_meters = EXCLUDED.visibility_meters,
                    humidity_percent = EXCLUDED.humidity_percent,
                    is_dangerous = EXCLUDED.is_dangerous
            `,
        [
          polygonId,
          data.timestamp,
          data.temperature_celsius,
          data.precipitation_mm,
          data.weather_code,
          data.wind_speed_kmh,
          data.visibility_meters,
          data.humidity_percent,
          data.is_dangerous,
        ],
      );
    } catch (error) {
      console.error(
        `Error storing weather for ${polygonId}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  /**
   * Emite actualización via WebSocket
   */
  private emitWeatherUpdate(polygonId: string, weather: WeatherDataDB): void {
    if (!io) return;

    io.to(`polygon:${polygonId}`).emit("weather:update", {
      polygonId,
      weather,
      isDangerous: weather.is_dangerous,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Obtiene el último clima de un polígono
   */
  public async getLatestWeather(
    polygonId: string,
  ): Promise<WeatherDataDB | null> {
    try {
      const result = await dbService.query<WeatherDataDB>(
        `
                SELECT * FROM polygon_weather_data
                WHERE polygon_id = $1
                ORDER BY timestamp DESC
                LIMIT 1
            `,
        [polygonId],
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error(
        `Error getting weather for ${polygonId}:`,
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  /**
   * Obtiene alertas de clima peligroso activas
   */
  public async getDangerousWeatherAlerts(): Promise<WeatherDataDB[]> {
    try {
      const result = await dbService.query<WeatherDataDB>(`
                SELECT * FROM polygon_weather_data
                WHERE is_dangerous = true
                AND timestamp >= NOW() - INTERVAL '2 hours'
                ORDER BY timestamp DESC
            `);
      return result.rows;
    } catch (error) {
      console.error(
        "Error getting dangerous weather:",
        error instanceof Error ? error.message : error,
      );
      return [];
    }
  }

  /**
   * Helper para delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Obtiene descripción legible del código WMO
   */
  public getWeatherDescription(code: number): string {
    return WMO_CODES_ES[code] || "Desconocido";
  }

  /**
   * Estado del servicio
   */
  public getStatus(): {
    isPolling: boolean;
    lastPollTime: Date;
    cacheSize: number;
  } {
    return {
      isPolling: this.isPolling,
      lastPollTime: this.lastPollTime,
      cacheSize: this.cache.size,
    };
  }
}

// Exportar singleton
export const openMeteoService = OpenMeteoService.getInstance();
