import { BaseRepository, IEntity } from "./BaseRepository";
import { Pool } from "pg";
import { DangerZone } from "@panel-waze/types";

interface DangerZoneEntity extends IEntity {
  id: string;
  name: string;
  description?: string;
  geometry: any;
  severity: string;
  protocol: string;
  color: string;
  is_active: boolean;
  created_by?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class DangerZoneRepository extends BaseRepository<DangerZoneEntity> {
  readonly tableName = "danger_zones";

  constructor(db: Pool) {
    super(db);
  }

  mapRowToEntity(row: any): DangerZoneEntity {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      geometry: typeof row.geometry === "string" ? JSON.parse(row.geometry) : row.geometry,
      severity: row.severity,
      protocol: row.protocol || "",
      color: row.color || "#ef4444",
      is_active: row.is_active,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  mapEntityToRow(entity: Partial<DangerZoneEntity>): Record<string, any> {
    const row: Record<string, any> = {};
    if (entity.name !== undefined) row.name = entity.name;
    if (entity.description !== undefined) row.description = entity.description;
    if (entity.geometry !== undefined)
      row.geometry = JSON.stringify(entity.geometry);
    if (entity.severity !== undefined) row.severity = entity.severity;
    if (entity.protocol !== undefined) row.protocol = entity.protocol;
    if (entity.color !== undefined) row.color = entity.color;
    if (entity.is_active !== undefined) row.is_active = entity.is_active;
    if (entity.created_by !== undefined) row.created_by = entity.created_by;
    return row;
  }

  async findActive(): Promise<DangerZone[]> {
    const result = await this.db.query(
      `SELECT * FROM ${this.tableName} WHERE is_active = true ORDER BY created_at DESC`,
    );
    return result.rows.map((row) => this.mapRowToEntity(row) as unknown as DangerZone);
  }

  async findAllZones(): Promise<DangerZone[]> {
    const result = await this.db.query(
      `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`,
    );
    return result.rows.map((row) => this.mapRowToEntity(row) as unknown as DangerZone);
  }

  async deactivate(id: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE ${this.tableName} SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
