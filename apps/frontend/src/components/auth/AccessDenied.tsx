/**
 * Pantalla de Acceso Denegado.
 * Cumple Web Interface Guidelines: accesibilidad, mensajes con siguiente paso, focus visible.
 */

import React from "react";
import { Link } from "react-router-dom";

interface AccessDeniedProps {
  /** Ruta de fallback cuando el usuario no tiene permiso (ej: primera ruta accesible) */
  fallbackPath?: string;
  /** Mensaje descriptivo con siguiente paso (error-handling: mensajes significativos) */
  message?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  fallbackPath = "/dashboard",
  message = "No tiene permisos suficientes para acceder a esta sección. Use el enlace para ir a un área disponible.",
}) => {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
      role="main"
      aria-labelledby="access-denied-heading"
    >
      <div
        className="text-center p-8 max-w-md"
        role="alert"
        aria-live="polite"
        aria-atomic="true"
      >
        <div
          className="text-6xl mb-4"
          aria-hidden="true"
          role="img"
          aria-label="Acceso denegado"
        >
          🚫
        </div>
        <h1
          id="access-denied-heading"
          className="text-2xl font-bold text-white mb-2"
        >
          Acceso Denegado
        </h1>
        <p className="text-gray-400 mb-6">{message}</p>
        <Link
          to={fallbackPath}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 text-white rounded-lg transition-colors outline-none"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
};
