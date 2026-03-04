/**
 * Configuración centralizada de rutas y permisos por rol.
 * Permisos organizados por módulo con capacidades granulares.
 *
 * Módulos:
 * - Mapa y Zonas: map.view (solo visualización)
 * - Notificaciones: notifications.view (solo visualización)
 * - Siniestros Viales: accidents.view, accidents.create, accidents.export
 * - Incidentes: incidents.view, incidents.export
 * - Administración: admin (acceso total)
 *
 * Roles por defecto:
 * - Administrador: todos los permisos
 * - Supervisor: todo excepto admin
 * - Operador: map.view, notifications.view, accidents.view, accidents.create, incidents.view
 * - Visualizador: map.view, notifications.view, accidents.view, incidents.view
 */

/** Códigos de permiso del sistema (type-safe) */
export type PermissionCode =
  | "admin"
  | "map.view"
  | "notifications.view"
  | "accidents.view"
  | "accidents.create"
  | "accidents.export"
  | "incidents.view"
  | "incidents.export";

export const ROUTE_PERMISSIONS = {
  /** Mapa y Zonas — solo visualización */
  mapa: "map.view" as PermissionCode,

  /** Notificaciones — solo visualización */
  notificaciones: "notifications.view" as PermissionCode,

  /** Siniestros Viales — ver siniestros */
  siniestros: "accidents.view" as PermissionCode,

  /** Módulo de Incidentes — ver incidentes */
  incidentes: "incidents.view" as PermissionCode,

  /** Administración — acceso total */
  admin: "admin" as PermissionCode,
} as const;

export type RouteKey = keyof typeof ROUTE_PERMISSIONS;

/** Rutas ordenadas por prioridad para fallback (primera accesible) */
export const FALLBACK_ROUTES: readonly string[] = [
  "/mapa",
  "/siniestros",
  "/incidentes",
  "/notificaciones",
] as const;

/** Mapa path → permiso requerido */
export const PATH_TO_PERMISSION: Record<string, PermissionCode> = {
  "/": ROUTE_PERMISSIONS.mapa,
  "/dashboard": ROUTE_PERMISSIONS.mapa,
  "/mapa": ROUTE_PERMISSIONS.mapa,
  "/notificaciones": ROUTE_PERMISSIONS.notificaciones,
  "/siniestros": ROUTE_PERMISSIONS.siniestros,
  "/incidentes": ROUTE_PERMISSIONS.incidentes,
  "/admin": ROUTE_PERMISSIONS.admin,
};

/**
 * Obtiene los permisos requeridos para una ruta (array para requiredPermissions).
 * @param path - Ruta (ej: /admin, /mapa)
 * @returns Array con el permiso requerido, o [] si la ruta no requiere permiso específico
 */
export function getRequiredPermissionsForPath(path: string): PermissionCode[] {
  const normalized = path.replace(/\/$/, "") || "/";
  const perm = PATH_TO_PERMISSION[normalized] ?? PATH_TO_PERMISSION[path];
  return perm ? [perm] : [];
}

/**
 * Obtiene la primera ruta accesible según los permisos del usuario.
 * Usado como fallback cuando el usuario no tiene permiso para la ruta solicitada.
 */
export function getFirstAccessibleRoute(
  hasPermission: (perm: PermissionCode) => boolean,
): string {
  for (const path of FALLBACK_ROUTES) {
    const perm = PATH_TO_PERMISSION[path];
    if (perm && hasPermission(perm)) return path;
  }
  return "/mapa";
}
