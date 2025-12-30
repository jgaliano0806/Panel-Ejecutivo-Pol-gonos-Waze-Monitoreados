import { BaseRepository } from './BaseRepository';
import { Pool } from 'pg';

export interface WazeJam {
  uuid: string;
  polygon_id: string;
  level: number;
  speedKMH: number;
  delay: number;
  length: number;
  street: string;
  pubMillis: number;
  polyline: any; // JSONB
  blockingAlertUuid?: string;
  created_at?: Date;
  updated_at?: Date;
  is_active?: boolean;
}

export class WazeJamRepository extends BaseRepository<WazeJam> {
  readonly tableName = 'waze_jams';

  constructor(db: Pool) {
    super(db);
  }

  protected getIdColumn(): string {
    return 'uuid';
  }

  mapRowToEntity(row: any): WazeJam {
    return {
      uuid: row.uuid,
      polygon_id: row.polygon_id,
      level: row.level,
      speedKMH: parseFloat(row.speed_kmh || '0'),
      delay: parseInt(row.delay_seconds || '0', 10),
      length: parseFloat(row.length_meters || '0'),
      street: row.street,
      pubMillis: parseInt(row.pub_millis, 10),
      polyline: row.polyline,
      blockingAlertUuid: row.blocking_alert_uuid,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_active: row.is_active,
    };
  }

  mapEntityToRow(entity: Partial<WazeJam>): Record<string, any> {
    const row: Record<string, any> = {};
    if (entity.uuid) row.uuid = entity.uuid;
    if (entity.polygon_id) row.polygon_id = entity.polygon_id;
    if (entity.level !== undefined) row.level = entity.level;
    if (entity.speedKMH !== undefined) row.speed_kmh = entity.speedKMH;
    if (entity.delay !== undefined) row.delay_seconds = entity.delay;
    if (entity.length !== undefined) row.length_meters = entity.length;
    if (entity.street) row.street = entity.street;
    if (entity.pubMillis !== undefined) row.pub_millis = entity.pubMillis;
    if (entity.polyline) row.polyline = entity.polyline; // Assuming passing object/array suitable for pg driver
    if (entity.blockingAlertUuid) row.blocking_alert_uuid = entity.blockingAlertUuid;
    if (entity.is_active !== undefined) row.is_active = entity.is_active;

    return row;
  }

  async findActiveByPolygon(polygonId: string): Promise<WazeJam[]> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName}
       WHERE polygon_id = $1 AND is_active = true
       ORDER BY pub_millis DESC`,
      [polygonId]
    );
    return result.rows.map(row => this.mapRowToEntity(row));
  }

  async findAllActive(): Promise<WazeJam[]> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName}
       WHERE is_active = true`
    );
    return result.rows.map(row => this.mapRowToEntity(row));
  }

  async bulkUpsert(jams: WazeJam[]): Promise<void> {
    if (jams.length === 0) return;

    const values: any[] = [];
    const placeholders: string[] = [];

    jams.forEach((jam, index) => {
      const offset = index * 11;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4},
          $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8},
          $${offset + 9}, $${offset + 10}, $${offset + 11})`
      );

      values.push(
        jam.uuid,
        jam.polygon_id,
        jam.level,
        jam.polyline ? JSON.stringify(jam.polyline) : '[]', // Ensure JSON string and never null
        jam.speedKMH,
        jam.delay,
        jam.length,
        jam.street,
        jam.pubMillis,
        jam.blockingAlertUuid || null,
        true // is_active
      );
    });

    await this.query(
      `INSERT INTO ${this.tableName}
       (uuid, polygon_id, level, polyline, speed_kmh, delay_seconds, length_meters, street, pub_millis, blocking_alert_uuid, is_active)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (uuid) DO UPDATE SET
         updated_at = NOW(),
         is_active = true,
         level = EXCLUDED.level,
         speed_kmh = EXCLUDED.speed_kmh,
         delay_seconds = EXCLUDED.delay_seconds,
         length_meters = EXCLUDED.length_meters,
         blocking_alert_uuid = EXCLUDED.blocking_alert_uuid`,
      values
    );
  }
}
