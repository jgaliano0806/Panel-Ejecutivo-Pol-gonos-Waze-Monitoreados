import { BaseRepository } from "./BaseRepository";
import { Pool } from "pg";

export interface RiskScore {
  id?: string;
  polygon_id: string;
  polygon_name?: string;
  group_name?: string;
  final_risk_score: number;
  traffic_score: number;
  incident_score: number;
  weather_score: number;
  speed_score: number;
  delay_score: number;
  predictive_score?: number;
  risk_level: string;
  risk_category?: string;
  alert_triggered?: boolean;
  calculated_at: Date;
  alert_message?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class RiskScoreRepository extends BaseRepository<RiskScore> {
  readonly tableName = "polygon_criticality_scores";

  constructor(db: Pool) {
    super(db);
  }

  mapRowToEntity(row: any): RiskScore {
    return {
      id: row.id,
      polygon_id: row.polygon_id,
      polygon_name: row.polygon_name,
      group_name: row.group_name,
      final_risk_score: parseFloat(row.final_risk_score),
      traffic_score: parseFloat(row.traffic_score || "0"),
      incident_score: parseFloat(row.incident_score || "0"),
      weather_score: parseFloat(row.weather_score || "0"),
      speed_score: parseFloat(row.speed_score || "0"),
      delay_score: parseFloat(row.delay_score || "0"),
      predictive_score: parseFloat(row.predictive_score || "0"),
      risk_level: row.risk_level,
      risk_category: row.risk_category,
      alert_triggered: row.alert_triggered,
      calculated_at: row.calculated_at,
      alert_message: row.alert_message,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  mapEntityToRow(entity: Partial<RiskScore>): Record<string, any> {
    const row: Record<string, any> = {};
    if (entity.id) row.id = entity.id;
    if (entity.polygon_id) row.polygon_id = entity.polygon_id;
    if (entity.polygon_name) row.polygon_name = entity.polygon_name;
    if (entity.group_name) row.group_name = entity.group_name;
    if (entity.final_risk_score !== undefined)
      row.final_risk_score = entity.final_risk_score;
    if (entity.traffic_score !== undefined)
      row.traffic_score = entity.traffic_score;
    if (entity.incident_score !== undefined)
      row.incident_score = entity.incident_score;
    if (entity.weather_score !== undefined)
      row.weather_score = entity.weather_score;
    if (entity.speed_score !== undefined) row.speed_score = entity.speed_score;
    if (entity.delay_score !== undefined) row.delay_score = entity.delay_score;
    if (entity.predictive_score !== undefined)
      row.predictive_score = entity.predictive_score;
    if (entity.risk_level) row.risk_level = entity.risk_level;
    if (entity.risk_category) row.risk_category = entity.risk_category;
    if (entity.alert_triggered !== undefined)
      row.alert_triggered = entity.alert_triggered;
    if (entity.calculated_at) row.calculated_at = entity.calculated_at;
    if (entity.alert_message) row.alert_message = entity.alert_message;

    return row;
  }

  async findLatestByPolygon(polygonId: string): Promise<RiskScore | null> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName}
       WHERE polygon_id = $1
       ORDER BY calculated_at DESC
       LIMIT 1`,
      [polygonId],
    );
    return result.rows[0] ? this.mapRowToEntity(result.rows[0]) : null;
  }
}
