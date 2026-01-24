/**
 * Rutas de Catálogos de Incidentes
 * Extraído de server.ts siguiendo architecture-patterns y nodejs-backend-patterns
 *
 * Endpoints:
 * - GET /types - Listar tipos de incidentes
 * - GET / - Obtener catálogo completo
 * - GET /stats - Estadísticas de uso
 * - POST /sync - Sincronizar desde Waze
 * - POST /types - Crear tipo
 * - PUT /types/:id - Actualizar tipo
 * - DELETE /types/:id - Eliminar tipo
 * - POST /subtypes - Crear subtipo
 * - PUT /subtypes/:id - Actualizar subtipo
 * - DELETE /subtypes/:id - Eliminar subtipo
 */

import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { catalogSyncService } from "../services/catalogSyncService";
import { dbService } from "../database/dbService";

// =============================================================================
// TIPOS DE REQUEST (Skill: typescript-advanced-types)
// =============================================================================

interface IdParams {
  id: string;
}

interface CreateTypeBody {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  icon_url?: string;
}

interface UpdateTypeBody {
  code?: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
  icon_url?: string;
}

interface CreateSubtypeBody {
  type_id: number;
  code: string;
  name: string;
  description?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  icon_url?: string;
}

interface UpdateSubtypeBody {
  name?: string;
  description?: string;
  severity?: string;
  is_active?: boolean;
  icon_url?: string;
}

// =============================================================================
// FUNCIONES DE UTILIDAD
// =============================================================================

/**
 * Serializa objetos recursivamente convirtiendo Date a ISO string
 */
function serializeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;

  if (obj instanceof Date) {
    if (isNaN(obj.getTime())) return null;
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeObject(item));
  }

  if (typeof obj === "object") {
    const serialized: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeObject(
          (obj as Record<string, unknown>)[key],
        );
      }
    }
    return serialized;
  }

  if (typeof obj === "number" && isNaN(obj)) {
    return null;
  }

  return obj;
}

// =============================================================================
// PLUGIN DE RUTAS (Skill: nodejs-backend-patterns)
// =============================================================================

