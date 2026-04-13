/**
 * Índice de Rutas del API
 * Centraliza el registro de todos los módulos de rutas
 * Siguiendo nodejs-backend-patterns y architecture-patterns
 */

import { FastifyInstance } from "fastify";
import catalogsRoutes from "./catalogs.routes";
import healthRoutes from "./health.routes";
import { iconUploadRoutes } from "./iconUploadRoute";
import { iconProxyRoutes } from "./iconProxy.routes";
import { notificationRoutes } from "./notificationRoutes";
import polygonsRoutes from "./polygons.routes";
import polygonGroupsRoutes from "./polygonGroups.routes";
import incidentsRoutes from "./incidents.routes";
import jamsRoutes from "./jams.routes";
import ttsRoutes from "./tts.routes";
import riskRoutes from "./risk.routes";
import authRoutes from "./auth.routes";
import usersRoutes from "./users.routes";
import rolesRoutes from "./roles.routes";
import kilometerMarkersRoutes from "./kilometerMarkers.routes";
import tileProxyRoutes from "./tileProxy.routes";
import dangerZonesRoutes from "./dangerZones.routes";

/**
 * Registra todos los módulos de rutas en la instancia de Fastify
 */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // Health checks (sin prefijo para compatibilidad con orquestadores)
  await app.register(healthRoutes);

  // Proxy de tiles (CARTO, OSM) - para producción cuando serve no tiene proxy
  await app.register(tileProxyRoutes);

  // Autenticación (login, logout, sesiones)
  await app.register(authRoutes, { prefix: "/api/auth" });

  // CRUD de Usuarios
  await app.register(usersRoutes, { prefix: "/api/users" });

  // CRUD de Roles y Permisos
  await app.register(rolesRoutes, { prefix: "/api/roles" });

  // API de Catálogos
  await app.register(catalogsRoutes, { prefix: "/api/catalogs" });

  // Upload y Proxy de iconos
  await app.register(iconUploadRoutes);
  await app.register(iconProxyRoutes);

  // System Notifications
  await app.register(notificationRoutes, { prefix: "/api/notifications" });

  // Gestión de Polígonos
  await app.register(polygonsRoutes, { prefix: "/api/polygons" });
  await app.register(polygonGroupsRoutes, { prefix: "/api/polygon-groups" });

  // Gestión de Incidentes (Histórico y Live)
  await app.register(incidentsRoutes, { prefix: "/api/incidents" });

  // Gestión de Jams (Congestión y Métricas)
  await app.register(jamsRoutes, { prefix: "/api/jams" });

  // Text-to-Speech (voces neuronales gratuitas)
  await app.register(ttsRoutes, { prefix: "/api/tts" });

  // Risk Scoring Dashboard
  await app.register(riskRoutes, { prefix: "/api/risk" });

  // Hitos Kilométricos
  await app.register(kilometerMarkersRoutes, { prefix: "/api/kilometers" });

  // Zonas Peligrosas
  await app.register(dangerZonesRoutes, { prefix: "/api/danger-zones" });
}

export { catalogsRoutes, healthRoutes, iconUploadRoutes };
