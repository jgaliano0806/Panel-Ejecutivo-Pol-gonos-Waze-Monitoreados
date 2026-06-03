/**
 * PM2 Ecosystem Configuration
 * 
 * Uso:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --only panel-waze-api
 *   pm2 start ecosystem.config.js --only panel-waze-worker
 */

const path = require("path");
const cwd = __dirname;

module.exports = {
  apps: [
    {
      name: "panel-waze-api",
      script: "dist/server.js",
      cwd: cwd,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        DISABLE_WAZE_POLLING: "true",
        // Caché de tiles del mapa (proxy + seeder lo comparten). Ruta absoluta
        // recomendada en el server para no depender del cwd con el que arranca PM2.
        TILE_CACHE_DIR: path.join(cwd, "data", "tile-cache"),
      },
      max_memory_restart: "500M",
      error_file: "logs/api-error.log",
      out_file: "logs/api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: "10s",
    },
    {
      name: "panel-waze-worker",
      script: "dist/workers/wazeWorker.js",
      cwd: cwd,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "300M",
      error_file: "logs/worker-error.log",
      out_file: "logs/worker-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};
