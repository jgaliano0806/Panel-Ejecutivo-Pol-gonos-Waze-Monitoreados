import { BaseRepository, IEntity } from "./BaseRepository";

export interface KilometerMarker extends IEntity {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  route_name?: string | null;
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
    if (entity.is_active !== undefined) row.is_active = entity.is_active;
    return row;
  }

  /**
   * Obtener todos los marcadores activos (sin límite, para el mapa)
   */
  async findAllActive(): Promise<KilometerMarker[]> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE is_active = true ORDER BY name ASC`,
    );
    return result.rows.map((row) => this.mapRowToEntity(row));
  }

  /**
   * Búsqueda por nombre (ILIKE)
   */
  async search(term: string): Promise<KilometerMarker[]> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE name ILIKE $1 ORDER BY name ASC LIMIT 100`,
      [`%${term}%`],
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
