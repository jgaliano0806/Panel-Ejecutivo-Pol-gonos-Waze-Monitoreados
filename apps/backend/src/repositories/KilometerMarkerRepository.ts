import { BaseRepository, IEntity } from "./BaseRepository";

export interface KilometerMarker extends IEntity {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  route_name?: string | null;
  polygon_group_id?: number | null;
  polygon_id?: string | null;
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
      polygon_id: row.polygon_id || null,
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
    if (entity.polygon_id !== undefined) row.polygon_id = entity.polygon_id;
    if (entity.is_active !== undefined) row.is_active = entity.is_active;
    return row;
  }

  /**
   * Obtener todos los marcadores activos (sin límite, para el mapa)
   * Usa LEFT JOIN con polygon_groups si existe; fallback a query simple si falla.
   */
  async findAllActive(): Promise<KilometerMarker[]> {
    try {
      const result = await this.query(
        `SELECT km.*, pg.name as group_name
         FROM ${this.tableName} km
         LEFT JOIN polygon_groups pg ON km.polygon_group_id = pg.id
         WHERE km.is_active = true
         ORDER BY km.name ASC`,
      );
      return result.rows.map((row) => this.mapRowToEntity(row));
    } catch (err: any) {
      // Fallback si polygon_groups no existe (migraciones incompletas)
      if (err?.code === "42P01" || err?.message?.includes("polygon_groups")) {
        const result = await this.query(
          `SELECT * FROM ${this.tableName} WHERE is_active = true ORDER BY name ASC`,
        );
        return result.rows.map((row) => this.mapRowToEntity(row));
      }
      throw err;
    }
  }

  /**
   * Búsqueda por nombre (ILIKE)
   */
  async search(term: string): Promise<KilometerMarker[]> {
    try {
      const result = await this.query(
        `SELECT km.*, pg.name as group_name
         FROM ${this.tableName} km
         LEFT JOIN polygon_groups pg ON km.polygon_group_id = pg.id
         WHERE km.name ILIKE $1 OR pg.name ILIKE $1
         ORDER BY km.name ASC LIMIT 100`,
        [`%${term}%`],
      );
      return result.rows.map((row) => this.mapRowToEntity(row));
    } catch (err: any) {
      if (err?.code === "42P01" || err?.message?.includes("polygon_groups")) {
        const result = await this.query(
          `SELECT * FROM ${this.tableName} WHERE name ILIKE $1 AND is_active = true ORDER BY name ASC LIMIT 100`,
          [`%${term}%`],
        );
        return result.rows.map((row) => this.mapRowToEntity(row));
      }
      throw err;
    }
  }

  /**
   * Obtener marcadores por grupo de polígonos
   */
  async findByGroup(groupId: number): Promise<KilometerMarker[]> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE polygon_group_id = $1 ORDER BY name ASC`,
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

  /** Rutas distintas para filtro en admin */
  async findDistinctRoutes(): Promise<string[]> {
    const result = await this.query(
      `SELECT DISTINCT route_name
       FROM ${this.tableName}
       WHERE route_name IS NOT NULL AND TRIM(route_name) <> ''
       ORDER BY route_name ASC`,
    );
    return result.rows.map((row) => row.route_name as string);
  }

  /**
   * Listado paginado con filtros (admin)
   */
  async findPaginated(options: {
    search?: string;
    route_name?: string;
    active?: "all" | "active" | "inactive";
    group_id?: number;
    limit: number;
    offset: number;
  }): Promise<{ data: KilometerMarker[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (options.search?.trim()) {
      conditions.push(
        `(km.name ILIKE $${paramIdx} OR km.route_name ILIKE $${paramIdx} OR pg.name ILIKE $${paramIdx})`,
      );
      params.push(`%${options.search.trim()}%`);
      paramIdx++;
    }

    if (options.route_name) {
      conditions.push(`km.route_name = $${paramIdx}`);
      params.push(options.route_name);
      paramIdx++;
    }

    if (options.active === "active") {
      conditions.push("km.is_active = true");
    } else if (options.active === "inactive") {
      conditions.push("km.is_active = false");
    }

    if (options.group_id != null) {
      conditions.push(`km.polygon_group_id = $${paramIdx}`);
      params.push(options.group_id);
      paramIdx++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const fromClause = `FROM ${this.tableName} km
         LEFT JOIN polygon_groups pg ON km.polygon_group_id = pg.id`;

    try {
      const countResult = await this.query(
        `SELECT COUNT(*) AS total ${fromClause} ${whereClause}`,
        params,
      );
      const total = parseInt(countResult.rows[0]?.total ?? "0", 10);

      const dataResult = await this.query(
        `SELECT km.*, pg.name AS group_name
         ${fromClause}
         ${whereClause}
         ORDER BY km.name ASC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, options.limit, options.offset],
      );

      return {
        data: dataResult.rows.map((row) => this.mapRowToEntity(row)),
        total,
      };
    } catch (err: unknown) {
      const pgErr = err as { code?: string; message?: string };
      if (
        pgErr?.code === "42P01" ||
        pgErr?.message?.includes("polygon_groups")
      ) {
        const fallbackConditions: string[] = [];
        const fallbackParams: unknown[] = [];
        let idx = 1;

        if (options.search?.trim()) {
          fallbackConditions.push(
            `(name ILIKE $${idx} OR route_name ILIKE $${idx})`,
          );
          fallbackParams.push(`%${options.search.trim()}%`);
          idx++;
        }
        if (options.route_name) {
          fallbackConditions.push(`route_name = $${idx}`);
          fallbackParams.push(options.route_name);
          idx++;
        }
        if (options.active === "active") {
          fallbackConditions.push("is_active = true");
        } else if (options.active === "inactive") {
          fallbackConditions.push("is_active = false");
        }
        if (options.group_id != null) {
          fallbackConditions.push(`polygon_group_id = $${idx}`);
          fallbackParams.push(options.group_id);
          idx++;
        }

        const fallbackWhere =
          fallbackConditions.length > 0
            ? `WHERE ${fallbackConditions.join(" AND ")}`
            : "";

        const countResult = await this.query(
          `SELECT COUNT(*) AS total FROM ${this.tableName} ${fallbackWhere}`,
          fallbackParams,
        );
        const total = parseInt(countResult.rows[0]?.total ?? "0", 10);

        const dataResult = await this.query(
          `SELECT * FROM ${this.tableName}
           ${fallbackWhere}
           ORDER BY name ASC
           LIMIT $${idx} OFFSET $${idx + 1}`,
          [...fallbackParams, options.limit, options.offset],
        );

        return {
          data: dataResult.rows.map((row) => this.mapRowToEntity(row)),
          total,
        };
      }
      throw err;
    }
  }
}
