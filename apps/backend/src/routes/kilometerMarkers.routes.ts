import { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";
import { repositories } from "../repositories";
import { authenticate, requirePermission } from "../middleware/authMiddleware";
import { geoReferenceService } from "../services/geoReferenceService";
import { dbService } from "../database/dbService";

/**
 * Rutas CRUD para Hitos Kilométricos
 * GET público (mapa), POST/PUT/DELETE protegido (admin)
 */
export default async function kilometerMarkersRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // ─── GET /api/kilometers ───────────────────────────────
  // Lista todos los marcadores (activos por defecto)
  fastify.get("/", async (request, reply) => {
    try {
      const { search, active, group_id, limit, offset } = request.query as {
        search?: string;
        active?: string;
        group_id?: string;
        limit?: string;
        offset?: string;
      };

      const repo = repositories().kilometerMarkers;

      // Búsqueda por nombre
      if (search) {
        const results = await repo.search(search);
        return reply.send(results);
      }

      // Filtrar por grupo
      if (group_id) {
        const results = await repo.findByGroup(parseInt(group_id, 10));
        return reply.send(results);
      }

      // Filtrar por estado
      if (active === "true") {
        const results = await repo.findAllActive();
        return reply.send(results);
      }

      // Listado paginado (admin)
      const results = await repo.findAll({
        limit: limit ? parseInt(limit, 10) : 500,
        offset: offset ? parseInt(offset, 10) : 0,
        orderBy: "name",
        orderDirection: "ASC",
      });
      return reply.send(results);
    } catch (error: any) {
      request.log.error({ err: error }, "Error listing kilometer markers");
      return reply
        .status(500)
        .send({ error: "Error al listar hitos kilométricos" });
    }
  });

  // ─── GET /api/kilometers/stats ─────────────────────────
  fastify.get("/stats", async (request, reply) => {
    try {
      const repo = repositories().kilometerMarkers;
      const stats = await repo.countByStatus();
      return reply.send(stats);
    } catch (error: any) {
      request.log.error(error, "Error getting kilometer stats");
      return reply.status(500).send({ error: "Error al obtener estadísticas" });
    }
  });

  // ─── GET /api/kilometers/:id ───────────────────────────
  fastify.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const repo = repositories().kilometerMarkers;
      const marker = await repo.findById(id);
      if (!marker) {
        return reply
          .status(404)
          .send({ error: "Hito kilométrico no encontrado" });
      }
      return reply.send(marker);
    } catch (error: any) {
      request.log.error(error, "Error getting kilometer marker");
      return reply
        .status(500)
        .send({ error: "Error al obtener hito kilométrico" });
    }
  });

  // ─── POST /api/kilometers (protegido) ──────────────────
  fastify.post(
    "/",
    { preHandler: [authenticate, requirePermission("admin.manage")] },
    async (request, reply) => {
      try {
        const body = request.body as {
          name: string;
          latitude: number;
          longitude: number;
          route_name?: string;
          polygon_group_id?: number | null;
          is_active?: boolean;
        };

        if (!body.name || body.latitude == null || body.longitude == null) {
          return reply.status(400).send({
            error: "Campos name, latitude y longitude son obligatorios",
          });
        }

        const repo = repositories().kilometerMarkers;
        const marker = await repo.create({
          name: body.name.trim(),
          latitude: body.latitude,
          longitude: body.longitude,
          route_name: body.route_name?.trim() || null,
          polygon_group_id: body.polygon_group_id ?? null,
          is_active: body.is_active ?? true,
        });

        return reply.status(201).send(marker);
      } catch (error: any) {
        request.log.error(error, "Error creating kilometer marker");
        return reply
          .status(500)
          .send({ error: "Error al crear hito kilométrico" });
      }
    },
  );

  // ─── PUT /api/kilometers/:id (protegido) ───────────────
  fastify.put(
    "/:id",
    { preHandler: [authenticate, requirePermission("admin.manage")] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as Partial<{
          name: string;
          latitude: number;
          longitude: number;
          route_name: string;
          polygon_group_id: number | null;
          is_active: boolean;
        }>;

        const repo = repositories().kilometerMarkers;

        // Verificar que existe
        const exists = await repo.exists(id);
        if (!exists) {
          return reply
            .status(404)
            .send({ error: "Hito kilométrico no encontrado" });
        }

        const updateData: Record<string, any> = {};
        if (body.name !== undefined) updateData.name = body.name.trim();
        if (body.latitude !== undefined) updateData.latitude = body.latitude;
        if (body.longitude !== undefined) updateData.longitude = body.longitude;
        if (body.route_name !== undefined)
          updateData.route_name = body.route_name?.trim() || null;
        if (body.polygon_group_id !== undefined)
          updateData.polygon_group_id = body.polygon_group_id;
        if (body.is_active !== undefined) updateData.is_active = body.is_active;

        const updated = await repo.update(id, updateData);
        return reply.send(updated);
      } catch (error: any) {
        request.log.error(error, "Error updating kilometer marker");
        return reply
          .status(500)
          .send({ error: "Error al actualizar hito kilométrico" });
      }
    },
  );

  // ─── DELETE /api/kilometers/:id (protegido) ────────────
  fastify.delete(
    "/:id",
    { preHandler: [authenticate, requirePermission("admin.manage")] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const repo = repositories().kilometerMarkers;

        const deleted = await repo.delete(id);
        if (!deleted) {
          return reply
            .status(404)
            .send({ error: "Hito kilométrico no encontrado" });
        }

        return reply.send({
          success: true,
          message: "Hito eliminado correctamente",
        });
      } catch (error: any) {
        request.log.error(error, "Error deleting kilometer marker");
        return reply
          .status(500)
          .send({ error: "Error al eliminar hito kilométrico" });
      }
    },
  );

  // ─── POST /api/kilometers/seed (protegido) ─────────────
  // Reimporta hitos kilométricos desde el Excel RAC_22_KM.
  // Elimina todos los registros existentes y los reemplaza.
  fastify.post(
    "/seed",
    { preHandler: [authenticate, requirePermission("admin.manage")] },
    async (request, reply) => {
      try {
        const xlsxPath = path.resolve(
          __dirname,
          "../../../../RAC_22_KM (1).xlsx",
        );

        if (!fs.existsSync(xlsxPath)) {
          return reply.status(404).send({
            error:
              "Archivo RAC_22_KM (1).xlsx no encontrado en la raíz del proyecto",
          });
        }

        const { parseExcelBuffer, seedKilometerMarkers } = require(
          "../../scripts/seed-km-from-excel",
        );

        const buffer = fs.readFileSync(xlsxPath);
        const rows = parseExcelBuffer(buffer);

        if (rows.length === 0) {
          return reply
            .status(400)
            .send({ error: "No se encontraron filas válidas en el Excel" });
        }

        const pool = dbService.getPool();
        const inserted = await seedKilometerMarkers(pool, rows);

        await geoReferenceService.reloadMarkers();

        return reply.send({
          success: true,
          message: `${inserted} hitos kilométricos importados correctamente`,
          count: inserted,
        });
      } catch (error: any) {
        request.log.error(error, "Error seeding kilometer markers");
        return reply
          .status(500)
          .send({ error: "Error al importar hitos kilométricos" });
      }
    },
  );
}
