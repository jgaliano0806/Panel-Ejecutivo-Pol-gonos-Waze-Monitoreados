import { dbService } from "../database/dbService";
import { v4 as uuidv4 } from "uuid";
import { LocalStorageProvider } from "./storage/localStorageProvider";
import { IStorageProvider } from "./storage/storageProvider";

export interface RoadAccident {
  id?: string;
  incident_id?: string;
  waze_data: any;
  weather_data: any;
  type?: string;
  subtype?: string;
  severity?: number;
  street?: string;
  location_lat: number;
  location_lng: number;
  operator_notes?: string;
  accident_at?: Date;
  created_at?: Date;
  updated_at?: Date;
  status?: "active" | "inactive";
  polygon_id?: string;
  media?: AccidentMedia[];
}

export interface AccidentMedia {
  id?: string;
  accident_id: string;
  file_path: string;
  file_type: "image" | "video";
  original_name?: string;
  file_size_bytes?: number;
  created_at?: Date;
}

export class RoadAccidentService {
  private static instance: RoadAccidentService;
  private storage: IStorageProvider;

  private constructor() {
    // Inicializar con proveedor local, fácil de cambiar a BlobStorage en el futuro
    this.storage = new LocalStorageProvider();
  }

  public static getInstance(): RoadAccidentService {
    if (!RoadAccidentService.instance) {
      RoadAccidentService.instance = new RoadAccidentService();
    }
    return RoadAccidentService.instance;
  }

  /**
   * Sube un archivo usando el proveedor de almacenamiento configurado
   */
  async uploadMediaFile(
    fileName: string,
    content: Buffer | NodeJS.ReadableStream,
  ): Promise<string> {
    return this.storage.uploadFile(fileName, content);
  }

  /**
   * Crea un nuevo registro de siniestro vial
   */
  async createAccident(data: RoadAccident): Promise<RoadAccident> {
    const query = `
            INSERT INTO road_accidents (
                incident_id, waze_data, weather_data, type, subtype,
                severity, street, location_lat, location_lng,
                operator_notes, accident_at, status, polygon_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `;

    const values = [
      data.incident_id || null,
      JSON.stringify(data.waze_data || {}),
      JSON.stringify(data.weather_data || {}),
      data.type || "ACCIDENT",
      data.subtype || null,
      data.severity || null,
      data.street || null,
      data.location_lat,
      data.location_lng,
      data.operator_notes || null,
      data.accident_at || new Date(),
      data.status || "active", // Por defecto activo
      data.polygon_id || null,
    ];

    try {
      const result = await dbService.query(query, values);
      return result.rows[0] as RoadAccident;
    } catch (error) {
      console.error("Error en createAccident:", error);
      if (error instanceof Error && error.message.includes("does not exist")) {
        console.error(
          "❌ La tabla road_accidents no existe. Ejecutar: npx ts-node scripts/create-accidents-table.ts",
        );
        throw new Error(
          "La tabla road_accidents no existe. Ejecutar la migración 003_road_accidents_multimedia.sql",
        );
      }
      throw error;
    }
  }

