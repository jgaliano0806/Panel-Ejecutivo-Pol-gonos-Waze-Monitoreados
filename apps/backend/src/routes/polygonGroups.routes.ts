import { FastifyInstance } from "fastify";
import { dbService } from "../database/dbService";

export default async function polygonGroupsRoutes(fastify: FastifyInstance) {
  // GET /api/polygon-groups
  fastify.get("/", async (request, reply) => {
    try {
      const result = await dbService.query(
        `SELECT id, name, sort_order, is_active, created_at, updated_at
         FROM polygon_groups
         ORDER BY sort_order ASC, name ASC`
      );
      return result.rows;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Failed to get polygon groups" });
    }
  });

  // POST /api/polygon-groups
  fastify.post<{ Body: { name: string; sort_order?: number; is_active?: boolean } }>(
    "/",
    async (request, reply) => {
      try {
        const { name, sort_order = 0, is_active = true } = request.body;
        if (!name || !String(name).trim()) {
          return reply
            .code(400)
            .send({ error: "Campo name es requerido" });
        }
        const result = await dbService.query(
          `INSERT INTO polygon_groups (name, sort_order, is_active)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [String(name).trim(), sort_order, is_active ?? true]
        );
        return reply.code(201).send(result.rows[0]);
      } catch (error: any) {
        fastify.log.error(error);
        if (error.code === "23505") {
          return reply
            .code(409)
            .send({ error: "Ya existe un grupo con ese nombre" });
        }
        return reply.code(500).send({ error: "Error creating group" });
      }
    }
  );

  // PUT /api/polygon-groups/:id
  fastify.put<{
    Params: { id: string };
    Body: { name?: string; sort_order?: number; is_active?: boolean };
  }>("/:id", async (request, reply) => {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.code(400).send({ error: "ID inválido" });
      }
      const { name, sort_order, is_active } = request.body;

      let oldName: string | null = null;
      if (name !== undefined) {
        const groupRow = await dbService.query(
          "SELECT name FROM polygon_groups WHERE id = $1",
          [id]
        );
        if (groupRow.rows.length > 0) oldName = groupRow.rows[0].name;
      }

      const updates: string[] = [];
      const values: any[] = [];
      let i = 1;

      if (name !== undefined) {
        if (!String(name).trim()) {
          return reply.code(400).send({ error: "El nombre no puede estar vacío" });
        }
        updates.push(`name = $${i++}`);
        values.push(String(name).trim());
      }
      if (sort_order !== undefined) {
        updates.push(`sort_order = $${i++}`);
        values.push(sort_order);
      }
      if (is_active !== undefined) {
        updates.push(`is_active = $${i++}`);
        values.push(!!is_active);
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: "No hay campos para actualizar" });
      }

      updates.push("updated_at = NOW()");
      values.push(id);

      const result = await dbService.query(
        `UPDATE polygon_groups
         SET ${updates.join(", ")}
         WHERE id = $${i}
         RETURNING *`,
        values
      );

      if (result.rowCount === 0) {
        return reply.code(404).send({ error: "Grupo no encontrado" });
      }

      if (oldName && name && String(name).trim() !== oldName) {
        await dbService.query(
          `UPDATE config_polygons SET "group" = $1, updated_at = NOW() WHERE "group" = $2`,
          [String(name).trim(), oldName]
        );
      }

      return result.rows[0];
    } catch (error: any) {
      fastify.log.error(error);
      if (error.code === "23505") {
        return reply
          .code(409)
          .send({ error: "Ya existe un grupo con ese nombre" });
      }
      return reply.code(500).send({ error: "Error updating group" });
    }
  });

  // DELETE /api/polygon-groups/:id
  fastify.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.code(400).send({ error: "ID inválido" });
      }

      const groupRow = await dbService.query(
        "SELECT name FROM polygon_groups WHERE id = $1",
        [id]
      );
      if (groupRow.rows.length === 0) {
        return reply.code(404).send({ error: "Grupo no encontrado" });
      }
      const groupName = groupRow.rows[0].name;

      const updateCount = await dbService.query(
        `UPDATE config_polygons SET "group" = NULL WHERE "group" = $1`,
        [groupName]
      );
      const delResult = await dbService.query(
        "DELETE FROM polygon_groups WHERE id = $1 RETURNING id",
        [id]
      );
      return {
        message: "Grupo eliminado",
        id: delResult.rows[0].id,
        polygonsUpdated: updateCount.rowCount ?? 0,
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Error deleting group" });
    }
  });
}
