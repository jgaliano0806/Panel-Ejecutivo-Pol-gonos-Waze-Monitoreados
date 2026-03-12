# Panel Ejecutivo Waze - Monorepo

> Panel de monitoreo en tiempo real del tráfico vehicular en Córdoba, Argentina. Integra datos de Waze, notificaciones en vivo, TTS (voz) y mapas para sala de control.

**Proyecto interno de CASISA - Caminos de las Sierras.**

## Entorno del servidor

| Atributo | Valor |
|----------|-------|
| OS | Windows Server 2022 Standard |
| IP LAN | `10.1.0.136` |
| Ruta del proyecto | `D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados` |
| PostgreSQL | 18.3 en `D:\postgreSQL` |
| Backend (servicio) | NSSM → `PanelWazeBackend` (puerto 3002) |
| Frontend | http://10.1.0.136:5180 |

## Inicio Rápido

### Primera instalación (o instalación limpia)

1. **Instalar dependencias y compilar packages**:
   ```powershell
   npm install
   npm run build
   ```

2. **Configurar variables de entorno**:
   ```powershell
   copy apps\backend\.env.example apps\backend\.env
   # Editar apps\backend\.env con DB_PASSWORD, JWT_SECRET, FRONTEND_URL
   ```

3. **Restaurar BD desde backup** (si se tiene un .dump) o migrar:
   ```powershell
   npm run db:migrate
   ```

4. **Iniciar**:
   ```powershell
   npm run dev:all
   ```
   - Frontend: http://localhost:5180
   - Backend: http://localhost:3002

### En el servidor (servicio NSSM)

```powershell
# Como Administrador:
nssm restart PanelWazeBackend
```

Ver [docs/INSTRUCTIVO_DESPLIEGUE.md](./docs/INSTRUCTIVO_DESPLIEGUE.md) para el procedimiento completo.

## 🏗️ Arquitectura

Este proyecto utiliza una **arquitectura de monorepo** con workspaces npm para una mejor organización y mantenibilidad del código.

```
panel-waze-monorepo/
├── apps/                          # Aplicaciones principales
│   ├── frontend/                  # Aplicación React (Vite + TypeScript)
│   └── backend/                   # API REST (Fastify + TypeScript)
├── packages/                      # Paquetes compartidos
│   ├── types/                     # Definiciones TypeScript (Waze, clima, etc.)
│   ├── config/                    # Configuraciones compartidas
│   └── shared/                    # Utilidades y helpers
├── docker/                        # Configuración Docker y Nginx
├── docs/                          # Documentación del proyecto
├── scripts/                       # Scripts de automatización
└── tests/                         # Tests E2E (Playwright)
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- npm 8+
- PostgreSQL 16+ (PostGIS recomendado)
- Redis (Memurai para Windows)
- Docker & Docker Compose (opcional)

### Instalación

```bash
# Instalar dependencias de todos los workspaces
npm install

# Configurar base de datos
npm run db:migrate
npm run db:seed
```

### Desarrollo

```bash
# Desarrollo completo (frontend + backend)
npm run dev:all

# Solo frontend
npm run dev

# Solo backend
npm run dev:backend
```

### Producción

```bash
# Build completo
npm run build

# Con Docker
npm run docker:compose:prod
```

## 📦 Workspaces

### Frontend (`apps/frontend`)

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Maps**: MapLibre GL JS + React Map GL
- **State**: TanStack Query + Zustand
- **UI**: Radix UI + Framer Motion

### Backend (`apps/backend`)

- **Runtime**: Node.js + TypeScript
- **Framework**: Fastify
- **Database**: PostgreSQL + pg
- **Validation**: Built-in Fastify validation
- **Caching**: Redis (Memurai en Windows)

### Paquetes Compartidos

#### Types (`packages/types`)

Definiciones TypeScript compartidas entre frontend y backend (Waze, clima, API).

#### Config (`packages/config`)

Configuraciones centralizadas y constantes.

#### Shared (`packages/shared`)

Utilidades, helpers y lógica reutilizable compartida.

## 🗄️ Base de Datos

### Esquema Principal

- **Usuarios y Roles**: Sistema de autenticación y permisos
- **Catálogos**: Tipos y subtipos de incidentes (sincronizables con Waze)
- **Polígonos**: Configuración de áreas de monitoreo
- **Incidentes**:
  - `waze_alerts`: Accidentes, peligros y otros reportes (Puntos)
  - `waze_jams`: Congestión vehicular (Líneas)
  - `waze_irregularities`: Anomalías de tráfico
  - `incidents_history`: Histórico consolidado para estadísticas
- **Clima**:
  - `polygon_weather_data`: Datos meteorológicos por polígono (Open-Meteo)
- **Auditoría**: Logs de cambios y operaciones

### Integración Waze

El sistema consume el **Waze Traffic Feed** (Partners).

- **Alertas**: Accidentes, peligros, clima (con iconos SVG oficiales).
- **Jams**: Congestión vehicular con polígonos de tráfico.
- **Catálogos**: Gestión centralizada de tipos de incidentes (`/api/catalogs`).
- **Notificaciones en tiempo real**: WebSocket (`notification:new`) para alertas al instante.

### Notificaciones y TTS

- **Sincronización en tiempo real vía WebSockets**: Todos los centros de monitoreo reciben actualizaciones en el mismo instante. El servidor emite broadcast global (`waze:data_updated`, `play_audio_alert`) al completar cada ciclo de ingesta, eliminando la necesidad de polling.
- **TTS (Text-to-Speech)**: Lectura en voz alta con **Edge TTS** (Microsoft), voces neuronales gratuitas. Configuración en `/admin` → Voz (TTS).
- **Cola local**: El frontend mantiene una cola de mensajes por reproducir; ver `getTTSQueueStatus()` en `lib/tts-service.ts` para consultar pendientes.

### Migraciones

```bash
# Ejecutar migraciones
npm run db:migrate

