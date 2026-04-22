/**
 * ProtectedRoute
 * Componente wrapper que verifica autenticación y permisos antes de renderizar.
 * Redirige a /login si no hay sesión activa.
 * Muestra "Acceso Denegado" con fallback inteligente si faltan permisos.
 * Muestra modal obligatorio de cambio de contraseña si mustChangePassword === true.
 */

import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";
import { usePermission } from "../../hooks/usePermission";
import { AccessDenied } from "./AccessDenied";
import { ChangePasswordModal } from "./ChangePasswordModal";
import type { PermissionCode } from "../../config/routePermissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Permisos requeridos: el usuario debe tener al menos uno */
  requiredPermissions?: PermissionCode[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions,
}) => {
  // Selectores finos para minimizar re-renders (este componente envuelve cada ruta)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const checkSession = useAuthStore((s) => s.checkSession);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { getFallbackRoute } = usePermission();

  useEffect(() => {
    // Solo verificar si aún no está autenticado (evita llamadas extra en navegación entre páginas)
    if (!isAuthenticated) {
      checkSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
        role="status"
        aria-live="polite"
        aria-label="Verificando sesión"
      >
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4 motion-safe:animate-spin"
            aria-hidden="true"
          />
          <p className="text-gray-400 text-sm">Verificando sesión…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasRequired = requiredPermissions.some((perm) => hasPermission(perm));
    if (!hasRequired) {
      return (
        <AccessDenied
          fallbackPath={getFallbackRoute()}
          message="No tiene permisos suficientes para acceder a esta sección. Use el enlace para ir a un área disponible."
        />
      );
    }
  }

  return (
    <>
      {children}
      {user.mustChangePassword && <ChangePasswordModal forced />}
    </>
  );
};
