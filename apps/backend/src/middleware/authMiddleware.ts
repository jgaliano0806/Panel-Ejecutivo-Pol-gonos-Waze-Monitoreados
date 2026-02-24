/**
 * Auth Middleware
 * Hook preHandler de Fastify para validar JWT y decorar request.user
 * Soporta verificación de permisos granulares.
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { authService, AuthError, JWTPayload } from "../services/authService";
import { createServiceLogger } from "../utils/logger";

const log = createServiceLogger("AuthMiddleware");

// Extender tipos de Fastify para incluir `user` en request
declare module "fastify" {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

/**
 * Middleware de autenticación — verifica JWT y sesión activa
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      reply.code(401).send({
        success: false,
        error: "Token de autenticación requerido",
      });
      return;
    }

    const token = authHeader.substring(7);

    // Verificar JWT
    let payload: JWTPayload;
    try {
      payload = authService.verifyToken(token);
    } catch {
      reply.code(401).send({
        success: false,
        error: "Token inválido o expirado",
      });
      return;
    }

    // Verificar que la sesión esté activa en DB
    const tokenHash = authService.hashToken(token);
    const isActive = await authService.isSessionActive(
      payload.sessionId,
      tokenHash,
    );

    if (!isActive) {
      reply.code(401).send({
        success: false,
        error: "Sesión expirada o revocada",
      });
      return;
    }

    // Decorar request con datos del usuario
    request.user = payload;
  } catch (error) {
    log.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Error en autenticación",
    );

    if (error instanceof AuthError) {
      reply.code(error.statusCode).send({
        success: false,
        error: error.message,
      });
      return;
    }

    reply.code(500).send({
      success: false,
      error: "Error interno de autenticación",
    });
  }
}

/**
 * Factory de middleware para verificar permisos específicos
 * Uso: { preHandler: [authenticate, requirePermission('users.manage')] }
 */
export function requirePermission(...requiredPermissions: string[]) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    if (!request.user) {
      reply.code(401).send({
        success: false,
        error: "No autenticado",
      });
      return;
    }

    // Admin tiene todos los permisos
    if (request.user.permissions.includes("admin")) {
      return;
    }

    const hasPermission = requiredPermissions.some((perm) =>
      request.user!.permissions.includes(perm),
    );

    if (!hasPermission) {
      reply.code(403).send({
        success: false,
        error: "No tiene permisos suficientes para esta acción",
      });
      return;
    }
  };
}
