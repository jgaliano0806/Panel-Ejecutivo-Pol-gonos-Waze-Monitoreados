import { BaseRepository } from './BaseRepository';
import { Pool } from 'pg';

export interface WazeIrregularity {
  uuid: string;
  polygon_id: string;
  type: string;
  detectionDate?: Date;
  street: string;
  speed: number;
  regularSpeed: number;
  delaySeconds: number;
  severity: number;
  jamLevel: number;
  trend: number;
  line: any; // JSONB polyline
  created_at?: Date;
  updated_at?: Date;
  is_active?: boolean;
}

export class WazeIrregularityRepository extends BaseRepository<WazeIrregularity> {
  readonly tableName = 'waze_irregularities';

  constructor(db: Pool) {
    super(db);
  }

  protected getIdColumn(): string {
    return 'uuid';
  }

  mapRowToEntity(row: any): WazeIrregularity {
    return {
      uuid: row.uuid,
      polygon_id: row.polygon_id,
      type: row.type,
      detectionDate: row.detection_date,
      street: row.street,
      speed: parseFloat(row.speed || '0'),
      regularSpeed: parseFloat(row.regular_speed || '0'),
      delaySeconds: parseInt(row.delay_seconds || '0', 10),
      severity: parseFloat(row.severity || '0'),
      jamLevel: parseInt(row.jam_level || '0', 10),
      trend: parseInt(row.trend || '0', 10),
      line: row.polyline,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_active: row.is_active,
    };
  }

  mapEntityToRow(entity: Partial<WazeIrregularity>): Record<string, any> {
    const row: Record<string, any> = {};
    if (entity.uuid) row.uuid = entity.uuid;
    if (entity.polygon_id) row.polygon_id = entity.polygon_id;
    if (entity.type) row.type = entity.type;
    if (entity.detectionDate) row.detection_date = entity.detectionDate;
    if (entity.street) row.street = entity.street;
    if (entity.speed !== undefined) row.speed = entity.speed;
    if (entity.regularSpeed !== undefined) row.regular_speed = entity.regularSpeed;
    if (entity.delaySeconds !== undefined) row.delay_seconds = entity.delaySeconds;
    if (entity.severity !== undefined) row.severity = entity.severity;
    if (entity.jamLevel !== undefined) row.jam_level = entity.jamLevel;
    if (entity.trend !== undefined) row.trend = entity.trend;
    if (entity.line) row.polyline = entity.line;
    if (entity.is_active !== undefined) row.is_active = entity.is_active;

    return row;
  }

  async findActiveByPolygon(polygonId: string): Promise<WazeIrregularity[]> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName}
       WHERE polygon_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [polygonId]
    );
    return result.rows.map(row => this.mapRowToEntity(row));
  }

  async bulkUpsert(irregularities: WazeIrregularity[]): Promise<void> {
    if (irregularities.length === 0) return;

    const values: any[] = [];
    const placeholders: string[] = [];

    irregularities.forEach((irreg, index) => {
      const offset = index * 12;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4},
          $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8},
          $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`
      );

      values.push(
        irreg.uuid,
        irreg.polygon_id,
        irreg.type,
        irreg.detectionDate,
        irreg.street,
        irreg.speed,
        irreg.regularSpeed,
        irreg.delaySeconds,
        irreg.severity,
        irreg.jamLevel,
        irreg.trend,
        JSON.stringify(irreg.line)
      );
    });

    await this.query(
      `INSERT INTO ${this.tableName}
       (uuid, polygon_id, type, detection_date, street, speed, regular_speed,
        delay_seconds, severity, jam_level, trend, polyline)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (uuid) DO UPDATE SET
         severity = EXCLUDED.severity,
         jam_level = EXCLUDED.jam_level,
         trend = EXCLUDED.trend,
         updated_at = NOW(),
         is_active = true`,
      values
    );
  }
}
