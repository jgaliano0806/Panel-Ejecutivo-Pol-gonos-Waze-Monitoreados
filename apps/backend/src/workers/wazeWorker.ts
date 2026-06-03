/**
 * Worker de Polling Waze - Proceso Separado del API
 *
 * Ejecutar como proceso independiente:
 *   npx ts-node src/workers/wazeWorker.ts
 *   node dist/workers/wazeWorker.js
 *
 * Variables de entorno requeridas:
 *   - DB_* (conexión PostgreSQL)
 *   - REDIS_* (opcional, para cache distribuido)
 *
 * Beneficios:
 *   - No compite por recursos con el API
 *   - Puede reiniciarse sin afectar el servicio HTTP
 *   - Escalable: múltiples workers para diferentes grupos de polígonos
 */

import dotenv from "dotenv";
dotenv.config();

import { dbService } from "../database/dbService";
import { wazePollingService } from "../services/wazePollingService";
import { geoReferenceService } from "../services/geoReferenceService";
import { logger } from "../utils/logger";

const WORKER_NAME = "waze-polling-worker";

async function main() {
  logger.info(`🚀 Starting ${WORKER_NAME}...`);

  // Verificar conexión a PostgreSQL
  const dbOk = await dbService.testConnection();
  if (!dbOk) {
    logger.error("❌ No se pudo conectar a PostgreSQL. Abortando.");
    process.exit(1);
  }

  // Cargar hitos kilométricos para geo-referencia
  await geoReferenceService.loadMarkers();

  // Iniciar polling
  await wazePollingService.startPolling();

  logger.info(`✅ ${WORKER_NAME} running. Press Ctrl+C to stop.`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`\n📴 ${signal} received. Shutting down ${WORKER_NAME}...`);
    wazePollingService.stopPolling();
    await dbService.close();
    logger.info(`👋 ${WORKER_NAME} stopped.`);
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Mantener el proceso vivo
  process.stdin.resume();
}

main().catch((err) => {
  logger.error(`❌ ${WORKER_NAME} crashed:`, err);
  process.exit(1);
});
