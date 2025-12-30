import { Pool, QueryResult } from 'pg';

export interface IEntity {
  id?: string | number; // Allow number for older tables if any
  created_at?: Date;
  updated_at?: Date;
}

export abstract class BaseRepository<T extends IEntity> {
  constructor(protected db: Pool) {}

  abstract readonly tableName: string;
  abstract mapRowToEntity(row: any): T;
  abstract mapEntityToRow(entity: Partial<T>): Record<string, any>;

  async findById(id: string | number): Promise<T | null> {
    const result = await this.db.query(
      `SELECT * FROM ${this.tableName} WHERE ${this.getIdColumn()} = $1`,
      [id]
    );
    return result.rows[0] ? this.mapRowToEntity(result.rows[0]) : null;
  }

  async findAll(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
  }): Promise<T[]> {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    const orderBy = options?.orderBy || 'created_at';
    const orderDirection = options?.orderDirection || 'DESC';

    // Basic sanitization for orderBy to prevent simple injection
    const safeOrderBy = orderBy.replace(/[^a-zA-Z0-9_]/g, '');

    const result = await this.db.query(
      `SELECT * FROM ${this.tableName}
       ORDER BY ${safeOrderBy} ${orderDirection}
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows.map(row => this.mapRowToEntity(row));
  }

  async create(entity: Partial<T>): Promise<T> {
    const data = this.mapEntityToRow(entity);
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`);

    const result = await this.db.query(
      `INSERT INTO ${this.tableName} (${columns.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING *`,
      values
    );
    return this.mapRowToEntity(result.rows[0]);
  }

  async update(id: string | number, entity: Partial<T>): Promise<T | null> {
    const data = this.mapEntityToRow(entity);
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');

    // Only update updated_at if column exists (handled by SQL usually, but good practice to include in set if manual)
    // Here we rely on the migration trigger OR explicit SQL
    // Let's add explicit updated_at = NOW() if it's not in the entity data

    const result = await this.db.query(
      `UPDATE ${this.tableName}
       SET ${setClause}, updated_at = NOW()
       WHERE ${this.getIdColumn()} = $1
       RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] ? this.mapRowToEntity(result.rows[0]) : null;
  }

  async delete(id: string | number): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM ${this.tableName} WHERE ${this.getIdColumn()} = $1`,
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  async count(where?: Record<string, any>): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: any[] = [];

    if (where && Object.keys(where).length > 0) {
      const conditions = Object.keys(where).map((key, i) => `${key} = $${i + 1}`);
      query += ` WHERE ${conditions.join(' AND ')}`;
      params.push(...Object.values(where));
    }

    const result = await this.db.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  async exists(id: string | number): Promise<boolean> {
    const result = await this.db.query(
      `SELECT EXISTS(SELECT 1 FROM ${this.tableName} WHERE ${this.getIdColumn()} = $1) as exists`,
      [id]
    );
    return result.rows[0].exists;
  }

  protected async query(sql: string, params: any[] = []): Promise<QueryResult> {
    return await this.db.query(sql, params);
  }

  /**
   * Override this if the primary key column name is not 'id' (e.g., 'uuid')
   */
  protected getIdColumn(): string {
    return 'id';
  }
}
