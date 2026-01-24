/**
 * ErrorBoundary - Componente de Manejo de Errores React
 * Mejorado siguiendo error-handling-patterns skill
 *
 * Características:
 * - Captura errores de renderizado en componentes hijos
 * - UI de fallback personalizable
 * - Callback onError para logging externo
 * - Soporte dark mode
 * - Botón de reintentar/recargar
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ErrorBoundaryProps {
  /** Componentes hijos a proteger */
  children: ReactNode;
  /** UI de fallback personalizada (opcional) */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Callback cuando ocurre un error */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Nombre del componente/sección para identificación */
  name?: string;
  /** Si es true, muestra botón de volver al inicio */
  showHomeButton?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ============================================================================
// Error Boundary Class Component
// ============================================================================

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(
    error: Error,
  ): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log en desarrollo
    if (import.meta.env.DEV) {
      console.error(
        `[ErrorBoundary${this.props.name ? `: ${this.props.name}` : ""}] Uncaught error:`,
        error,
      );
      console.error("Component Stack:", errorInfo.componentStack);
    }

    // Callback para logging externo (ej: Sentry)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      // Fallback personalizado
      if (this.props.fallback) {
        if (typeof this.props.fallback === "function") {
          return this.props.fallback(this.state.error!, this.handleReset);
        }
        return this.props.fallback;
      }

      // UI de fallback por defecto
      return (
        <div className="min-h-[200px] flex items-center justify-center bg-red-50 dark:bg-red-900/10 p-4 rounded-xl">
          <div className="max-w-lg w-full bg-white dark:bg-veltrix-card rounded-lg shadow-xl overflow-hidden border border-red-200 dark:border-red-800">
            <div className="bg-red-600 dark:bg-red-700 px-6 py-4">
              <h1 className="text-white text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {this.props.name
                  ? `Error en ${this.props.name}`
                  : "Algo salió mal"}
              </h1>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 dark:text-veltrix-muted mb-2">
                  Ha ocurrido un error inesperado. Puedes intentar recargar la
                  sección o la página.
                </p>

                {import.meta.env.DEV && this.state.error && (
                  <pre className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md text-red-800 dark:text-red-300 font-mono text-xs whitespace-pre-wrap break-words border border-red-100 dark:border-red-800 mt-3">
                    {this.state.error.message}
                  </pre>
                )}
              </div>

              {import.meta.env.DEV && this.state.errorInfo && (
                <details className="mb-4">
                  <summary className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-white">
                    Ver Stack Trace
                  </summary>
                  <div className="bg-gray-50 dark:bg-veltrix-bg p-3 rounded-md text-gray-700 dark:text-gray-300 font-mono text-xs overflow-auto max-h-48 border border-gray-200 dark:border-veltrix-border mt-2">
                    <pre>{this.state.errorInfo.componentStack}</pre>
                  </div>
                </details>
              )}

              <div className="flex gap-3 justify-end">
                {this.props.showHomeButton && (
                  <button
                    onClick={this.handleGoHome}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-veltrix-bg text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-veltrix-border transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    Inicio
                  </button>
                )}
                <button
                  onClick={this.handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reintentar
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  Recargar Página
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Section Error Boundary - Para secciones individuales
// ============================================================================

export interface SectionErrorBoundaryProps {
  children: ReactNode;
  sectionName: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * Error Boundary ligero para secciones individuales
 * Muestra un mensaje compacto sin romper toda la página
 */
export class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(
    error: Error,
  ): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error(`[SectionErrorBoundary: ${this.props.sectionName}]`, error);
    }
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span className="text-amber-800 dark:text-amber-300 font-medium">
                Error cargando {this.props.sectionName}
              </span>
            </div>
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-md hover:bg-amber-200 dark:hover:bg-amber-800/30 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reintentar
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-mono">
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Default export para compatibilidad
export default ErrorBoundary;
