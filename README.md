# 🚦 Panel Ejecutivo - Waze Monitoreados

<p align="center">
  <img src="public/logo_cs.png" alt="Caminos de las Sierras" width="200"/>
</p>

<p align="center">
  <strong>Sistema de monitoreo de tráfico en tiempo real para la red vial de Córdoba</strong>
</p>

<p align="center">
  <a href="#-características">Características</a> •
  <a href="#-instalación-rápida">Instalación</a> •
  <a href="#-desarrollo">Desarrollo</a> •
  <a href="#-api">API</a> •
  <a href="#-base-de-datos">Base de Datos</a>
</p>

---

## 📋 Descripción

Panel ejecutivo que muestra información de tráfico en tiempo real para los 66 polígonos monitoreados de la red vial de Caminos de las Sierras, utilizando datos de la API de Waze.

### Stack Tecnológico

| Frontend | Backend | Base de Datos | DevOps |
|----------|---------|---------------|--------|
| React 19 | Fastify 5 | PostgreSQL 16+ | Docker |
| TypeScript 5.9 | Node.js 20+ | | Nginx |
| Tailwind CSS 3.4 | TypeScript | | Playwright |
| Vite 7 | Waze API | | |
| React Query 5 | | | |

---

## ✨ Características

- 📊 **Dashboard ejecutivo** con KPIs en tiempo real
- 🗺️ **Mapa interactivo** con polígonos y eventos
- 🚨 **Sistema de alertas** por severidad (crítica, alta, media, baja)
- 📈 **Gráficos de tendencias** (últimas 24h)
- 🔄 **Actualización automática** cada 2 minutos
- 📱 **Diseño responsive** (mobile, tablet, desktop)
- 🗄️ **Histórico persistente** en PostgreSQL
- ⚡ **Optimizado para performance** (lazy loading, memoización)

---

## 🚀 Instalación Rápida

### Requisitos

- **Node.js 20+** y **npm 10+**
- **PostgreSQL 16+** (local o Docker)
- Git

### Paso 1: Clonar e Instalar

```bash
git clone https://github.com/your-org/panel-waze-monitoreados.git
cd panel-waze-monitoreados

# Instalar dependencias
npm install
cd backend && npm install && cd ..
```

### Paso 2: Configurar PostgreSQL

#### Opción A: PostgreSQL Local (Recomendado)

Si ya tienes PostgreSQL instalado:

```bash
# Crear base de datos (ajusta la contraseña según tu instalación)
psql -U postgres -c "CREATE DATABASE panel_waze;"

# Ejecutar schema
psql -U postgres -d panel_waze -f backend/src/database/schema.sql
```

#### Opción B: Docker

```bash
docker-compose --profile dev up -d postgres
```

### Paso 3: Configurar Variables de Entorno

Crea el archivo `backend/.env`:

```env
# Servidor
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=panel_waze
DB_USER=postgres
DB_PASSWORD=tu_contraseña
```

### Paso 4: Verificar Conexión

```bash
cd backend
npx ts-node scripts/test-db-connection.ts
```

### Paso 5: Iniciar el Proyecto

```bash
# Opción 1: Ambos servidores juntos
npm run start:all

# Opción 2: Por separado
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
npm run dev
```

### URLs

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3001 |
| Health Check | http://localhost:3001/health |

---

## 💻 Desarrollo

### Scripts Disponibles

```bash
# Frontend
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run preview      # Preview del build
npm run lint         # Ejecutar ESLint
npm run lint:fix     # Corregir errores de lint
npm run typecheck    # Verificar tipos TypeScript

# Backend
cd backend
npm run dev          # Servidor de desarrollo con hot reload
npm run build        # Compilar TypeScript
npm run start        # Iniciar servidor compilado

# Testing
npm run test:e2e     # Tests E2E con Playwright
npm run test:e2e:ui  # Tests E2E con interfaz gráfica
```

### Estructura del Proyecto

```
panel-waze-monitoreados/
├── backend/                    # Servidor Fastify
│   ├── src/
│   │   ├── config/            # Configuración de polígonos
│   │   ├── database/          # Servicio de PostgreSQL
│   │   ├── services/          # Lógica de negocio
│   │   ├── types/             # Tipos TypeScript
│   │   └── server.ts          # Entry point
│   └── scripts/               # Scripts de utilidad
├── src/                        # Frontend React
│   ├── components/            # Componentes UI
│   ├── hooks/                 # Custom hooks
│   ├── pages/                 # Páginas
│   ├── types/                 # Tipos TypeScript
│   └── utils/                 # Utilidades
├── tests/                      # Tests E2E
├── docker/                     # Configuración Docker
└── public/                     # Assets estáticos
```

