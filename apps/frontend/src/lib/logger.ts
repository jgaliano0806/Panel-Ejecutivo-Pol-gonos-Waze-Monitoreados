/**
 * Logger condicional por entorno para el frontend.
 *
 * En desarrollo: muestra todos los logs (debug, info, warn, error)
 * En producción: solo muestra warn y error
 *
 * Uso:
 *   import { logger } from '@/lib/logger';
 *   logger.debug('Detalle técnico', { data });  // Solo en dev
 *   logger.info('Evento importante', { data });  // Solo en dev
 *   logger.warn('Advertencia', { data });         // Siempre
 *   logger.error('Error crítico', { data });      // Siempre
 */

const isDev =
  import.meta.env?.DEV ??
  (typeof process !== "undefined" && process.env?.NODE_ENV === "development");

type LogData = Record<string, unknown>;

interface Logger {
  debug: (message: string, data?: LogData) => void;
  info: (message: string, data?: LogData) => void;
  warn: (message: string, data?: LogData) => void;
  error: (message: string, data?: LogData) => void;
}

const noop = (): void => {};

export const logger: Logger = {
  debug: isDev
    ? (message: string, data?: LogData) =>
        console.debug(`[DEBUG] ${message}`, data ?? "")
    : noop,
  info: isDev
    ? (message: string, data?: LogData) =>
        console.info(`[INFO] ${message}`, data ?? "")
    : noop,
  warn: (message: string, data?: LogData) =>
    console.warn(`[WARN] ${message}`, data ?? ""),
  error: (message: string, data?: LogData) =>
    console.error(`[ERROR] ${message}`, data ?? ""),
};

export default logger;