async function catalogsRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
): Promise<void> {
  // GET /types - Listar todos los tipos de incidentes
  fastify.get("/types", async (_request, reply) => {
    try {
      const types = await catalogSyncService.getAllIncidentTypes();
      return { success: true, data: types, count: types.length };
    } catch (error) {
      fastify.log.error({ error }, "Error obteniendo tipos de incidentes");
      reply.code(500).send({ success: false, error: (error as Error).message });
    }
  });

  // GET / - Obtener catálogo completo
  fastify.get("/", async (_request, reply) => {
    try {
      const catalogs = await catalogSyncService.getAllIncidentTypes();
      reply.send(serializeObject(catalogs));
    } catch (error) {
      fastify.log.error({ error }, "Error obteniendo catálogos");
      reply.code(500).send({ error: "Failed to get catalogs" });
    }
  });

  // GET /stats - Estadísticas de uso
  fastify.get("/stats", async (_request, reply) => {
    try {
      const stats = await catalogSyncService.getCatalogUsageStats();
      reply.send(serializeObject(stats));
    } catch (error) {
      fastify.log.error(
        { error },
        "Error obteniendo estadísticas de catálogos",
      );
      reply.code(500).send({ error: "Failed to get catalog stats" });
    }
  });

  // POST /sync - Sincronizar desde Waze
  fastify.post("/sync", async (_request, reply) => {
    try {
      fastify.log.info("Iniciando sincronización de catálogos desde Waze");
      const result = await catalogSyncService.syncFromWazeFeeds();

      reply.send({
        success: true,
        message: "Sincronización completada exitosamente",
        data: result,
      });

      fastify.log.info(
        { newTypes: result.newTypes, newSubtypes: result.newSubtypes },
        "Sincronización completada",
      );
    } catch (error) {
      fastify.log.error({ error }, "Error sincronizando catálogos");
      reply.code(500).send({
        error: "Failed to sync catalogs",
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  });

  // POST /types - Crear nuevo tipo (con transacción para evitar race conditions)
  fastify.post<{ Body: CreateTypeBody }>("/types", async (request, reply) => {
    try {
      const { code, name, description, icon, color, icon_url } = request.body;

      if (!code || !name) {
        reply.code(400).send({ error: "Code and name are required" });
        return;
      }

      // Transacción: verificar + insertar atómicamente
      const result = await dbService.transaction(async (client) => {
        // Verificar que no exista
        const existing = await client.query(
          "SELECT id FROM incident_types WHERE code = $1",
          [code],
        );
        if (existing.rows.length > 0) {
          throw { status: 409, message: "Type code already exists" };
        }

        // Insertar nuevo tipo
        return await client.query(
          `INSERT INTO incident_types (code, name, description, icon, color, is_active, created_at, updated_at, icon_url)
           VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $6)
           RETURNING *`,
          [
            code,
            name,
            description || "",
            icon || "alert-triangle",
            color || "#6b7280",
            icon_url || null,
          ],
        );
      });

      reply.send(serializeObject(result.rows[0]));
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 409) {
        reply.code(409).send({ error: err.message });
        return;
      }
      fastify.log.error({ error }, "Error creando tipo de incidente");
      reply.code(500).send({ error: "Failed to create incident type" });
    }
  });

  // PUT /types/:id - Actualizar tipo
  fastify.put<{ Params: IdParams; Body: UpdateTypeBody }>(
    "/types/:id",
    async (request, reply) => {
      try {
        const id = parseInt(request.params.id);
        const { code, name, description, icon, color, is_active, icon_url } =
          request.body;

        fastify.log.info({ id, code, name }, "Actualizando tipo de incidente");

        if (!name) {
          reply.code(400).send({ error: "Name is required" });
          return;
        }

        const result = await dbService.query(
          `UPDATE incident_types
         SET code = $1, name = $2, description = $3, icon = $4, color = $5, is_active = $6, icon_url = $7, updated_at = CURRENT_TIMESTAMP
         WHERE id = $8
         RETURNING *`,
          [
            code || null,
            name,
            description || null,
            icon || null,
            color || null,
            is_active !== undefined ? is_active : true,
            icon_url || null,
            id,
          ],
        );

        if (result.rows.length === 0) {
          reply.code(404).send({ error: "Incident type not found" });
          return;
        }

        reply.send(serializeObject(result.rows[0]));
      } catch (error) {
        fastify.log.error({ error }, "Error actualizando tipo de incidente");
        reply.code(500).send({ error: "Failed to update incident type" });
      }
    },
  );

  // DELETE /types/:id - Eliminar tipo (con transacción para verificar integridad)
  fastify.delete<{ Params: IdParams }>("/types/:id", async (request, reply) => {
    try {
      const id = parseInt(request.params.id);

      // Transacción: verificar subtipos + eliminar atómicamente
      const result = await dbService.transaction(async (client) => {
        // Verificar subtipos asociados
        const subtypes = await client.query(
          "SELECT COUNT(*) as count FROM incident_subtypes WHERE type_id = $1",
          [id],
        );
        if (parseInt(subtypes.rows[0].count) > 0) {
          throw {
            status: 400,
            message: `Cannot delete type with associated subtypes. This type has ${subtypes.rows[0].count} subtypes.`,
          };
        }

        return await client.query(
          "DELETE FROM incident_types WHERE id = $1 RETURNING *",
          [id],
        );
      });

      if (result.rows.length === 0) {
        reply.code(404).send({ error: "Incident type not found" });
        return;
      }

      reply.send({
        success: true,
        message: "Incident type deleted successfully",
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 400) {
        reply.code(400).send({ error: err.message });
        return;
      }
      fastify.log.error({ error }, "Error eliminando tipo de incidente");
      reply.code(500).send({ error: "Failed to delete incident type" });
    }
  });

  // POST /subtypes - Crear subtipo (con transacción para evitar race conditions)
  fastify.post<{ Body: CreateSubtypeBody }>(
    "/subtypes",
    async (request, reply) => {
      try {
        const { type_id, code, name, description, severity, icon_url } =
          request.body;

        if (!type_id || !code || !name) {
          reply
            .code(400)
            .send({ error: "type_id, code and name are required" });
          return;
        }

        // Transacción: verificar tipo + verificar duplicado + insertar atómicamente
        const result = await dbService.transaction(async (client) => {
          // Verificar tipo existe
          const typeExists = await client.query(
            "SELECT id FROM incident_types WHERE id = $1",
            [type_id],
          );
          if (typeExists.rows.length === 0) {
            throw { status: 400, message: "Invalid type_id" };
          }

          // Verificar subtipo no existe
          const existing = await client.query(
            "SELECT id FROM incident_subtypes WHERE type_id = $1 AND code = $2",
            [type_id, code],
          );
          if (existing.rows.length > 0) {
            throw {
              status: 409,
              message: "Subtype code already exists for this type",
            };
          }

          // Insertar nuevo subtipo
          return await client.query(
            `INSERT INTO incident_subtypes (type_id, code, name, description, severity, is_active, created_at, updated_at, icon_url)
             VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $6)
             RETURNING *`,
            [
              type_id,
              code,
              name,
              description || "",
              severity || "MEDIUM",
              icon_url || null,
            ],
          );
        });

        reply.send(serializeObject(result.rows[0]));
      } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        if (err.status === 400) {
          reply.code(400).send({ error: err.message });
          return;
        }
        if (err.status === 409) {
          reply.code(409).send({ error: err.message });
          return;
        }
        fastify.log.error({ error }, "Error creando subtipo de incidente");
        reply.code(500).send({ error: "Failed to create incident subtype" });
      }
    },
  );

  // PUT /subtypes/:id - Actualizar subtipo
  fastify.put<{ Params: IdParams; Body: UpdateSubtypeBody }>(
    "/subtypes/:id",
    async (request, reply) => {
      try {
        const id = parseInt(request.params.id);
        const { name, description, severity, is_active, icon_url } =
          request.body;

        const result = await dbService.query(
          `UPDATE incident_subtypes
         SET name = $1, description = $2, severity = $3, is_active = $4, icon_url = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
          [name, description, severity, is_active, icon_url, id],
        );

        if (result.rows.length === 0) {
          reply.code(404).send({ error: "Incident subtype not found" });
          return;
        }

        reply.send(serializeObject(result.rows[0]));
      } catch (error) {
        fastify.log.error({ error }, "Error actualizando subtipo de incidente");
        reply.code(500).send({ error: "Failed to update incident subtype" });
      }
    },
  );

  // DELETE /subtypes/:id - Eliminar subtipo
  fastify.delete<{ Params: IdParams }>(
    "/subtypes/:id",
    async (request, reply) => {
      try {
        const id = parseInt(request.params.id);
        const result = await dbService.query(
          "DELETE FROM incident_subtypes WHERE id = $1 RETURNING *",
          [id],
        );

        if (result.rows.length === 0) {
          reply.code(404).send({ error: "Incident subtype not found" });
          return;
        }

        reply.send({
          success: true,
          message: "Incident subtype deleted successfully",
        });
      } catch (error) {
        fastify.log.error({ error }, "Error eliminando subtipo de incidente");
        reply.code(500).send({ error: "Failed to delete incident subtype" });
      }
    },
  );
}

export default catalogsRoutes;