---

## 🔌 API

### Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Estado del servidor y conexión DB |
| GET | `/api/polygons` | Lista de polígonos con métricas |
| GET | `/api/polygons/:id` | Detalle de un polígono |
| GET | `/api/incidents/all` | Todos los incidentes activos |
| GET | `/api/jams/all` | Todos los jams activos |
| GET | `/api/kpis/global` | KPIs globales del sistema |

### Endpoints de Alertas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/alerts` | Alertas activas |
| GET | `/api/alerts/stats` | Estadísticas de alertas |
| POST | `/api/alerts/:id/acknowledge` | Reconocer una alerta |

### Endpoints Históricos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/historical/global?hours=24` | Snapshots globales |
| GET | `/api/historical/polygon/:id?hours=24` | Snapshots de polígono |
| GET | `/api/historical/trends` | Tendencias calculadas |

### Endpoints de Análisis

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/incidents/blocking-analysis` | Análisis de incidentes bloqueantes |
| GET | `/api/incidents/stats/global` | Estadísticas de tipos de incidentes |
| GET | `/api/data-quality/report` | Reporte de calidad de datos |

---

## 🗄️ Base de Datos

### Esquema PostgreSQL

```sql
-- Snapshots globales del sistema (cada hora)
historical_snapshots
├── id (UUID)
├── timestamp
├── total_jams, total_incidents
├── avg_speed, avg_delay
├── critical_km
└── affected_polygons, critical_polygons

-- Snapshots por polígono
polygon_snapshots
├── id (UUID)
├── polygon_id
├── timestamp
└── [mismas métricas que global]

-- Alertas del sistema
alerts
├── id (UUID)
├── alert_id, polygon_id
├── severity, type
├── message, data (JSONB)
├── is_acknowledged
└── timestamps
```

### Conexión con DBeaver/pgAdmin

| Campo | Valor |
|-------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `panel_waze` |
| Username | `postgres` |
| Password | `[tu contraseña]` |

### Mantenimiento

- **Retención de datos**: 7 días (limpieza automática)
- **Snapshots**: Cada hora automáticamente
- **Backups**: Configurar según necesidad

---

## 🐳 Docker

### Desarrollo

```bash
docker-compose --profile dev up
```

### Producción

```bash
docker-compose --profile prod up -d
```

### Build Manual

```bash
docker build -t panel-waze .
docker run -p 80:80 -p 3001:3001 panel-waze
```

---

## 🚨 Solución de Problemas

### Error: "Connection to localhost:5432 refused"

**PostgreSQL no está corriendo.**

```bash
# Verificar servicio (Windows)
Get-Service -Name "*postgres*"

# Iniciar servicio
Start-Service postgresql-x64-18  # Ajustar versión

# O con Docker
docker-compose --profile dev up -d postgres
```

### Error: "password authentication failed"

Verifica la contraseña en `backend/.env` coincida con tu instalación de PostgreSQL.

### Error: "database does not exist"

```sql
CREATE DATABASE panel_waze;
```

### Puerto 5432 ocupado

```powershell
# Ver qué proceso usa el puerto
Get-NetTCPConnection -LocalPort 5432
```

---

## 📊 Monitoreo

### Health Check

```bash
curl http://localhost:3001/health
```

Respuesta:
```json
{
  "status": "ok",
  "uptime": 3600,
  "database": "connected",
  "alertsCount": 10,
  "jamsCount": 25,
  "lastWazeUpdate": "2025-12-23T12:00:00Z"
}
```

---

## 🔒 Seguridad

- ✅ CORS configurado
- ✅ Variables de entorno para secrets
- ✅ Headers de seguridad en Nginx
- ✅ Validación de inputs
- ✅ Error handling robusto

---

## 📝 Changelog

### v2.0.0 (2025-12-19)
- ✅ Integración completa con PostgreSQL
- ✅ Sistema de alertas mejorado
- ✅ Tests E2E con Playwright
- ✅ Docker multi-stage optimizado
- ✅ 66 polígonos con feeds individuales

### v1.0.0 (2025-12-15)
- Dashboard ejecutivo inicial
- Integración con API de Waze
- Mapa interactivo con Google Maps

---

## 📞 Soporte

Para soporte técnico, contactar al equipo de desarrollo de CASISA.

---

<p align="center">
  Desarrollado con ❤️ para <strong>Caminos de las Sierras</strong>
</p>
