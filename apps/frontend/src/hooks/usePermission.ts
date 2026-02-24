/**
 * Hook centralizado para verificación de permisos.
 * Encapsula la lógica de autorización siguiendo error-handling y architecture-patterns.
 */

import { useCallback } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import type { PermissionCode } from "@/config/routePermissions";
import {
  getFirstAccessibleRoute,
  getRequiredPermissionsForPath,
} from "@/config/routePermissions";

/**
 * Hook para verificación de permisos y utilidades de autorización.
 */
export function usePermission() {
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const hasPermissionTyped = useCallback(
    (permission: PermissionCode | string): boolean => {
      return hasPermission(permission);
    },
    [hasPermission],
  );

  /** Verifica si el usuario tiene al menos uno de los permisos requeridos */
  const hasAnyPermission = useCallback(
    (permissions: PermissionCode[]): boolean => {
      if (!permissions.length) return true;
      return permissions.some((p) => hasPermission(p));
    },
    [hasPermission],
  );

  /** Obtiene la primera ruta accesible como fallback */
  const getFallbackRoute = useCallback((): string => {
    return getFirstAccessibleRoute(
      (p: PermissionCode) => hasPermission(p),
    );
  }, [hasPermission]);

  /** Obtiene permisos requeridos para un path */
  const getPermissionsForPath = useCallback((path: string): PermissionCode[] => {
    return getRequiredPermissionsForPath(path);
  }, []);

  return {
    hasPermission: hasPermissionTyped,
    hasAnyPermission,
    getFallbackRoute,
    getPermissionsForPath,
  };
}
