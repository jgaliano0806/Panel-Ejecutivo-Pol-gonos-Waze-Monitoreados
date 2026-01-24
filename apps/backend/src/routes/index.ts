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
import tvtRoutes from "./tvt.routes";
import incidentsRoutes from "./incidents.routes";
import jamsRoutes from "./jams.routes";

/**
 * Registra todos los módulos de rutas en la instancia de Fastify
 */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // Health checks (sin prefijo para compatibilidad con orquestadores)
  await app.register(healthRoutes);

  // API de Catálogos
  await app.register(catalogsRoutes, { prefix: "/api/catalogs" });

  // Upload y Proxy de iconos
  await app.register(iconUploadRoutes);
  await app.register(iconProxyRoutes);

  // System Notifications
  await app.register(notificationRoutes, { prefix: "/api/notifications" });

  // Traffic View Tool Metrics
  await app.register(tvtRoutes, { prefix: "/api/tvt" });

  // Gestión de Incidentes (Histórico y Live)
  await app.register(incidentsRoutes, { prefix: "/api/incidents" });

  // Gestión de Jams (Congestión)
  await app.register(jamsRoutes, { prefix: "/api/jams" });

  // Aquí se agregarán más módulos de rutas:
  // await app.register(polygonsRoutes, { prefix: '/api/polygons' });
  // await app.register(weatherRoutes, { prefix: '/api/weather' });
  // await app.register(jamsRoutes, { prefix: '/api/jams' });
  // await app.register(kpisRoutes, { prefix: '/api/kpis' });
}

export { catalogsRoutes, healthRoutes, iconUploadRoutes };
