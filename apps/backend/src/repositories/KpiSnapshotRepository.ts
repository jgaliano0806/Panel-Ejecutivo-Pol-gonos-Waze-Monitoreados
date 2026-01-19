import { BaseRepository, IEntity } from "./BaseRepository";

export interface KpiSnapshotEntity extends IEntity {
  fluidity_percentage: number;
  active_incidents: number;
  active_jams: number;
  timestamp: Date;
}

export class KpiSnapshotRepository extends BaseRepository<KpiSnapshotEntity> {
  readonly tableName = "kpi_snapshots";

  mapRowToEntity(row: any): KpiSnapshotEntity {
    return {
      id: row.id,
      fluidity_percentage: row.fluidity_percentage,
      active_incidents: row.active_incidents,
      active_jams: row.active_jams,
      timestamp: row.timestamp,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  mapEntityToRow(entity: Partial<KpiSnapshotEntity>): Record<string, any> {
    const row: any = {};
    if (entity.fluidity_percentage !== undefined)
      row.fluidity_percentage = entity.fluidity_percentage;
    if (entity.active_incidents !== undefined)
      row.active_incidents = entity.active_incidents;
    if (entity.active_jams !== undefined) row.active_jams = entity.active_jams;
    if (entity.timestamp !== undefined) row.timestamp = entity.timestamp;
    return row;
  }

  /**
   * Find the closest snapshot to a target date
   */
  async findClosestTo(date: Date): Promise<KpiSnapshotEntity | null> {
    const result = await this.db.query(
      `SELECT * FROM ${this.tableName}
       ORDER BY ABS(EXTRACT(EPOCH FROM timestamp) - EXTRACT(EPOCH FROM $1::timestamptz)) ASC
       LIMIT 1`,
      [date]
    );
    return result.rows[0] ? this.mapRowToEntity(result.rows[0]) : null;
  }

  /**
   * Find the most recent snapshot
   */
  async findLatest(): Promise<KpiSnapshotEntity | null> {
    const result = await this.db.query(
      `SELECT * FROM ${this.tableName} ORDER BY timestamp DESC LIMIT 1`
    );
    return result.rows[0] ? this.mapRowToEntity(result.rows[0]) : null;
  }
}
