import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { dbService } from "../database/dbService";

/**
 * Query params para listado de incidentes
 */
interface IncidentsQueryParams {
  type?: string;
  subtype?: string;
  from?: string;
  to?: string;
  polygonId?: string;
  isActive?: string;
  page?: string;
  limit?: string;
  search?: string;
}

export default async function incidentsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/incidents
   * Listado de incidentes con filtros y paginación
   */
  fastify.get<{ Querystring: IncidentsQueryParams }>(
    "/",
    async (request, reply) => {
      try {
        const {
          type,
          subtype,
          from,
          to,
          polygonId,
          isActive,
          page = "1",
          limit = "50",
          search,
        } = request.query;

        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
        const offset = (pageNum - 1) * limitNum;

        // Construir query con filtros
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (type) {
          conditions.push(`type = $${paramIndex++}`);
          params.push(type.toUpperCase());
        }

        if (subtype) {
          conditions.push(`subtype = $${paramIndex++}`);
          params.push(subtype.toUpperCase());
        }

        if (from) {
          conditions.push(`created_at >= $${paramIndex++}`);
          params.push(new Date(from));
        }

        if (to) {
          conditions.push(`created_at <= $${paramIndex++}`);
          params.push(new Date(to));
        }

        if (polygonId) {
          conditions.push(`polygon_id = $${paramIndex++}`);
          params.push(polygonId);
        }

        if (isActive !== undefined) {
          conditions.push(`is_active = $${paramIndex++}`);
          params.push(isActive === "true");
        }

        if (search) {
          conditions.push(
            `(street ILIKE $${paramIndex} OR city ILIKE $${paramIndex} OR report_description ILIKE $${paramIndex})`,
          );
          params.push(`%${search}%`);
          paramIndex++;
        }

        const whereClause =
          conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        // Query de conteo total
        const countQuery = `SELECT COUNT(*) as total FROM waze_alerts ${whereClause}`;
        const countResult = await dbService.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total, 10);

        // Query principal con paginación
        const dataQuery = `
          SELECT
            uuid,
            polygon_id,
            type,
            subtype,
            latitude,
            longitude,
            street,
            city,
            country,
            pub_millis,
            created_at,
            updated_at,
            reliability,
            confidence,
            report_description,
            report_by,
            n_thumbs_up,
            report_rating,
            magvar,
            is_active
          FROM waze_alerts
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;

        params.push(limitNum, offset);
        const result = await dbService.query(dataQuery, params);

        // Transformar datos
        const incidents = result.rows.map((row: any) => ({
          uuid: row.uuid,
          polygonId: row.polygon_id,
          type: row.type,
          subtype: row.subtype,
          location: {
            lat: Number(row.latitude),
            lng: Number(row.longitude),
          },
          street: row.street,
          city: row.city,
          country: row.country,
          pubMillis: Number(row.pub_millis),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          reliability: Number(row.reliability),
          confidence: Number(row.confidence),
          description: row.report_description,
          reportBy: row.report_by,
          thumbsUp: row.n_thumbs_up,
          rating: row.report_rating,
          magvar: row.magvar,
          isActive: row.is_active,
        }));

        return reply.send({
          incidents,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: "Error retrieving incidents" });
      }
    },
  );

  /**
   * GET /api/incidents/types
   * Obtiene tipos y subtipos disponibles para filtros
   */
  fastify.get("/types", async (_request, reply) => {
    try {
      const typesQuery = `
        SELECT DISTINCT type FROM waze_alerts WHERE type IS NOT NULL ORDER BY type
      `;
      const subtypesQuery = `
        SELECT DISTINCT type, subtype FROM waze_alerts
        WHERE subtype IS NOT NULL
        ORDER BY type, subtype
      `;

      const [typesResult, subtypesResult] = await Promise.all([
        dbService.query(typesQuery),
        dbService.query(subtypesQuery),
      ]);

      // Agrupar subtipos por tipo
      const subtypesByType: Record<string, string[]> = {};
      subtypesResult.rows.forEach((row: any) => {
        if (!subtypesByType[row.type]) {
          subtypesByType[row.type] = [];
        }
        subtypesByType[row.type].push(row.subtype);
      });

      return reply.send({
        types: typesResult.rows.map((r: any) => r.type),
        subtypesByType,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Error retrieving types" });
    }
  });

  /**
   * GET /api/incidents/:uuid
   * Detalle completo de un incidente
   */
  fastify.get<{ Params: { uuid: string } }>(
    "/:uuid",
    async (request, reply) => {
      try {
        const { uuid } = request.params;

        const query = `
          SELECT * FROM waze_alerts WHERE uuid = $1
        `;
        const result = await dbService.query(query, [uuid]);

        if (result.rows.length === 0) {
          return reply.code(404).send({ error: "Incident not found" });
        }

        const row = result.rows[0];
        return reply.send({
          uuid: row.uuid,
          polygonId: row.polygon_id,
          type: row.type,
          subtype: row.subtype,
          location: {
            lat: Number(row.latitude),
            lng: Number(row.longitude),
          },
          street: row.street,
          city: row.city,
          country: row.country,
          pubMillis: Number(row.pub_millis),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          reliability: Number(row.reliability),
          confidence: Number(row.confidence),
          description: row.report_description,
          reportBy: row.report_by,
          thumbsUp: row.n_thumbs_up,
          rating: row.report_rating,
          magvar: row.magvar,
          isActive: row.is_active,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: "Error retrieving incident" });
      }
    },
  );

  /**
   * GET /api/incidents/stats
   * Estadísticas de incidentes
   */
  fastify.get("/stats", async (_request, reply) => {
    try {
      const statsQuery = `
        SELECT
          type,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE is_active = true) as active_count
        FROM waze_alerts
        GROUP BY type
        ORDER BY count DESC
      `;

      const totalQuery = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = true) as active,
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM waze_alerts
      `;

      const [statsResult, totalResult] = await Promise.all([
        dbService.query(statsQuery),
        dbService.query(totalQuery),
      ]);

      return reply.send({
        byType: statsResult.rows,
        summary: {
          total: parseInt(totalResult.rows[0].total, 10),
          active: parseInt(totalResult.rows[0].active, 10),
          oldest: totalResult.rows[0].oldest,
          newest: totalResult.rows[0].newest,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Error retrieving stats" });
    }
  });

  // Mantener endpoints legacy
  fastify.get("/history", async (request, reply) => {
    try {
      const query = `
        SELECT
          uuid as incident_id,
          type,
          subtype,
          street,
          latitude,
          longitude,
          created_at as first_seen_at,
          reliability,
          confidence,
          polygon_id as polygon_name
        FROM waze_alerts
        ORDER BY created_at DESC
        LIMIT 100
      `;

      const result = await dbService.query(query);

      const mapped = result.rows.map((row: any) => ({
        ...row,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
      }));

      return mapped;
    } catch (error) {
      fastify.log.error(error);
      return reply
        .code(500)
        .send({ error: "Database error retrieving incidents history" });
    }
  });

  fastify.get("/all", async (request, reply) => {
    try {
      const query = `
        SELECT
          uuid as id,
          type,
          subtype,
          street,
          latitude,
          longitude,
          pub_millis,
          report_description as description,
          report_by as "reportBy",
          confidence,
          reliability,
          n_thumbs_up as "nThumbsUp",
          polygon_id as "polygonId"
        FROM waze_alerts
        WHERE is_active = true
        LIMIT 2000
      `;

      const result = await dbService.query(query);

      return result.rows.map((row: any) => ({
        ...row,
        location: {
          lat: Number(row.latitude),
          lng: Number(row.longitude),
        },
        timestamp: new Date(Number(row.pub_millis)),
      }));
    } catch (error) {
      fastify.log.error(error);
      return reply
        .code(500)
        .send({ error: "Database error retrieving incidents" });
    }
  });
}
