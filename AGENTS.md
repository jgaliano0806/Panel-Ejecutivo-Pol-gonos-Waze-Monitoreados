# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

This is a **Waze Traffic Dashboard** monorepo (on `main` branch) for real-time traffic monitoring in Córdoba, Argentina. It uses npm workspaces with this structure:

- `apps/frontend` — React 18 + Vite + TailwindCSS + Leaflet/MapLibre (port **5180**)
- `apps/backend` — Node.js + Fastify + TypeScript + PostgreSQL (port **3002**)
- `packages/types`, `packages/config`, `packages/shared`, `packages/database` — shared workspace packages

### Prerequisites

- **Node.js >= 18** (environment has v22)
- **PostgreSQL 16** must be running locally (installed via `sudo apt-get install -y postgresql postgresql-client`)
- Redis is optional (backend degrades gracefully without it)

### Database Setup (one-time)

```bash
sudo pg_ctlcluster 16 main start
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE panel_waze;"
sudo -u postgres psql -d panel_waze -f /workspace/apps/backend/src/database/schema.sql
```

### Backend .env file

Create `apps/backend/.env` (gitignored):
```
PORT=3002
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=panel_waze
DB_USER=postgres
DB_PASSWORD=postgres
```

### Starting services

See `README.md` for standard commands. Key caveats:

1. **Shared packages must be built first**: Run `npm run build` in each `packages/*` directory before starting the backend, otherwise `@panel-waze/types` (and other workspace packages) will fail to resolve at runtime.

2. **nodemon glob bug**: The backend `npm run dev` script uses unquoted `src/**/*.ts` in the nodemon `--watch` flag. In bash, this glob gets shell-expanded, breaking the command. **Workaround**: run the backend directly with quoted globs:
   ```bash
   cd apps/backend && npx nodemon --watch 'src/**/*.ts' --exec 'npx ts-node src/server.ts'
   ```

3. **PostgreSQL must be running** before starting the backend. Start it with:
   ```bash
   sudo pg_ctlcluster 16 main start
   ```

4. **Migration warnings are non-fatal**: The backend may log errors about missing `road_accidents` table during migrations — it continues running normally.

5. **Redis not required**: The backend logs a warning about Redis being unavailable but disables caching gracefully.

### Lint / Build / Test

- **Lint**: `npm run lint` (runs across workspaces; frontend has pre-existing warnings, 0 errors)
- **Frontend lint only**: `cd apps/frontend && npm run lint`
- **Build shared packages**: `for pkg in packages/*/; do (cd "$pkg" && npm run build); done`
- **Build backend**: `cd apps/backend && npm run build`
- **Frontend build**: `cd apps/frontend && npm run build` (note: `tsc -b` step may fail on pre-existing TS errors; the dev server is unaffected)
- **E2E tests**: `cd apps/frontend && npx playwright test` (requires Playwright browsers installed)

### Ports

| Service  | Port |
|----------|------|
| Frontend | 5180 |
| Backend  | 3002 |
| PostgreSQL | 5432 |

### Important Notes

- The frontend Vite proxy forwards `/api/*` and `/socket.io/*` to `http://127.0.0.1:3002`.
- The backend ingests 66 Waze feeds every 120 seconds. First data appears ~2-3 seconds after startup.
- Backend uses Socket.IO for real-time WebSocket push to the frontend.
- Weather data uses Open-Meteo (free, no API key needed). AccuWeather/HERE/TomTom keys are optional.
