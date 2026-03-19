/**
 * Auth Service
 * Maneja hash de passwords, generación/verificación de JWT,
 * y gestión de sesiones para soporte multi-sesión.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { dbService } from "../database/dbService";
import { createServiceLogger } from "../utils/logger";

const log = createServiceLogger("AuthService");

// Configuración JWT
const JWT_SECRET =
  process.env.JWT_SECRET || "panel-waze-secret-key-change-in-production";
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "8h";
const BCRYPT_ROUNDS = 10;

export interface JWTPayload {
  userId: number;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
}

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin: string | null;
  mustChangePassword: boolean;
  avatarUrl: string | null;
  roles: Array<{ id: number; name: string; color: string }>;
  permissions: string[];
}

export interface SessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceInfo: string | null;
  isActive: boolean;
  lastActivity: string;
  expiresAt: string;
  createdAt: string;
}

class AuthService {
  /**
   * Hash de password con bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Verificar password contra hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generar hash SHA-256 de un token (para almacenar en DB)
   */
  hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Generar JWT con payload del usuario
   */
  generateToken(
    payload: Omit<JWTPayload, "sessionId">,
    sessionId: string,
  ): string {
    const tokenPayload: JWTPayload = {
      ...payload,
      sessionId,
    };

    const expiresInSeconds = Math.floor(parseExpiration(JWT_EXPIRATION) / 1000);

    return jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: expiresInSeconds,
    });
  }

  /**
   * Verificar y decodificar JWT
   */
  verifyToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  }

  /**
   * Login: verificar credenciales y crear sesión
   */
  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ token: string; user: AuthUser }> {
    // 1. Buscar usuario
    const userResult = await dbService.query(
      `SELECT id, email, first_name, last_name, phone, password_hash,
              is_active, email_verified, last_login, login_attempts, locked_until,
              must_change_password, avatar_url
       FROM users WHERE email = $1`,
      [email],
    );

    if (userResult.rows.length === 0) {
      throw new AuthError("Credenciales inválidas", 401);
    }

    const user = userResult.rows[0];

    // 2. Verificar si la cuenta está bloqueada
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new AuthError(
        "Cuenta bloqueada temporalmente. Intente más tarde.",
        423,
      );
    }

    // 3. Verificar si el usuario está activo
    if (!user.is_active) {
      throw new AuthError(
        "Cuenta desactivada. Contacte al administrador.",
        403,
      );
    }

    // 4. Verificar password
    if (!user.password_hash) {
      throw new AuthError("Esta cuenta no tiene password configurado.", 401);
    }

    const isValid = await this.verifyPassword(password, user.password_hash);
    if (!isValid) {
      // Incrementar intentos fallidos
      const newAttempts = (user.login_attempts || 0) + 1;
      const lockUntil =
        newAttempts >= 5
          ? new Date(Date.now() + 15 * 60 * 1000) // 15 minutos
          : null;

      await dbService.query(
        `UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3`,
        [newAttempts, lockUntil, user.id],
      );

      throw new AuthError("Credenciales inválidas", 401);
    }

    // 5. Resetear intentos fallidos y actualizar last_login
    await dbService.query(
      `UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = $1`,
      [user.id],
    );

    // 6. Obtener roles y permisos en paralelo
    const [rolesResult, permissionsResult] = await Promise.all([
      dbService.query(
        `SELECT r.id, r.name, r.color
         FROM roles r
         INNER JOIN user_roles ur ON ur.role_id = r.id
         WHERE ur.user_id = $1 AND r.is_active = true`,
        [user.id],
      ),
      dbService.query(
        `SELECT DISTINCT p.code
         FROM permissions p
         INNER JOIN role_permissions rp ON rp.permission_id = p.id
         INNER JOIN user_roles ur ON ur.role_id = rp.role_id
         WHERE ur.user_id = $1 AND p.is_active = true`,
        [user.id],
      ),
    ]);

    const roles = rolesResult.rows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
    }));
    const permissions = permissionsResult.rows.map((p) => p.code);

    // 7. Crear sesión
    const sessionId = crypto.randomUUID();

    // Calcular expiración basada en JWT_EXPIRATION
    const expiresInMs = parseExpiration(JWT_EXPIRATION);
    const expiresAt = new Date(Date.now() + expiresInMs);

    const token = this.generateToken(
      {
        userId: user.id,
        email: user.email,
        roles: roles.map((r) => r.name),
        permissions,
      },
      sessionId,
    );

    const tokenHash = this.hashToken(token);

    // Extraer info del dispositivo del user agent
    const deviceInfo = parseDeviceInfo(userAgent || "");

    await dbService.query(
      `INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, device_info, expires_at)
       VALUES ($1, $2, $3, $4::inet, $5, $6, $7)`,
      [
        sessionId,
        user.id,
        tokenHash,
        ipAddress || null,
        userAgent || null,
        deviceInfo,
        expiresAt,
      ],
    );

    log.info({ userId: user.id, sessionId, ip: ipAddress }, "Login exitoso");

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      lastLogin: new Date().toISOString(),
      mustChangePassword: user.must_change_password ?? false,
      avatarUrl: user.avatar_url || null,
      roles,
      permissions,
    };

    return { token, user: authUser };
  }

  /**
   * Obtener usuario autenticado actual
   * Optimizado: una sola query con JOINs en vez de 3 queries separadas
   */
  async getCurrentUser(userId: number): Promise<AuthUser> {
    const result = await dbService.query(
      `SELECT
         u.id, u.email, u.first_name, u.last_name, u.phone,
         u.is_active, u.email_verified, u.last_login,
         u.must_change_password, u.avatar_url,
         COALESCE(
           json_agg(DISTINCT jsonb_build_object('id', r.id, 'name', r.name, 'color', r.color))
           FILTER (WHERE r.id IS NOT NULL), '[]'
         ) AS roles,
         COALESCE(
           json_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), '[]'
         ) AS permissions
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id AND r.is_active = true
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id AND p.is_active = true
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId],
    );

    if (result.rows.length === 0) {
      throw new AuthError("Usuario no encontrado", 404);
    }

    const user = result.rows[0];

    return {
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
      mustChangePassword: user.must_change_password ?? false,
      avatarUrl: user.avatar_url || null,
      roles: user.roles,
      permissions: user.permissions,
    };
  }

  /**
   * Logout: revocar sesión actual
   */
  async logout(sessionId: string): Promise<void> {
    await dbService.query(
      `UPDATE user_sessions SET is_active = false WHERE id = $1`,
      [sessionId],
    );
    log.info({ sessionId }, "Sesión revocada");
  }

  /**
   * Verificar si una sesión está activa
   */
  async isSessionActive(
    sessionId: string,
    tokenHash: string,
  ): Promise<boolean> {
    const result = await dbService.query(
      `SELECT id FROM user_sessions
       WHERE id = $1 AND token_hash = $2 AND is_active = true AND expires_at > NOW()`,
      [sessionId, tokenHash],
    );

    if (result.rows.length > 0) {
      // Fire-and-forget: no bloquear la respuesta por actualizar last_activity
      dbService
        .query(`UPDATE user_sessions SET last_activity = NOW() WHERE id = $1`, [
          sessionId,
        ])
        .catch(() => {
          /* silenciar errores del update no-crítico */
        });
      return true;
    }

    return false;
  }

  /**
   * Listar sesiones activas de un usuario
   */
  async getActiveSessions(userId: number): Promise<SessionInfo[]> {
    const result = await dbService.query(
      `SELECT id, ip_address, user_agent, device_info, is_active,
              last_activity, expires_at, created_at
       FROM user_sessions
       WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
       ORDER BY last_activity DESC`,
      [userId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      deviceInfo: row.device_info,
      isActive: row.is_active,
      lastActivity: new Date(row.last_activity).toISOString(),
      expiresAt: new Date(row.expires_at).toISOString(),
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }

  /**
   * Revocar una sesión específica
   */
  async revokeSession(sessionId: string, userId: number): Promise<void> {
    const result = await dbService.query(
      `UPDATE user_sessions SET is_active = false WHERE id = $1 AND user_id = $2`,
      [sessionId, userId],
    );

    if (result.rowCount === 0) {
      throw new AuthError("Sesión no encontrada", 404);
    }

    log.info({ sessionId, userId }, "Sesión revocada por usuario");
  }

  /**
   * Revocar todas las sesiones de un usuario (excepto la actual)
   */
  async revokeAllSessions(
    userId: number,
    exceptSessionId?: string,
  ): Promise<number> {
    let query = `UPDATE user_sessions SET is_active = false WHERE user_id = $1 AND is_active = true`;
    const params: unknown[] = [userId];

    if (exceptSessionId) {
      query += ` AND id != $2`;
      params.push(exceptSessionId);
    }

    const result = await dbService.query(query, params);
    log.info({ userId, revoked: result.rowCount }, "Sesiones revocadas");
    return result.rowCount || 0;
  }

  /**
   * Limpiar sesiones expiradas (mantenimiento)
   */
  async cleanExpiredSessions(): Promise<number> {
    const result = await dbService.query(
      `DELETE FROM user_sessions WHERE expires_at < NOW() OR (is_active = false AND created_at < NOW() - INTERVAL '7 days')`,
    );
    return result.rowCount || 0;
  }

  /**
   * Cambiar contraseña del usuario autenticado
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    // 1. Obtener hash actual
    const userResult = await dbService.query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [userId],
    );
    if (userResult.rows.length === 0) {
      throw new AuthError("Usuario no encontrado", 404);
    }

    const { password_hash } = userResult.rows[0];
    if (!password_hash) {
      throw new AuthError("Esta cuenta no tiene password configurado.", 400);
    }

    // 2. Verificar password actual
    const isValid = await this.verifyPassword(currentPassword, password_hash);
    if (!isValid) {
      throw new AuthError("La contraseña actual es incorrecta", 401);
    }

    // 3. Validar nueva contraseña
    if (newPassword.length < 8) {
      throw new AuthError(
        "La nueva contraseña debe tener al menos 8 caracteres",
        400,
      );
    }

    // 4. Hashear y guardar
    const newHash = await this.hashPassword(newPassword);
    await dbService.query(
      `UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2`,
      [newHash, userId],
    );

    log.info({ userId }, "Contraseña cambiada exitosamente");
  }

  /**
   * Actualizar perfil del usuario autenticado
   */
  async updateProfile(
    userId: number,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
    },
  ): Promise<void> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.firstName !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      params.push(data.firstName);
    }
    if (data.lastName !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      params.push(data.lastName);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      params.push(data.phone || null);
    }
    if (data.email !== undefined) {
      // Verificar unicidad del email
      const emailCheck = await dbService.query(
        `SELECT id FROM users WHERE email = $1 AND id != $2`,
        [data.email, userId],
      );
      if (emailCheck.rows.length > 0) {
        throw new AuthError("Ya existe otro usuario con ese email", 409);
      }
      updates.push(`email = $${paramIndex++}`);
      params.push(data.email);
    }

    if (updates.length === 0) {
      return;
    }

    params.push(userId);
    await dbService.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      params,
    );

    log.info({ userId }, "Perfil actualizado");
  }

  /**
   * Actualizar avatar del usuario
   */
  async updateAvatar(userId: number, avatarUrl: string): Promise<void> {
    await dbService.query(`UPDATE users SET avatar_url = $1 WHERE id = $2`, [
      avatarUrl,
      userId,
    ]);
    log.info({ userId, avatarUrl }, "Avatar actualizado");
  }
}

/**
 * Error personalizado para autenticación
 */
export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Parsear duración de expiración JWT (ej: '8h', '30d', '1y')
 */
function parseExpiration(exp: string): number {
  const match = exp.match(/^(\d+)([smhd])$/);
  if (!match) return 8 * 60 * 60 * 1000; // default 8h

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 8 * 60 * 60 * 1000;
  }
}

/**
 * Extraer información del dispositivo desde el User-Agent
 */
function parseDeviceInfo(userAgent: string): string {
  if (!userAgent) return "Desconocido";

  if (userAgent.includes("Mobile") || userAgent.includes("Android"))
    return "Móvil";
  if (userAgent.includes("Tablet") || userAgent.includes("iPad"))
    return "Tablet";
  if (userAgent.includes("Windows")) return "Windows PC";
  if (userAgent.includes("Macintosh") || userAgent.includes("Mac OS"))
    return "Mac";
  if (userAgent.includes("Linux")) return "Linux PC";

  return "Navegador Web";
}

// Exportar instancia singleton
export const authService = new AuthService();
