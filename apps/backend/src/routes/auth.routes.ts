/**
 * Auth Routes
 * Endpoints de autenticación: login, logout, me, sesiones
 */

import { FastifyInstance } from "fastify";
import { authService, AuthError } from "../services/authService";
import { authenticate } from "../middleware/authMiddleware";

interface LoginBody {
  email: string;
  password: string;
}

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /login
   * Autenticación con email + password
   */
  app.post<{ Body: LoginBody }>("/login", async (request, reply) => {
    try {
      const { email, password } = request.body;

      if (!email || !password) {
        return reply.code(400).send({
          success: false,
          error: "Email y password son requeridos",
        });
      }

      const ipAddress = request.ip;
      const userAgent = request.headers["user-agent"] || "";

      const result = await authService.login(
        email,
        password,
        ipAddress,
        userAgent,
      );

      return reply.code(200).send({
        success: true,
        data: {
          token: result.token,
          user: result.user,
        },
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.code(error.statusCode).send({
          success: false,
          error: error.message,
        });
      }

      app.log.error(error, "Error en login");
      return reply.code(500).send({
        success: false,
        error: "Error interno del servidor",
      });
    }
  });

  /**
   * POST /logout
   * Revocar sesión actual
   */
  app.post(
    "/logout",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply
            .code(401)
            .send({ success: false, error: "No autenticado" });
        }

        await authService.logout(request.user.sessionId);

        return reply.code(200).send({
          success: true,
          message: "Sesión cerrada exitosamente",
        });
      } catch (error) {
        app.log.error(error, "Error en logout");
        return reply.code(500).send({
          success: false,
          error: "Error cerrando sesión",
        });
      }
    },
  );

  /**
   * GET /me
   * Obtener usuario autenticado con roles y permisos
   */
  app.get("/me", { preHandler: [authenticate] }, async (request, reply) => {
    try {
      if (!request.user) {
        return reply
          .code(401)
          .send({ success: false, error: "No autenticado" });
      }

      const user = await authService.getCurrentUser(request.user.userId);

      return reply.code(200).send({
        success: true,
        data: user,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.code(error.statusCode).send({
          success: false,
          error: error.message,
        });
      }

      app.log.error(error, "Error obteniendo usuario actual");
      return reply.code(500).send({
        success: false,
        error: "Error obteniendo información del usuario",
      });
    }
  });

  /**
   * GET /sessions
   * Listar sesiones activas del usuario autenticado
   */
  app.get(
    "/sessions",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply
            .code(401)
            .send({ success: false, error: "No autenticado" });
        }

        const sessions = await authService.getActiveSessions(
          request.user.userId,
        );

        return reply.code(200).send({
          success: true,
          data: sessions,
          meta: {
            currentSessionId: request.user.sessionId,
          },
        });
      } catch (error) {
        app.log.error(error, "Error listando sesiones");
        return reply.code(500).send({
          success: false,
          error: "Error obteniendo sesiones",
        });
      }
    },
  );

  /**
   * DELETE /sessions/:id
   * Revocar una sesión específica
   */
  app.delete<{ Params: { id: string } }>(
    "/sessions/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply
            .code(401)
            .send({ success: false, error: "No autenticado" });
        }

        await authService.revokeSession(request.params.id, request.user.userId);

        return reply.code(200).send({
          success: true,
          message: "Sesión revocada exitosamente",
        });
      } catch (error) {
        if (error instanceof AuthError) {
          return reply.code(error.statusCode).send({
            success: false,
            error: error.message,
          });
        }

        app.log.error(error, "Error revocando sesión");
        return reply.code(500).send({
          success: false,
          error: "Error revocando sesión",
        });
      }
    },
  );

  /**
   * POST /sessions/revoke-all
   * Revocar todas las sesiones excepto la actual
   */
  app.post(
    "/sessions/revoke-all",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply
            .code(401)
            .send({ success: false, error: "No autenticado" });
        }

        const count = await authService.revokeAllSessions(
          request.user.userId,
          request.user.sessionId,
        );

        return reply.code(200).send({
          success: true,
          message: `${count} sesiones cerradas`,
          data: { revokedCount: count },
        });
      } catch (error) {
        app.log.error(error, "Error revocando sesiones");
        return reply.code(500).send({
          success: false,
          error: "Error cerrando sesiones",
        });
      }
    },
  );

  /**
   * POST /change-password
   * Cambiar contraseña del usuario autenticado
   */
  app.post<{ Body: { currentPassword: string; newPassword: string } }>(
    "/change-password",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply
            .code(401)
            .send({ success: false, error: "No autenticado" });
        }

        const { currentPassword, newPassword } = request.body;

        if (!currentPassword || !newPassword) {
          return reply.code(400).send({
            success: false,
            error: "Contraseña actual y nueva son requeridas",
          });
        }

        await authService.changePassword(
          request.user.userId,
          currentPassword,
          newPassword,
        );

        return reply.code(200).send({
          success: true,
          message: "Contraseña cambiada exitosamente",
        });
      } catch (error) {
        if (error instanceof AuthError) {
          return reply.code(error.statusCode).send({
            success: false,
            error: error.message,
          });
        }

        app.log.error(error, "Error cambiando contraseña");
        return reply.code(500).send({
          success: false,
          error: "Error cambiando contraseña",
        });
      }
    },
  );

  /**
   * PUT /profile
   * Actualizar datos personales del usuario autenticado
   */
  app.put<{
    Body: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
    };
  }>("/profile", { preHandler: [authenticate] }, async (request, reply) => {
    try {
      if (!request.user) {
        return reply
          .code(401)
          .send({ success: false, error: "No autenticado" });
      }

      const { firstName, lastName, phone, email } = request.body;

      await authService.updateProfile(request.user.userId, {
        firstName,
        lastName,
        phone,
        email,
      });

      // Devolver usuario actualizado
      const updatedUser = await authService.getCurrentUser(request.user.userId);

      return reply.code(200).send({
        success: true,
        message: "Perfil actualizado exitosamente",
        data: updatedUser,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.code(error.statusCode).send({
          success: false,
          error: error.message,
        });
      }

      app.log.error(error, "Error actualizando perfil");
      return reply.code(500).send({
        success: false,
        error: "Error actualizando perfil",
      });
    }
  });

  /**
   * POST /avatar
   * Subir imagen de avatar del usuario autenticado
   */
  app.post(
    "/avatar",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply
            .code(401)
            .send({ success: false, error: "No autenticado" });
        }

        const data = await request.file();
        if (!data) {
          return reply.code(400).send({
            success: false,
            error: "No se proporcionó un archivo",
          });
        }

        // Validar tipo de archivo
        const allowedMimes = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
        ];
        if (!allowedMimes.includes(data.mimetype)) {
          return reply.code(400).send({
            success: false,
            error: "Tipo de archivo no permitido. Use JPEG, PNG, WebP o GIF.",
          });
        }

        // Crear directorio si no existe
        const fs = await import("fs");
        const path = await import("path");
        const avatarsDir = path.join(__dirname, "../../public/avatars");
        if (!fs.existsSync(avatarsDir)) {
          fs.mkdirSync(avatarsDir, { recursive: true });
        }

        // Guardar archivo con nombre único
        const ext = data.mimetype.split("/")[1] || "jpg";
        const fileName = `user_${request.user.userId}_${Date.now()}.${ext}`;
        const filePath = path.join(avatarsDir, fileName);

        const fileBuffer = await data.toBuffer();
        fs.writeFileSync(filePath, fileBuffer);

        // URL relativa para servir desde /public/
        const avatarUrl = `/public/avatars/${fileName}`;

        await authService.updateAvatar(request.user.userId, avatarUrl);

        return reply.code(200).send({
          success: true,
          message: "Avatar actualizado exitosamente",
          data: { avatarUrl },
        });
      } catch (error) {
        app.log.error(error, "Error subiendo avatar");
        return reply.code(500).send({
          success: false,
          error: "Error subiendo avatar",
        });
      }
    },
  );
}
