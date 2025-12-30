import { BaseRepository } from './BaseRepository';
import { Pool } from 'pg';

export interface WeatherData {
  id?: string;
  polygon_id: string;
  timestamp: Date;
  temperature: number;
  precipitation: number;
  weatherCode: number;
  windSpeed: number;
  visibility: number;
  humidity: number;
  isDangerous: boolean;
  alertDescription?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class WeatherRepository extends BaseRepository<WeatherData> {
  readonly tableName = 'polygon_weather_data';

  constructor(db: Pool) {
    super(db);
  }

  mapRowToEntity(row: any): WeatherData {
    return {
      id: row.id,
      polygon_id: row.polygon_id,
      timestamp: row.timestamp,
      temperature: parseFloat(row.temperature_celsius || '0'),
      precipitation: parseFloat(row.precipitation_mm || '0'),
      weatherCode: parseInt(row.weather_code, 10),
      windSpeed: parseFloat(row.wind_speed_kmh || '0'),
      visibility: parseInt(row.visibility_m, 10),
      humidity: parseFloat(row.humidity_percent || '0'),
      isDangerous: row.is_dangerous,
      alertDescription: row.alert_description,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  mapEntityToRow(entity: Partial<WeatherData>): Record<string, any> {
    const row: Record<string, any> = {};
    if (entity.id) row.id = entity.id;
    if (entity.polygon_id) row.polygon_id = entity.polygon_id;
    if (entity.timestamp) row.timestamp = entity.timestamp;
    if (entity.temperature !== undefined) row.temperature_celsius = entity.temperature;
    if (entity.precipitation !== undefined) row.precipitation_mm = entity.precipitation;
    if (entity.weatherCode !== undefined) row.weather_code = entity.weatherCode;
    if (entity.windSpeed !== undefined) row.wind_speed_kmh = entity.windSpeed;
    if (entity.visibility !== undefined) row.visibility_m = entity.visibility;
    if (entity.humidity !== undefined) row.humidity_percent = entity.humidity;
    if (entity.isDangerous !== undefined) row.is_dangerous = entity.isDangerous;
    if (entity.alertDescription) row.alert_description = entity.alertDescription;

    return row;
  }

  async findLatestByPolygon(polygonId: string): Promise<WeatherData | null> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName}
       WHERE polygon_id = $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [polygonId]
    );
    return result.rows[0] ? this.mapRowToEntity(result.rows[0]) : null;
  }
}
