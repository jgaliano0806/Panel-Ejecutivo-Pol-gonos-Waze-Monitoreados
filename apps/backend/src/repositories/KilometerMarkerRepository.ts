import { BaseRepository, IEntity } from "./BaseRepository";

export interface KilometerMarker extends IEntity {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  route_name?: string | null;
  polygon_group_id?: number | null;
  group_name?: string | null;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class KilometerMarkerRepository extends BaseRepository<KilometerMarker> {
  readonly tableName = "kilometer_markers";

  mapRowToEntity(row: any): KilometerMarker {
    return {
      id: row.id,
      name: row.name,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      route_name: row.route_name || null,
      polygon_group_id: row.polygon_group_id || null,
      group_name: row.group_name || null,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  mapEntityToRow(entity: Partial<KilometerMarker>): Record<string, any> {
    const row: Record<string, any> = {};
    if (entity.name !== undefined) row.name = entity.name;
    if (entity.latitude !== undefined) row.latitude = entity.latitude;
    if (entity.longitude !== undefined) row.longitude = entity.longitude;
    if (entity.route_name !== undefined) row.route_name = entity.route_name;
    if (entity.polygon_group_id !== undefined)
      row.polygon_group_id = entity.polygon_group_id;
    if (entity.is_active !== undefined) row.is_active = entity.is_active;
    return row;
  }

  /**
   * Obtener todos los marcadores activos (sin límite, para el mapa)
   */
  async findAllActive(): Promise<KilometerMarker[]> {
    const result = await this.query(
      `SELECT km.*, pg.name as group_name
       FROM ${this.tableName} km
       LEFT JOIN polygon_groups pg ON km.polygon_group_id = pg.id
       WHERE km.is_active = true
       ORDER BY km.name ASC`,
    );
    return result.rows.map((row) => this.mapRowToEntity(row));
  }

  /**
   * Búsqueda por nombre (ILIKE)
   */
  async search(term: string): Promise<KilometerMarker[]> {
    const result = await this.query(
      `SELECT km.*, pg.name as group_name
       FROM ${this.tableName} km
       LEFT JOIN polygon_groups pg ON km.polygon_group_id = pg.id
       WHERE km.name ILIKE $1 OR pg.name ILIKE $1
       ORDER BY km.name ASC LIMIT 100`,
      [`%${term}%`],
    );
    return result.rows.map((row) => this.mapRowToEntity(row));
  }

  /**
   * Obtener marcadores por grupo de polígonos
   */
  async findByGroup(groupId: number): Promise<KilometerMarker[]> {
    const result = await this.query(
      `SELECT km.*, pg.name as group_name
       FROM ${this.tableName} km
       LEFT JOIN polygon_groups pg ON km.polygon_group_id = pg.id
       WHERE km.polygon_group_id = $1
       ORDER BY km.name ASC`,
      [groupId],
    );
    return result.rows.map((row) => this.mapRowToEntity(row));
  }

  /**
   * Contar activos vs total
   */
  async countByStatus(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const result = await this.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE is_active = false) as inactive
       FROM ${this.tableName}`,
    );
    const row = result.rows[0];
    return {
      total: parseInt(row.total, 10),
      active: parseInt(row.active, 10),
      inactive: parseInt(row.inactive, 10),
    };
  }
}
