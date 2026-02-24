/**
 * Users Routes
 * CRUD completo de usuarios con autenticación y permisos
 */

import { FastifyInstance } from "fastify";
import { dbService } from "../database/dbService";
import { authService, AuthError } from "../services/authService";
import { authenticate, requirePermission } from "../middleware/authMiddleware";

interface CreateUserBody {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  password: string;
  roleIds: number[];
}

interface UpdateUserBody {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  password?: string;
  roleIds?: number[];
}

export default async function usersRoutes(app: FastifyInstance): Promise<void> {
  // Todos los endpoints requieren autenticación + permiso users.view o users.manage

  /**
   * GET /
   * Listar todos los usuarios con sus roles
   */
  app.get(
    "/",
    {
      preHandler: [
        authenticate,
        requirePermission("users.view", "users.manage"),
      ],
    },
    async (request, reply) => {
      try {
        const result = await dbService.query(
          `SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
                  u.is_active, u.email_verified, u.last_login,
                  u.created_at, u.updated_at,
                  COALESCE(
                    json_agg(
                      json_build_object('id', r.id, 'name', r.name, 'color', r.color)
                    ) FILTER (WHERE r.id IS NOT NULL),
                    '[]'
                  ) as roles
           FROM users u
           LEFT JOIN user_roles ur ON ur.user_id = u.id
           LEFT JOIN roles r ON r.id = ur.role_id AND r.is_active = true
           GROUP BY u.id
           ORDER BY u.created_at DESC`,
        );

        const users = result.rows.map((row) => ({
          id: row.id,
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          phone: row.phone,
          isActive: row.is_active,
          emailVerified: row.email_verified,
          lastLogin: row.last_login
            ? new Date(row.last_login).toISOString()
            : null,
          roles: row.roles,
          createdAt: new Date(row.created_at).toISOString(),
          updatedAt: new Date(row.updated_at).toISOString(),
        }));

        return reply.code(200).send({
          success: true,
          data: users,
        });
      } catch (error) {
        app.log.error(error, "Error listando usuarios");
        return reply.code(500).send({
          success: false,
          error: "Error obteniendo usuarios",
        });
      }
    },
  );

  /**
   * GET /:id
   * Detalle de un usuario
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
          `SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
                  u.is_active, u.email_verified, u.last_login,
                  u.created_at, u.updated_at
           FROM users u WHERE u.id = $1`,
          [id],
        );

        if (result.rows.length === 0) {
          return reply
            .code(404)
            .send({ success: false, error: "Usuario no encontrado" });
        }

        const user = result.rows[0];

        const rolesResult = await dbService.query(
          `SELECT r.id, r.name, r.color
           FROM roles r
           INNER JOIN user_roles ur ON ur.role_id = r.id
           WHERE ur.user_id = $1`,
          [id],
        );

        return reply.code(200).send({
          success: true,
          data: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone,
            isActive: user.is_active,
            emailVerified: user.email_verified,
            lastLogin: user.last_login
              ? new Date(user.last_login).toISOString()
              : null,
            roles: rolesResult.rows.map((r) => ({
              id: r.id,
              name: r.name,
              color: r.color,
            })),
            createdAt: new Date(user.created_at).toISOString(),
            updatedAt: new Date(user.updated_at).toISOString(),
          },
        });
      } catch (error) {
        app.log.error(error, "Error obteniendo usuario");
        return reply.code(500).send({
          success: false,
          error: "Error obteniendo usuario",
        });
      }
    },
  );

  /**
   * POST /
   * Crear nuevo usuario
   */
  app.post<{ Body: CreateUserBody }>(
    "/",
    { preHandler: [authenticate, requirePermission("users.manage")] },
    async (request, reply) => {
      try {
        const { email, firstName, lastName, phone, password, roleIds } =
          request.body;

        // Validaciones
        if (!email || !firstName || !lastName || !password) {
          return reply.code(400).send({
            success: false,
            error: "Email, nombre, apellido y password son requeridos",
          });
        }

        if (password.length < 8) {
          return reply.code(400).send({
            success: false,
            error: "La contraseña debe tener al menos 8 caracteres",
          });
        }

        // Verificar que el email no exista
        const existing = await dbService.query(
          `SELECT id FROM users WHERE email = $1`,
          [email],
        );

        if (existing.rows.length > 0) {
          return reply.code(409).send({
            success: false,
            error: "Ya existe un usuario con ese email",
          });
        }

        // Hash del password
        const passwordHash = await authService.hashPassword(password);

        // Insertar usuario en transacción
        const result = await dbService.transaction(async (client) => {
          const userResult = await client.query(
            `INSERT INTO users (email, first_name, last_name, phone, password_hash, email_verified)
             VALUES ($1, $2, $3, $4, $5, true)
             RETURNING id`,
            [email, firstName, lastName, phone || null, passwordHash],
          );

          const userId = userResult.rows[0].id;

          // Asignar roles
          if (roleIds && roleIds.length > 0) {
            for (const roleId of roleIds) {
              await client.query(
                `INSERT INTO user_roles (user_id, role_id, assigned_by)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, role_id) DO NOTHING`,
                [userId, roleId, request.user!.userId],
              );
            }
          }

          return userId;
        });

        return reply.code(201).send({
          success: true,
          data: { id: result },
          message: "Usuario creado exitosamente",
        });
      } catch (error) {
        app.log.error(error, "Error creando usuario");
        return reply.code(500).send({
          success: false,
          error: "Error creando usuario",
        });
      }
    },
  );

  /**
   * PUT /:id
   * Actualizar usuario existente
   */
  app.put<{ Params: { id: string }; Body: UpdateUserBody }>(
    "/:id",
    { preHandler: [authenticate, requirePermission("users.manage")] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { email, firstName, lastName, phone, password, roleIds } =
          request.body;

        // Verificar que el usuario existe
        const existing = await dbService.query(
          `SELECT id FROM users WHERE id = $1`,
          [id],
        );

        if (existing.rows.length === 0) {
          return reply
            .code(404)
            .send({ success: false, error: "Usuario no encontrado" });
        }

        await dbService.transaction(async (client) => {
          // Construir query dinámica de actualización
          const updates: string[] = [];
          const params: unknown[] = [];
          let paramIndex = 1;

          if (email !== undefined) {
            // Verificar unicidad del email
            const emailCheck = await client.query(
              `SELECT id FROM users WHERE email = $1 AND id != $2`,
              [email, id],
            );
            if (emailCheck.rows.length > 0) {
              throw new AuthError("Ya existe otro usuario con ese email", 409);
            }
            updates.push(`email = $${paramIndex++}`);
            params.push(email);
          }

          if (firstName !== undefined) {
            updates.push(`first_name = $${paramIndex++}`);
            params.push(firstName);
          }

          if (lastName !== undefined) {
            updates.push(`last_name = $${paramIndex++}`);
            params.push(lastName);
          }

          if (phone !== undefined) {
            updates.push(`phone = $${paramIndex++}`);
            params.push(phone || null);
          }

          if (password !== undefined && password.length > 0) {
            if (password.length < 8) {
              throw new AuthError(
                "La contraseña debe tener al menos 8 caracteres",
                400,
              );
            }
            const hash = await authService.hashPassword(password);
            updates.push(`password_hash = $${paramIndex++}`);
            params.push(hash);
          }

          if (updates.length > 0) {
            params.push(id);
            await client.query(
              `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
              params,
            );
          }

          // Actualizar roles si se proporcionaron
          if (roleIds !== undefined) {
            await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [
              id,
            ]);

            for (const roleId of roleIds) {
              await client.query(
                `INSERT INTO user_roles (user_id, role_id, assigned_by)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, role_id) DO NOTHING`,
                [id, roleId, request.user!.userId],
              );
            }
          }
        });

        return reply.code(200).send({
          success: true,
          message: "Usuario actualizado exitosamente",
        });
      } catch (error) {
        if (error instanceof AuthError) {
          return reply.code(error.statusCode).send({
            success: false,
            error: error.message,
          });
        }

        app.log.error(error, "Error actualizando usuario");
        return reply.code(500).send({
          success: false,
          error: "Error actualizando usuario",
        });
      }
    },
  );

  /**
   * DELETE /:id
   * Eliminar usuario
   */
  app.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [authenticate, requirePermission("users.manage")] },
    async (request, reply) => {
      try {
        const { id } = request.params;

        // No permitir eliminarse a sí mismo
        if (request.user && request.user.userId === parseInt(id)) {
          return reply.code(400).send({
            success: false,
            error: "No puedes eliminar tu propia cuenta",
          });
        }

        const result = await dbService.query(
          `DELETE FROM users WHERE id = $1`,
          [id],
        );

        if (result.rowCount === 0) {
          return reply
            .code(404)
            .send({ success: false, error: "Usuario no encontrado" });
        }

        return reply.code(200).send({
          success: true,
          message: "Usuario eliminado exitosamente",
        });
      } catch (error) {
        app.log.error(error, "Error eliminando usuario");
        return reply.code(500).send({
          success: false,
          error: "Error eliminando usuario",
        });
      }
    },
  );

  /**
   * PATCH /:id/toggle
   * Activar/desactivar usuario
   */
  app.patch<{ Params: { id: string } }>(
    "/:id/toggle",
    { preHandler: [authenticate, requirePermission("users.manage")] },
    async (request, reply) => {
      try {
        const { id } = request.params;

        // No permitir desactivarse a sí mismo
        if (request.user && request.user.userId === parseInt(id)) {
          return reply.code(400).send({
            success: false,
            error: "No puedes desactivar tu propia cuenta",
          });
        }

        const result = await dbService.query(
          `UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING is_active`,
          [id],
        );

        if (result.rowCount === 0) {
          return reply
            .code(404)
            .send({ success: false, error: "Usuario no encontrado" });
        }

        const newStatus = result.rows[0].is_active;

        // Si se desactiva el usuario, revocar todas sus sesiones
        if (!newStatus) {
          await authService.revokeAllSessions(parseInt(id));
        }

        return reply.code(200).send({
          success: true,
          data: { isActive: newStatus },
          message: newStatus ? "Usuario activado" : "Usuario desactivado",
        });
      } catch (error) {
        app.log.error(error, "Error toggling usuario");
        return reply.code(500).send({
          success: false,
          error: "Error cambiando estado del usuario",
        });
      }
    },
  );
}