  /**
   * Obtiene una lista de siniestros viales con filtros
   */
  async getAccidents(
    filters: {
      from?: Date;
      to?: Date;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<RoadAccident[]> {
    let query = `
            SELECT a.id,
                   a.incident_id,
                   a.waze_data,
                   a.weather_data,
                   a.type,
                   a.subtype,
                   a.severity,
                   a.street,
                   a.location_lat,
                   a.location_lng,
                   a.operator_notes,
                   a.accident_at,
                   a.created_at,
                   a.updated_at,
                   a.polygon_id,
                   COALESCE(json_agg(m.*) FILTER (WHERE m.id IS NOT NULL), '[]') as media
            FROM road_accidents a
            LEFT JOIN accident_media m ON a.id = m.accident_id
            WHERE 1=1
            AND a.type = 'ACCIDENT'
            AND (a.subtype IS NULL OR a.subtype NOT LIKE 'HAZARD%')
        `;
    const params: any[] = [];
    let pIndex = 1;

    if (filters.from) {
      query += ` AND a.accident_at >= $${pIndex++}`;
      params.push(filters.from);
    }
    if (filters.to) {
      query += ` AND a.accident_at <= $${pIndex++}`;
      params.push(filters.to);
    }

    query += ` GROUP BY a.id, a.incident_id, a.waze_data, a.weather_data, a.type, a.subtype, a.severity, a.street, a.location_lat, a.location_lng, a.operator_notes, a.accident_at, a.created_at, a.updated_at, a.polygon_id ORDER BY a.accident_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${pIndex++}`;
      params.push(filters.limit);
    }
    if (filters.offset) {
      query += ` OFFSET $${pIndex++}`;
      params.push(filters.offset);
    }

    try {
      const result = await dbService.query(query, params);
      return result.rows as RoadAccident[];
    } catch (error) {
      console.error("Error en getAccidents:", error);
      // Si la tabla no existe, retornar array vacío
      if (error instanceof Error && error.message.includes("does not exist")) {
        console.warn(
          "Tabla road_accidents no existe. Ejecutar migración 003_road_accidents_multimedia.sql",
        );
        return [];
      }
      throw error;
    }
  }

  /**
   * Obtiene un siniestro específico por ID
   */
  async getAccidentById(id: string): Promise<RoadAccident | null> {
    const query = `
            SELECT a.id,
                   a.incident_id,
                   a.waze_data,
                   a.weather_data,
                   a.type,
                   a.subtype,
                   a.severity,
                   a.street,
                   a.location_lat,
                   a.location_lng,
                   a.operator_notes,
                   a.accident_at,
                   a.created_at,
                   a.updated_at,
                   a.polygon_id,
                   COALESCE(json_agg(m.*) FILTER (WHERE m.id IS NOT NULL), '[]') as media
            FROM road_accidents a
            LEFT JOIN accident_media m ON a.id = m.accident_id
            WHERE a.id = $1
            GROUP BY a.id, a.incident_id, a.waze_data, a.weather_data, a.type, a.subtype, a.severity, a.street, a.location_lat, a.location_lng, a.operator_notes, a.accident_at, a.created_at, a.updated_at, a.polygon_id
        `;
    try {
      const result = await dbService.query(query, [id]);
      return (result.rows[0] as RoadAccident) || null;
    } catch (error) {
      console.error("Error en getAccidentById:", error);
      if (error instanceof Error && error.message.includes("does not exist")) {
        console.warn(
          "Tabla road_accidents no existe. Ejecutar migración 003_road_accidents_multimedia.sql",
        );
        return null;
      }
      throw error;
    }
  }

  /**
   * Registra un nuevo archivo multimedia para un accidente
   */
  async addMedia(media: AccidentMedia): Promise<AccidentMedia> {
    const query = `
            INSERT INTO accident_media (
                accident_id, file_path, file_type,
                original_name, file_size_bytes
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

    const values = [
      media.accident_id,
      media.file_path,
      media.file_type,
      media.original_name || null,
      media.file_size_bytes || null,
    ];

    const result = await dbService.query(query, values);
    return result.rows[0] as AccidentMedia;
  }

  /**
   * Actualiza las notas u otros datos de un accidente
   */
  async updateAccident(
    id: string,
    updates: Partial<RoadAccident>,
  ): Promise<RoadAccident | null> {
    const allowedUpdates = ["operator_notes", "type", "subtype", "severity"];
    const keys = Object.keys(updates).filter((k) => allowedUpdates.includes(k));

    if (keys.length === 0) return this.getAccidentById(id);

    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    const query = `UPDATE road_accidents SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;
    const values = [id, ...keys.map((k) => (updates as any)[k])];

    const result = await dbService.query(query, values);
    return (result.rows[0] as RoadAccident) || null;
  }

  /**
   * Elimina un accidente y sus registros de media, incluyendo archivos físicos
   */
  async deleteAccident(id: string): Promise<boolean> {
    // 1. Obtener lista de archivos asociados
    const mediaQuery = `SELECT file_path FROM accident_media WHERE accident_id = $1`;
    const mediaResult = await dbService.query(mediaQuery, [id]);
    const mediaFiles = mediaResult.rows;

    // 2. Eliminar de la base de datos
    // El cascade en el schema borra los registros de accident_media automáticamente.
    const deleteQuery = `DELETE FROM road_accidents WHERE id = $1`;
    const result = await dbService.query(deleteQuery, [id]);

    if ((result.rowCount ?? 0) > 0) {
      // 3. Eliminar archivos físicos a través del proveedor de almacenamiento
      for (const media of mediaFiles) {
        try {
          await this.storage.deleteFile(media.file_path);
        } catch (err) {
          console.error("Error eliminando archivo físico:", err);
        }
      }
      return true;
    }

    return false;
  }

  /**
   * Obtiene estadísticas de conteo de siniestros ACTIVOS en la RAC para KPIs del Dashboard
   * Solo cuenta accidentes con status='active' en polígonos de la Red de Accesos Córdoba
   */
  async getAccidentsCount(): Promise<{
    total: number;
    critical: number;
    high: number;
  }> {
    try {
      // Grupos de la RAC (Red de Accesos Córdoba)
      const RAC_GROUPS = [
        "Autovía A-019",
        "Área Capital",
        "Ruta Nacional 9",
        "Ruta Nacional 19",
        "Ruta Nacional 36",
      ];

      // Obtener IDs de polígonos RAC desde la base de datos
      const polygonQuery = `
                SELECT id FROM config_polygons
                WHERE "group" = ANY($1)
            `;
      const polygonResult = await dbService.query(polygonQuery, [RAC_GROUPS]);
      const racPolygonIds = polygonResult.rows.map((row: any) => row.id);

      if (racPolygonIds.length === 0) {
        // No hay polígonos RAC configurados
        return { total: 0, critical: 0, high: 0 };
      }

      // Contar solo accidentes ACTIVOS en polígonos de la RAC
      const query = `
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE severity >= 4) as critical,
                    COUNT(*) FILTER (WHERE severity >= 3) as high
                FROM road_accidents
                WHERE status = 'active'
                AND polygon_id = ANY($1)
            `;
      const result = await dbService.query(query, [racPolygonIds]);

      if (result.rows.length > 0) {
        return {
          total: parseInt(result.rows[0].total) || 0,
          critical: parseInt(result.rows[0].critical) || 0,
          high: parseInt(result.rows[0].high) || 0,
        };
      }

      return { total: 0, critical: 0, high: 0 };
    } catch (error) {
      if ((error as any).code === "42P01") {
        // Tabla no existe
        console.warn(
          "Tabla road_accidents no existe. Ejecutar migración 004_create_road_accidents_tables.sql",
        );
        return { total: 0, critical: 0, high: 0 };
      }
      console.error("Error al obtener estadísticas de siniestros:", error);
      throw error;
    }
  }

  /**
   * Rellena datos climáticos históricos para un accidente que no tiene weather_data
   * Solo procesa accidentes sin datos climáticos y dentro de los últimos 92 días
   *
   * @param accidentId ID del accidente
   * @returns true si se actualizó exitosamente, false en caso contrario
   */
  async backfillWeatherData(accidentId: string): Promise<boolean> {
    try {
      const accident = await this.getAccidentById(accidentId);
      if (!accident) {
        console.log(`❌ Accidente ${accidentId} no encontrado`);
        return false;
      }

      // Verificar si ya tiene weather_data válido
      if (
        accident.weather_data &&
        typeof accident.weather_data === "object" &&
        Object.keys(accident.weather_data).length > 0
      ) {
        console.log(`ℹ️ Accidente ${accidentId} ya tiene weather_data`);
        return false;
      }

      // Verificar que esté dentro de 92 días
      const accidentDate = accident.accident_at
        ? new Date(accident.accident_at)
        : accident.created_at
          ? new Date(accident.created_at)
          : new Date();
      const now = new Date();
      const daysDiff =
        (now.getTime() - accidentDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > 92) {
        console.log(
          `⚠️ Accidente ${accidentId} es muy antiguo (${Math.floor(
            daysDiff,
          )} días). Open-Meteo solo permite hasta 92 días.`,
        );
        return false;
      }

      if (daysDiff < 0) {
        console.log(`⚠️ Accidente ${accidentId} tiene fecha futura`);
        return false;
      }

      console.log(
        `📊 Obteniendo clima histórico para accidente ${accidentId} (${Math.floor(
          daysDiff,
        )} días atrás)...`,
      );

      // Importar weatherService dinámicamente para evitar dependencia circular
      const { weatherService } = await import("./weatherService");

      // Obtener clima histórico
      const weatherData = await weatherService.fetchHistoricalWeatherForDate(
        accident.location_lat,
        accident.location_lng,
        accidentDate,
      );

      if (!weatherData) {
        console.log(
          `❌ No se pudo obtener clima histórico para accidente ${accidentId}`,
        );
        return false;
      }

      // Actualizar accidente con weather_data
      const query = `
                UPDATE road_accidents
                SET weather_data = $1, updated_at = NOW()
                WHERE id = $2
            `;
      await dbService.query(query, [JSON.stringify(weatherData), accidentId]);

      console.log(
        `✅ Weather data histórico actualizado para accidente ${accidentId}:`,
        {
          temperature: weatherData.temperature_celsius,
          precipitation: weatherData.precipitation_mm,
          description: weatherData.weather_description,
        },
      );

      return true;
    } catch (error) {
      console.error(
        `❌ Error en backfillWeatherData para ${accidentId}:`,
        error,
      );
      return false;
    }
  }
}

export const roadAccidentService = RoadAccidentService.getInstance();
