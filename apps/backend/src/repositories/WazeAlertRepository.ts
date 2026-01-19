import { BaseRepository } from "./BaseRepository";
import { Pool } from "pg";

// Define Interface locally or import from types if available.
// Based on user prompt providing explicit types:

export interface WazeAlert {
  uuid: string;
  polygon_id: string;
  type: string;
  subtype: string;
  location: {
    x: number;
    y: number;
  };
  street?: string;
  city?: string;
  country?: string;
  pubMillis: number;
  reliability: number;
  confidence: number;
  reportDescription?: string;
  nThumbsUp?: number;
  reportRating?: number;
  reportBy?: string;
  magvar?: number;
  created_at?: Date;
  updated_at?: Date;
  is_active?: boolean;
}

export class WazeAlertRepository extends BaseRepository<WazeAlert> {
  readonly tableName = "waze_alerts";

  constructor(db: Pool) {
    super(db);
  }

  protected getIdColumn(): string {
    return "uuid"; // Override ID column
  }

  mapRowToEntity(row: any): WazeAlert {
    return {
      uuid: row.uuid,
      polygon_id: row.polygon_id,
      type: row.type,
      subtype: row.subtype,
      location: {
        x: parseFloat(row.longitude), // Note: Check if data type is numeric or string in DB, parseFloat is safe
        y: parseFloat(row.latitude),
      },
      street: row.street,
      city: row.city,
      country: row.country,
      pubMillis: parseInt(row.pub_millis, 10),
      reliability: parseFloat(row.reliability),
      confidence: parseFloat(row.confidence),
      reportDescription: row.report_description,
      nThumbsUp:
        row.n_thumbs_up !== null ? parseInt(row.n_thumbs_up, 10) : undefined,
      reportRating:
        row.report_rating !== null
          ? parseInt(row.report_rating, 10)
          : undefined,
      reportBy: row.report_by || undefined,
      magvar: row.magvar !== null ? parseInt(row.magvar, 10) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_active: row.is_active,
    };
  }

  mapEntityToRow(entity: Partial<WazeAlert>): Record<string, any> {
    const row: Record<string, any> = {};
    if (entity.uuid) row.uuid = entity.uuid;
    if (entity.polygon_id) row.polygon_id = entity.polygon_id;
    if (entity.type) row.type = entity.type;
    if (entity.subtype) row.subtype = entity.subtype;
    if (entity.location) {
      row.latitude = entity.location.y;
      row.longitude = entity.location.x;
    }
    if (entity.street) row.street = entity.street;
    if (entity.city) row.city = entity.city;
    if (entity.country) row.country = entity.country;
    if (entity.pubMillis !== undefined) row.pub_millis = entity.pubMillis;
    if (entity.reliability !== undefined) row.reliability = entity.reliability;
    if (entity.confidence !== undefined) row.confidence = entity.confidence;
    if (entity.reportDescription)
      row.report_description = entity.reportDescription;
    if (entity.nThumbsUp !== undefined) row.n_thumbs_up = entity.nThumbsUp;
    if (entity.reportRating !== undefined)
      row.report_rating = entity.reportRating;
    if (entity.reportBy) row.report_by = entity.reportBy;
    if (entity.magvar !== undefined) row.magvar = entity.magvar;
    if (entity.is_active !== undefined) row.is_active = entity.is_active;

    return row;
  }

  // ═══════════════════════════════════════════════════════════
  // Queries específicas de Waze Alerts
  // ═══════════════════════════════════════════════════════════

  async findActiveByPolygon(polygonId: string): Promise<WazeAlert[]> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE polygon_id = $1 AND is_active IS NOT FALSE`,
      [polygonId]
    );
    return result.rows.map((row) => this.mapRowToEntity(row));
  }

  async findAllActive(): Promise<WazeAlert[]> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE is_active IS NOT FALSE`
    );
    return result.rows.map((row) => this.mapRowToEntity(row));
  }

  async findByType(type: string, limit = 100): Promise<WazeAlert[]> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName}
       WHERE type = $1 AND is_active IS NOT FALSE
       ORDER BY pub_millis DESC
       LIMIT $2`,
      [type, limit]
    );
    return result.rows.map((row) => this.mapRowToEntity(row));
  }

  async markInactive(olderThan: Date): Promise<number> {
    const result = await this.query(
      `UPDATE ${this.tableName}
       SET is_active = false
       WHERE updated_at < $1 AND is_active = true`,
      [olderThan]
    );
    return result.rowCount || 0;
  }

  async bulkUpsert(alerts: WazeAlert[]): Promise<void> {
    if (alerts.length === 0) return;

    // Use a transaction ideally, but for raw bulk insert we construct the query carefully
    // Using UNNEST is often cleaner for bulk inserts in Postgres than massive VALUES clauses,
    // but the array handling can be tricky with node-pg types.
    // We will stick to the multi-value insert as requested in the guide but optimize batch size if needed.

    // For simplicity and preventing parameter limit issues (65535 params), we should batch if huge.
    // Assuming reasonable batch sizes here.

    const values: any[] = [];
    const placeholders: string[] = [];

    alerts.forEach((alert, index) => {
      const offset = index * 17; // 17 columns being inserted
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4},
          $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8},
          $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12},
          $${offset + 13}, $${offset + 14}, $${offset + 15}, $${
          offset + 16
        }, $${offset + 17})`
      );

      values.push(
        alert.uuid,
        alert.polygon_id,
        alert.type,
        alert.subtype,
        alert.location.y,
        alert.location.x,
        alert.street,
        alert.city,
        alert.country,
        alert.pubMillis,
        alert.reliability,
        alert.confidence,
        alert.reportDescription || null,
        alert.nThumbsUp || 0,
        alert.reportRating || 0,
        alert.reportBy || null,
        alert.magvar || null
      );
    });

    await this.query(
      `INSERT INTO ${this.tableName}
       (uuid, polygon_id, type, subtype, latitude, longitude, street, city,
        country, pub_millis, reliability, confidence, report_description, n_thumbs_up, report_rating, report_by, magvar)
       VALUES ${placeholders.join(", ")}
       ON CONFLICT (uuid) DO UPDATE SET
         updated_at = NOW(),
         is_active = true,
         reliability = EXCLUDED.reliability,
         confidence = EXCLUDED.confidence,
         n_thumbs_up = EXCLUDED.n_thumbs_up,
         report_rating = EXCLUDED.report_rating,
         report_by = EXCLUDED.report_by,
         magvar = EXCLUDED.magvar`,
      values
    );
  }

  async getStatsByPolygon(polygonId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    avgConfidence: number;
  }> {
    const result = await this.query(
      `SELECT
         COUNT(*) as total,
         type,
         AVG(confidence) as avg_confidence
       FROM ${this.tableName}
       WHERE polygon_id = $1 AND is_active = true
       GROUP BY type`,
      [polygonId]
    );

    const byType: Record<string, number> = {};
    let totalCount = 0;
    let totalConfidence = 0;

    result.rows.forEach((row) => {
      const count = parseInt(row.total, 10);
      byType[row.type] = count;
      totalCount += count;
      totalConfidence += parseFloat(row.avg_confidence) * count; // rough weighted avg
    });

    return {
      total: totalCount,
      byType,
      avgConfidence: totalCount > 0 ? totalConfidence / totalCount : 0,
    };
  }
}