# Crear nueva migración
# (Implementar script para generar migraciones)
```

## 🔧 Desarrollo

### Scripts Disponibles

```bash
# Desarrollo
npm run dev:all          # Frontend + Backend
npm run dev              # Solo frontend
npm run dev:backend      # Solo backend

# Testing
npm run test             # Tests unitarios
npm run test:e2e         # Tests end-to-end

# Calidad de código
npm run lint             # Linting
npm run typecheck        # Type checking
npm run build            # Build de producción

# Base de datos
npm run db:migrate       # Migraciones
npm run db:seed          # Datos de prueba

# Docker
npm run docker:compose:dev   # Desarrollo con Docker
npm run docker:compose:prod  # Producción con Docker
```

### Estructura de Commits

```
feat: nueva funcionalidad
fix: corrección de bug
docs: cambios en documentación
style: cambios de estilo
refactor: refactorización
test: cambios en tests
chore: tareas de mantenimiento
```

## 🚀 Deployment

### Docker

```bash
# Desarrollo
docker-compose --profile dev up

# Producción
docker-compose --profile prod up -d
```

### Variables de Entorno

Referencia completa en `apps/backend/.env.example`. Variables principales:

```env
# Backend (apps/backend/.env)
NODE_ENV=production
PORT=3002
FRONTEND_URL=http://10.1.0.136:5180

DB_HOST=localhost
DB_PORT=5432
DB_NAME=panel_waze
DB_USER=postgres
DB_PASSWORD=           # obligatorio
DB_POOL_MAX=50

JWT_SECRET=            # cambiar en producción
JWT_EXPIRATION=8h

REDIS_HOST=localhost
REDIS_PORT=6379

WEATHER_PROVIDER=openmeteo
LOG_LEVEL=info

# Opcionales
# ACCUWEATHER_API_KEY=
# HERE_API_KEY=
# TOMTOM_API_KEY=
# WAZE_FEED_TOKEN=
```

```env
# Frontend (apps/frontend/.env)
VITE_API_URL=/api      # o http://10.1.0.136:3002 para acceso directo
```

## 📊 Monitoreo

### Health Checks

- `/health` - Estado general del sistema
- `/health/live` - Liveness probe
- `/health/ready` - Readiness probe

### Métricas

- **Performance**: Response times, throughput
- **Errors**: Error rates, stack traces
- **Database**: Connection pools, query performance
- **System**: CPU, memory, disk usage

## 🔐 Seguridad

- **Autenticación**: JWT + SSO (Microsoft/Google)
- **Autorización**: Role-based access control (RBAC)
- **Validación**: Input sanitization y validation
- **Rate Limiting**: Protección contra abuso
- **HTTPS**: En producción con certificados válidos

## 📚 Documentación

| Documento                                                     | Descripción                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [Índice de documentación](./docs/README.md)                   | Guía de toda la documentación disponible                                  |
| [Instructivo de despliegue](./docs/INSTRUCTIVO_DESPLIEGUE.md) | Producción: Red Hat (systemd, Nginx, SSL) y PC productiva (Windows/Linux) |
| [Requisitos del sistema](./docs/REQUISITOS_SISTEMA.md)        | Requisitos físicos/lógicos, cargas en BD, hardware para servidor y PC     |
| [Arquitectura](./docs/ARCHITECTURE.md)                        | Diseño del sistema, capas, flujos de datos                                |
| [API](./docs/API.md)                                          | Endpoints REST, WebSocket, health checks                                  |
| [TTS (Text-to-Speech)](./docs/TTS.md)                         | Voz en tiempo real, Edge TTS, cola y estado                               |
| [Catálogos de incidentes](./docs/CATALOGOS_INCIDENTES.md)     | Tipos y subtipos, sincronización con Waze                                 |
| [Deployment](./docs/DEPLOYMENT.md)                            | Despliegue local, Docker, variables de entorno                            |
| [Contribución](./docs/CONTRIBUTING.md)                        | Cómo contribuir, convenciones, PRs                                        |

## 🌿 Ramas (Branches)

| Rama | Propósito |
|--------|-----------|
| `main` | Producción estable |
| `preprod` | Pre-producción / staging |
| `feature/*` | Nuevas funcionalidades (desde `preprod`) |
| `fix/*` | Correcciones (desde `preprod`) |

## 🤝 Contribución

1. Checkout `preprod` y actualiza (`git pull origin preprod`)
2. Crea una branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: nueva funcionalidad'`)
4. Push a la branch (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request hacia `preprod`

Ver [CONTRIBUTING.md](./docs/CONTRIBUTING.md) para mas detalles.

## 📄 Licencia

Este proyecto es propiedad de **CASISA - Caminos de las Sierras**.

---

**Desarrollado por el equipo de GED**

_Última actualización: Marzo 2026_
