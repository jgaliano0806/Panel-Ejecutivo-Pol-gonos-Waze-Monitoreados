/**
 * Logger Centralizado para el Backend
 * Basado en skill logging-best-practices: Wide Events / Canonical Log Lines
 *
 * Ofrece una API consistente para logging estructurado en servicios
 * que no tienen acceso directo al logger de Fastify.
 *
 * Niveles: debug, info, warn, error
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface Logger {
  debug: (context: LogContext | string, message?: string) => void;
  info: (context: LogContext | string, message?: string) => void;
  warn: (context: LogContext | string, message?: string) => void;
  error: (context: LogContext | string, message?: string) => void;
  child: (bindings: LogContext) => Logger;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Nivel mínimo configurable via env
const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

/**
 * Formatea un objeto de contexto para salida legible
 */
function formatContext(context: LogContext): string {
  const filtered = Object.entries(context)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      if (typeof v === "object") {
        try {
          return `${k}=${JSON.stringify(v)}`;
        } catch {
          return `${k}=[object]`;
        }
      }
      return `${k}=${v}`;
    });
  return filtered.length > 0 ? ` ${filtered.join(" ")}` : "";
}

/**
 * Crea output JSON estructurado para producción
 */
function formatJSON(
  level: LogLevel,
  context: LogContext,
  message: string,
): string {
  return JSON.stringify({
    level,
    time: new Date().toISOString(),
    msg: message,
    ...context,
  });
}

/**
 * Crea output legible para desarrollo
 */
function formatPretty(
  level: LogLevel,
  context: LogContext,
  message: string,
): string {
  const emoji = {
    debug: "🔍",
    info: "✅",
    warn: "⚠️",
    error: "❌",
  }[level];

  return `${emoji} [${level.toUpperCase()}] ${message}${formatContext(context)}`;
}

/**
 * Determina si un nivel debe ser loggeado
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LEVEL];
}

/**
 * Crea una instancia de logger
 */
function createLogger(bindings: LogContext = {}): Logger {
  const log = (
    level: LogLevel,
    contextOrMessage: LogContext | string,
    message?: string,
  ) => {
    if (!shouldLog(level)) return;

    let context: LogContext;
    let msg: string;

    if (typeof contextOrMessage === "string") {
      context = bindings;
      msg = contextOrMessage;
    } else {
      context = { ...bindings, ...contextOrMessage };
      msg = message || "";
    }

    const output = IS_DEVELOPMENT
      ? formatPretty(level, context, msg)
      : formatJSON(level, context, msg);

    // Route to appropriate console method
    switch (level) {
      case "debug":
      case "info":
        console.log(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
        console.error(output);
        break;
    }
  };

  return {
    debug: (contextOrMessage, message) =>
      log("debug", contextOrMessage, message),
    info: (contextOrMessage, message) => log("info", contextOrMessage, message),
    warn: (contextOrMessage, message) => log("warn", contextOrMessage, message),
    error: (contextOrMessage, message) =>
      log("error", contextOrMessage, message),
    child: (childBindings) => createLogger({ ...bindings, ...childBindings }),
  };
}

// Logger raíz singleton
export const logger = createLogger();

// Factory para crear loggers con contexto (para servicios)
export function createServiceLogger(serviceName: string): Logger {
  return logger.child({ service: serviceName });
}

// Export types
export type { Logger, LogContext, LogLevel };
