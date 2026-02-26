import { FastifyInstance } from "fastify";
import { dbService } from "../database/dbService";
import { repositories } from "../repositories";
import { REAL_POLYGONS } from "../config/realPolygons";
import { serializeObject } from "../utils/serialization";

interface PolygonInput {
  id: string;
  name: string;
  group?: string;
  feed_url: string;
  tvt_feed_url?: string;
  coordinates?: any;
  geometry?: any;
  is_active?: boolean;
}

type PolygonPatch = Partial<Omit<PolygonInput, "id">>;

export default async function polygonsRoutes(fastify: FastifyInstance) {
  // GET /api/polygons - Obtener todos (compatibilidad con frontend)
  fastify.get("/", async (request, reply) => {
    try {
      const polygons = await repositories().polygons.findAll();
      return serializeObject(polygons);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Failed to get polygons" });
    }
  });

  // POST /api/polygons/sync - Sincronizar desde configuración estática
  fastify.post("/sync", async (request, reply) => {
    try {
      fastify.log.info(
        "🔄 Sincronizando polígonos desde configuración estática...",
      );
      let added = 0;
      let updated = 0;

      for (const poly of REAL_POLYGONS) {
        const existing = await repositories().polygons.findById(poly.id);
        if (existing) {
          await repositories().polygons.update(poly.id, poly);
          updated++;
        } else {
          await repositories().polygons.create(poly);
          added++;
        }
      }

      return {
        success: true,
        message: `Sincronización completada: ${added} añadidos, ${updated} actualizados`,
        data: { added, updated },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: "Sync failed",
        message: error.message || "Unknown error",
      });
    }
  });

  // GET /api/polygons/all — supports ?limit=N&offset=N
  fastify.get<{ Querystring: { limit?: string; offset?: string } }>(
    "/all",
    async (request, reply) => {
      try {
        const limit = Math.min(
          parseInt(request.query.limit ?? "500", 10) || 500,
          1000,
        );
        const offset = parseInt(request.query.offset ?? "0", 10) || 0;

        const result = await dbService.query(
          `SELECT id, name, "group", feed_url, tvt_feed_url, coordinates, geometry, is_active
           FROM config_polygons
           ORDER BY "group", name
           LIMIT $1 OFFSET $2`,
          [limit, offset],
        );

        return result.rows;
      } catch (error) {
        fastify.log.error(error);
        return reply
          .code(500)
          .send({ error: "Database error retrieving polygons" });
      }
    },
  );

  // GET /api/polygons/:id
  fastify.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const result = await dbService.query(
        "SELECT * FROM config_polygons WHERE id = $1",
        [id],
      );
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: "Polygon not found" });
      }
      return result.rows[0];
    } catch (error) {
      fastify.log.error(error);
      return reply
        .code(500)
        .send({ error: "Database error retrieving polygon" });
    }
  });

  // POST /api/polygons - Crear nuevo polígono
  fastify.post<{ Body: PolygonInput }>("/", async (request, reply) => {
    try {
      const {
        id,
        name,
        group,
        feed_url,
        tvt_feed_url,
        coordinates,
        geometry,
        is_active,
      } = request.body;

      // Validación básica
      if (!id || !name || !feed_url) {
        return reply
          .code(400)
          .send({ error: "Missing required fields: id, name, feed_url" });
      }

      const result = await dbService.query(
        `INSERT INTO config_polygons
         (id, name, "group", feed_url, tvt_feed_url, coordinates, geometry, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          id,
          name,
          group,
          feed_url,
          tvt_feed_url,
          coordinates,
          geometry,
          is_active ?? true,
        ],
      );

      return reply.code(201).send(result.rows[0]);
    } catch (error: any) {
      fastify.log.error(error);
      if (error.code === "23505") {
        // Unique violation
        return reply.code(409).send({ error: "Polygon ID already exists" });
      }
      return reply.code(500).send({ error: "Database error creating polygon" });
    }
  });

  // PUT /api/polygons/:id - Actualizar polígono
  fastify.put<{ Params: { id: string }; Body: PolygonInput }>(
    "/:id",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const {
          name,
          group,
          feed_url,
          tvt_feed_url,
          coordinates,
          geometry,
          is_active,
        } = request.body;

        const coordsJson =
          coordinates != null
            ? typeof coordinates === "string"
              ? coordinates
              : JSON.stringify(coordinates)
            : null;
        const geomJson =
          geometry != null
            ? typeof geometry === "string"
              ? geometry
              : JSON.stringify(geometry)
            : null;

        const result = await dbService.query(
          `UPDATE config_polygons
         SET name = $2, "group" = $3, feed_url = $4, tvt_feed_url = $5,
             coordinates = $6::jsonb, geometry = $7::jsonb, is_active = COALESCE($8, is_active, true), updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
          [
            id,
            name,
            group,
            feed_url,
            tvt_feed_url,
            coordsJson,
            geomJson,
            is_active,
          ],
        );

        if (result.rowCount === 0) {
          return reply.code(404).send({ error: "Polygon not found" });
        }

        return result.rows[0];
      } catch (error) {
        fastify.log.error(error);
        return reply
          .code(500)
          .send({ error: "Database error updating polygon" });
      }
    },
  );

  // PATCH /api/polygons/:id — partial update
  fastify.patch<{ Params: { id: string }; Body: PolygonPatch }>(
    "/:id",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const updates = request.body;

        const ALLOWED_COLS = [
          "name",
          "group",
          "feed_url",
          "tvt_feed_url",
          "coordinates",
          "geometry",
          "is_active",
        ] as const;

        const setClauses: string[] = [];
        const params: unknown[] = [id];
        let pIdx = 2;

        for (const col of ALLOWED_COLS) {
          const val = (updates as Record<string, unknown>)[col];
          if (val === undefined) continue;
          if (col === "group") {
            setClauses.push(`"group" = $${pIdx++}`);
          } else if (col === "coordinates" || col === "geometry") {
            const json =
              typeof val === "string" ? val : JSON.stringify(val);
            setClauses.push(`${col} = $${pIdx++}::jsonb`);
            params.push(json);
            continue;
          } else {
            setClauses.push(`${col} = $${pIdx++}`);
          }
          params.push(val);
        }

        if (setClauses.length === 0) {
          return reply.code(400).send({ error: "No valid fields to update" });
        }

        setClauses.push("updated_at = NOW()");

        const result = await dbService.query(
          `UPDATE config_polygons SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
          params,
        );

        if (result.rowCount === 0) {
          return reply.code(404).send({ error: "Polygon not found" });
        }

        return result.rows[0];
      } catch (error) {
        fastify.log.error(error);
        return reply
          .code(500)
          .send({ error: "Database error updating polygon" });
      }
    },
  );

  // DELETE /api/polygons/:id — soft delete (sets is_active = false)
  fastify.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      if (id === "UNKNOWN") {
        return reply.code(403).send({
          error: "No se puede desactivar el polígono de sistema UNKNOWN",
        });
      }

      const result = await dbService.query(
        `UPDATE config_polygons
         SET is_active = false, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id],
      );

      if (result.rowCount === 0) {
        return reply.code(404).send({ error: "Polygon not found" });
      }

      return { message: "Polygon deactivated", polygon: result.rows[0] };
    } catch (error) {
      fastify.log.error(error);
      return reply
        .code(500)
        .send({ error: "Database error deactivating polygon" });
    }
  });
}
