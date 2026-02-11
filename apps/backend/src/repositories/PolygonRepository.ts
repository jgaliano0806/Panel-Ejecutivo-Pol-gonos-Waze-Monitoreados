import { BaseRepository } from './BaseRepository';
import { Pool } from 'pg';
import { REAL_POLYGONS, RealPolygonConfig } from '../config/realPolygons';

// Adapter to make Config look like a Repository
// We extend BaseRepository to conform to the factory type, but we override everything.
export class PolygonRepository extends BaseRepository<RealPolygonConfig & { created_at?: Date; updated_at?: Date }> {
  readonly tableName = 'config_polygons';

  constructor(db: Pool) {
    super(db);
  }

  mapRowToEntity(row: any): RealPolygonConfig & { is_active?: boolean } {
    return {
      id: row.id,
      name: row.name,
      group: row.group,
      feedUrl: row.feed_url,
      tvtFeedUrl: row.tvt_feed_url,
      coordinates: row.coordinates,
      geometry: row.geometry,
      is_active: row.is_active ?? true,
    };
  }

  mapEntityToRow(entity: Partial<RealPolygonConfig>): Record<string, any> {
    const row: any = {};
    if (entity.id) row.id = entity.id;
    if (entity.name) row.name = entity.name;
    if (entity.group !== undefined) row['"group"'] = entity.group;
    if (entity.feedUrl) row.feed_url = entity.feedUrl;
    if (entity.tvtFeedUrl !== undefined) row.tvt_feed_url = entity.tvtFeedUrl;
    if (entity.coordinates) row.coordinates = JSON.stringify(entity.coordinates);
    if (entity.geometry) row.geometry = JSON.stringify(entity.geometry);
    return row;
  }

  async findById(id: string): Promise<RealPolygonConfig | null> {
    const result = await this.query(`SELECT * FROM ${this.tableName} WHERE id = $1 AND is_active = true`, [id]);
    return result.rows.length ? this.mapRowToEntity(result.rows[0]) : null;
  }

  async findAll(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
  }): Promise<RealPolygonConfig[]> {
    const orderBy = options?.orderBy || 'id';
    const orderDir = options?.orderDirection || 'ASC';

    // We filter by is_active = true by default for config
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE is_active = true
      ORDER BY ${orderBy} ${orderDir}
      ${options?.limit ? `LIMIT ${options.limit}` : ''}
      ${options?.offset ? `OFFSET ${options.offset}` : ''}
    `;

    const result = await this.query(query);
    return result.rows.map(row => this.mapRowToEntity(row));
  }

  async create(entity: Partial<RealPolygonConfig>): Promise<RealPolygonConfig> {
    const row = this.mapEntityToRow(entity);
    const columns = Object.keys(row);
    const values = Object.values(row);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.query(query, values);
    return this.mapRowToEntity(result.rows[0]);
  }

  async update(id: string, entity: Partial<RealPolygonConfig>): Promise<RealPolygonConfig | null> {
    const row = this.mapEntityToRow(entity);
    delete row.id; // Cannot update ID

    const columns = Object.keys(row);
    const values = Object.values(row);
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${columns.length + 1}
      RETURNING *
    `;

    const result = await this.query(query, [...values, id]);
    return result.rows.length ? this.mapRowToEntity(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    // Soft delete
    const result = await this.query(`UPDATE ${this.tableName} SET is_active = false, updated_at = NOW() WHERE id = $1`, [id]);
    return (result.rowCount || 0) > 0;
  }
}
