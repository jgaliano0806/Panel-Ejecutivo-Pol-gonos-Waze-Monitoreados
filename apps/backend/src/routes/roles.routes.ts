/**
 * Roles Routes
 * CRUD completo de roles y permisos con autenticación
 */

import { FastifyInstance } from "fastify";
import { dbService } from "../database/dbService";
import { authenticate, requirePermission } from "../middleware/authMiddleware";

interface CreateRoleBody {
  name: string;
  description?: string;
  color?: string;
  permissionIds: number[];
}

interface UpdateRoleBody {
  name?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
  permissionIds?: number[];
}

export default async function rolesRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /
   * Listar todos los roles con sus permisos
   */
  app.get(
    "/",
    {
      preHandler: [
        authenticate,
        requirePermission("users.view", "users.manage"),
      ],
    },
    async (_request, reply) => {
      try {
        const result = await dbService.query(
          `SELECT r.id, r.name, r.description, r.color, r.is_active,
                  r.created_at, r.updated_at,
                  COALESCE(
                    json_agg(
                      json_build_object('id', p.id, 'code', p.code, 'name', p.name, 'category', p.category)
                    ) FILTER (WHERE p.id IS NOT NULL),
                    '[]'
                  ) as permissions,
                  COUNT(DISTINCT ur.user_id) as user_count
           FROM roles r
           LEFT JOIN role_permissions rp ON rp.role_id = r.id
           LEFT JOIN permissions p ON p.id = rp.permission_id
           LEFT JOIN user_roles ur ON ur.role_id = r.id
           GROUP BY r.id
           ORDER BY r.created_at ASC`,
        );

        const roles = result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          color: row.color,
          isActive: row.is_active,
          permissions: row.permissions,
          userCount: parseInt(row.user_count) || 0,
          createdAt: new Date(row.created_at).toISOString(),
          updatedAt: new Date(row.updated_at).toISOString(),
        }));

        return reply.code(200).send({
          success: true,
          data: roles,
        });
      } catch (error) {
        app.log.error(error, "Error listando roles");
        return reply.code(500).send({
          success: false,
          error: "Error obteniendo roles",
        });
      }
    },
  );

  /**
   * GET /:id
   * Detalle de un rol
   */
  app.get<{ Params: { id: string } }>(
    "/:id",
    {
      preHandler: [
        authenticate,
        requirePermission("users.view", "users.manage"),
      ],
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const result = await dbService.query(
          `SELECT id, name, description, color, is_active, created_at, updated_at
           FROM roles WHERE id = $1`,
          [id],
        );

        if (result.rows.length === 0) {
          return reply
            .code(404)
            .send({ success: false, error: "Rol no encontrado" });
        }

        const role = result.rows[0];

        const permissionsResult = await dbService.query(
          `SELECT p.id, p.code, p.name, p.description, p.category
           FROM permissions p
           INNER JOIN role_permissions rp ON rp.permission_id = p.id
           WHERE rp.role_id = $1`,
          [id],
        );

        return reply.code(200).send({
          success: true,
          data: {
            id: role.id,
            name: role.name,
            description: role.description,
            color: role.color,
            isActive: role.is_active,
            permissions: permissionsResult.rows,
            createdAt: new Date(role.created_at).toISOString(),
            updatedAt: new Date(role.updated_at).toISOString(),
          },
        });
      } catch (error) {
        app.log.error(error, "Error obteniendo rol");
        return reply.code(500).send({
          success: false,
          error: "Error obteniendo rol",
        });
      }
    },
  );

  /**
   * POST /
   * Crear nuevo rol
   */
  app.post<{ Body: CreateRoleBody }>(
    "/",
    { preHandler: [authenticate, requirePermission("users.manage")] },
    async (request, reply) => {
      try {
        const { name, description, color, permissionIds } = request.body;

        if (!name) {
          return reply.code(400).send({
            success: false,
            error: "El nombre del rol es requerido",
          });
        }

        // Verificar unicidad
        const existing = await dbService.query(
          `SELECT id FROM roles WHERE name = $1`,
          [name],
        );

        if (existing.rows.length > 0) {
          return reply.code(409).send({
            success: false,
            error: "Ya existe un rol con ese nombre",
          });
        }

        const result = await dbService.transaction(async (client) => {
          const roleResult = await client.query(
            `INSERT INTO roles (name, description, color)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [name, description || null, color || "#6b7280"],
          );

          const roleId = roleResult.rows[0].id;

          // Asignar permisos
          if (permissionIds && permissionIds.length > 0) {
            for (const permId of permissionIds) {
              await client.query(
                `INSERT INTO role_permissions (role_id, permission_id)
                 VALUES ($1, $2)
                 ON CONFLICT (role_id, permission_id) DO NOTHING`,
                [roleId, permId],
              );
            }
          }

          return roleId;
        });

        return reply.code(201).send({
          success: true,
          data: { id: result },
          message: "Rol creado exitosamente",
        });
      } catch (error) {
        app.log.error(error, "Error creando rol");
        return reply.code(500).send({
          success: false,
          error: "Error creando rol",
        });
      }
    },
  );

  /**
   * PUT /:id
   * Actualizar rol y sus permisos
   */
  app.put<{ Params: { id: string }; Body: UpdateRoleBody }>(
    "/:id",
    { preHandler: [authenticate, requirePermission("users.manage")] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { name, description, color, isActive, permissionIds } =
          request.body;

        // Verificar que el rol existe
        const existing = await dbService.query(
          `SELECT id, name FROM roles WHERE id = $1`,
          [id],
        );

        if (existing.rows.length === 0) {
          return reply
            .code(404)
            .send({ success: false, error: "Rol no encontrado" });
        }

        await dbService.transaction(async (client) => {
          const updates: string[] = [];
          const params: unknown[] = [];
          let paramIndex = 1;

          if (name !== undefined) {
            // Verificar unicidad
            const nameCheck = await client.query(
              `SELECT id FROM roles WHERE name = $1 AND id != $2`,
              [name, id],
            );
            if (nameCheck.rows.length > 0) {
              throw new Error("DUPLICATE_NAME");
            }
            updates.push(`name = $${paramIndex++}`);
            params.push(name);
          }

          if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            params.push(description);
          }

          if (color !== undefined) {
            updates.push(`color = $${paramIndex++}`);
            params.push(color);
          }

          if (isActive !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            params.push(isActive);
          }

          if (updates.length > 0) {
            params.push(id);
            await client.query(
              `UPDATE roles SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
              params,
            );
          }

          // Actualizar permisos si se proporcionaron
          if (permissionIds !== undefined) {
            await client.query(
              `DELETE FROM role_permissions WHERE role_id = $1`,
              [id],
            );

            for (const permId of permissionIds) {
              await client.query(
                `INSERT INTO role_permissions (role_id, permission_id)
                 VALUES ($1, $2)
                 ON CONFLICT (role_id, permission_id) DO NOTHING`,
                [id, permId],
              );
            }
          }
        });

        return reply.code(200).send({
          success: true,
          message: "Rol actualizado exitosamente",
        });
      } catch (error) {
        if (error instanceof Error && error.message === "DUPLICATE_NAME") {
          return reply.code(409).send({
            success: false,
            error: "Ya existe otro rol con ese nombre",
          });
        }

        app.log.error(error, "Error actualizando rol");
        return reply.code(500).send({
          success: false,
          error: "Error actualizando rol",
        });
      }
    },
  );

  /**
   * DELETE /:id
   * Eliminar rol
   */
  app.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [authenticate, requirePermission("users.manage")] },
    async (request, reply) => {
      try {
        const { id } = request.params;

        // Verificar si el rol tiene usuarios asignados
        const usersCheck = await dbService.query(
          `SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1`,
          [id],
        );

        if (parseInt(usersCheck.rows[0].count) > 0) {
          return reply.code(400).send({
            success: false,
            error: "No se puede eliminar un rol que tiene usuarios asignados",
          });
        }

        const result = await dbService.query(
          `DELETE FROM roles WHERE id = $1`,
          [id],
        );

        if (result.rowCount === 0) {
          return reply
            .code(404)
            .send({ success: false, error: "Rol no encontrado" });
        }

        return reply.code(200).send({
          success: true,
          message: "Rol eliminado exitosamente",
        });
      } catch (error) {
        app.log.error(error, "Error eliminando rol");
        return reply.code(500).send({
          success: false,
          error: "Error eliminando rol",
        });
      }
    },
  );

  /**
   * GET /permissions/all
   * Listar todos los permisos disponibles (para formulario de roles)
   */
  app.get(
    "/permissions/all",
    {
      preHandler: [
        authenticate,
        requirePermission("users.view", "users.manage"),
      ],
    },
    async (_request, reply) => {
      try {
        const result = await dbService.query(
          `SELECT id, code, name, description, category
           FROM permissions
           WHERE is_active = true
           ORDER BY category, name`,
        );

        return reply.code(200).send({
          success: true,
          data: result.rows,
        });
      } catch (error) {
        app.log.error(error, "Error listando permisos");
        return reply.code(500).send({
          success: false,
          error: "Error obteniendo permisos",
        });
      }
    },
  );
}
