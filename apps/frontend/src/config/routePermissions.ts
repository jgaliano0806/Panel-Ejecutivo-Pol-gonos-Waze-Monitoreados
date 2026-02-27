/**
 * Configuración centralizada de rutas y permisos por rol.
 * Garantiza que cada módulo respete la configuración de roles (migración 004).
 *
 * Permisos del sistema:
 * - admin: Acceso completo
 * - incidents.view: Ver incidentes, mapa, alertas, historial
 * - incidents.manage: Gestionar incidentes (crear/editar)
 * - reports.view: Ver estadísticas y reportes
 * - users.view: Ver usuarios
 * - users.manage: Gestionar usuarios y roles
 * - catalogs.manage: Gestionar catálogos
 * - settings.manage: Gestionar configuración
 *
 * Roles por defecto:
 * - Administrador: todos los permisos
 * - Supervisor: users.view, reports.view, incidents.manage
 * - Operador: incidents.view, reports.view
 * - Visualizador: incidents.view
 */

/** Códigos de permiso del sistema (type-safe) */
export type PermissionCode =
  | "admin"
  | "incidents.view"
  | "incidents.manage"
  | "reports.view"
  | "users.view"
  | "users.manage"
  | "catalogs.manage"
  | "settings.manage";

export const ROUTE_PERMISSIONS = {
  /** Dashboard principal, mapa, alertas - requiere ver incidentes */
  home: "incidents.view",
  mapa: "incidents.view",
  alertas: "incidents.view",
  dashboard: "incidents.view",

  /** Notificaciones - ligadas a incidentes/alertas */
  notificaciones: "incidents.view",

  /** Siniestros, incidentes - datos de incidentes */
  siniestros: "incidents.view",
  incidentes: "incidents.view",

  /** Estadísticas y análisis de riesgos - reportes */
  estadisticas: "reports.view",
  riesgos: "reports.view",

  /** Panel de administración - solo admin */
  admin: "admin",
} as const satisfies Record<string, PermissionCode>;

export type RouteKey = keyof typeof ROUTE_PERMISSIONS;

/** Rutas ordenadas por prioridad para fallback (primera accesible) */
export const FALLBACK_ROUTES: readonly string[] = [
  "/",
  "/dashboard",
  "/mapa",
  "/alertas",
  "/incidentes",
  "/estadisticas",
  "/riesgos",
] as const;

/** Mapa path → permiso requerido (al menos uno) */
export const PATH_TO_PERMISSION: Record<string, PermissionCode> = {
  "/": ROUTE_PERMISSIONS.home,
  "/dashboard": ROUTE_PERMISSIONS.dashboard,
  "/mapa": ROUTE_PERMISSIONS.mapa,
  "/alertas": ROUTE_PERMISSIONS.alertas,
  "/notificaciones": ROUTE_PERMISSIONS.notificaciones,
  "/siniestros": ROUTE_PERMISSIONS.siniestros,
  "/incidentes": ROUTE_PERMISSIONS.incidentes,
  "/estadisticas": ROUTE_PERMISSIONS.estadisticas,
  "/riesgos": ROUTE_PERMISSIONS.riesgos,
  "/admin": ROUTE_PERMISSIONS.admin,
};

/**
 * Obtiene los permisos requeridos para una ruta (array para requiredPermissions).
 * @param path - Ruta (ej: /admin, /estadisticas)
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
  return "/dashboard";
}
