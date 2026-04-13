import { BaseRepository, IEntity } from "./BaseRepository";
import { Pool } from "pg";

export interface ZonaPeligrosaRow extends IEntity {
  id: string;
  nombre: string;
  geometria: GeoJSON.Polygon;
  nivel_severidad: number;
  protocolo_accion: string;
  fecha_creacion?: Date;
  activa: boolean;
}

export class ZonaPeligrosaRepository extends BaseRepository<ZonaPeligrosaRow> {
  readonly tableName = "zonas_peligrosas";

  constructor(db: Pool) {
    super(db);
  }

  mapRowToEntity(row: any): ZonaPeligrosaRow {
    const g =
      typeof row.geometria === "string"
        ? JSON.parse(row.geometria)
        : row.geometria;
    return {
      id: row.id,
      nombre: row.nombre,
      geometria: g,
      nivel_severidad: row.nivel_severidad,
      protocolo_accion: row.protocolo_accion || "",
      fecha_creacion: row.fecha_creacion,
      activa: row.activa,
    };
  }

  mapEntityToRow(entity: Partial<ZonaPeligrosaRow>): Record<string, any> {
    const row: Record<string, any> = {};
    if (entity.nombre !== undefined) row.nombre = entity.nombre;
    if (entity.geometria !== undefined)
      row.geometria = JSON.stringify(entity.geometria);
    if (entity.nivel_severidad !== undefined)
      row.nivel_severidad = entity.nivel_severidad;
    if (entity.protocolo_accion !== undefined)
      row.protocolo_accion = entity.protocolo_accion;
    if (entity.activa !== undefined) row.activa = entity.activa;
    return row;
  }

  async findActive(): Promise<ZonaPeligrosaRow[]> {
    const result = await this.db.query(
      `SELECT * FROM ${this.tableName} WHERE activa = true ORDER BY fecha_creacion DESC`,
    );
    return result.rows.map((r) => this.mapRowToEntity(r));
  }

  async findAll(): Promise<ZonaPeligrosaRow[]> {
    const result = await this.db.query(
      `SELECT * FROM ${this.tableName} ORDER BY fecha_creacion DESC`,
    );
    return result.rows.map((r) => this.mapRowToEntity(r));
  }
}
