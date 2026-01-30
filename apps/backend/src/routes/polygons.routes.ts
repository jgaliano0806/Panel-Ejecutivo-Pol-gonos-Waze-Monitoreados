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

  // GET /api/polygons/all
  fastify.get("/all", async (request, reply) => {
    try {
      const result = await dbService.query(`
        SELECT id, name, "group", feed_url, tvt_feed_url, coordinates, geometry, is_active
        FROM config_polygons
        ORDER BY "group", name
      `);
      return result.rows;
    } catch (error) {
      fastify.log.error(error);
      return reply
        .code(500)
        .send({ error: "Database error retrieving polygons" });
    }
  });

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

        // Construir query dinámico o update full
        const result = await dbService.query(
          `UPDATE config_polygons
         SET name = $2, "group" = $3, feed_url = $4, tvt_feed_url = $5,
             coordinates = $6, geometry = $7, is_active = $8, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
          [
            id,
            name,
            group,
            feed_url,
            tvt_feed_url,
            coordinates,
            geometry,
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

  // DELETE /api/polygons/:id - Eliminar (soft delete preferred, but user requested CRUD)
  // Implementaré borrado físico si no hay constraints, o soft delete si prefieren.
  // El schema tiene is_active, así que soft delete es mejor, pero DELETE endpoint suele borrar
  // A menos que sea "Desactivar".
  // Hare DELETE físico con cuidado.
  fastify.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      // Check dependencies?
      // For simplicity, just try delete.
      const result = await dbService.query(
        "DELETE FROM config_polygons WHERE id = $1 RETURNING id",
        [id],
      );
      if (result.rowCount === 0) {
        return reply.code(404).send({ error: "Polygon not found" });
      }
      return { message: "Polygon deleted successfully", id };
    } catch (error: any) {
      fastify.log.error(error);
      if (error.code === "23503") {
        // FK violation
        return reply.code(409).send({
          error:
            "Cannot delete polygon: referenced by other records. Try deactivating instead.",
        });
      }
      return reply.code(500).send({ error: "Database error deleting polygon" });
    }
  });
}
