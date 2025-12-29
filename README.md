# Panel Ejecutivo Waze - Monorepo

> Panel de monitoreo en tiempo real del tráfico vehicular en Córdoba, Argentina

## 🏗️ Arquitectura

Este proyecto utiliza una **arquitectura de monorepo** con workspaces npm para una mejor organización y mantenibilidad del código.

```
panel-waze-monorepo/
├── apps/                          # Aplicaciones principales
│   ├── frontend/                  # Aplicación React (Vite)
│   └── backend/                   # API REST (Fastify + TypeScript)
├── packages/                      # Paquetes compartidos
│   ├── types/                     # Definiciones TypeScript compartidas
│   ├── config/                    # Configuraciones compartidas
│   ├── database/                  # Capa de base de datos
│   └── shared/                    # Utilidades y helpers
├── docker/                        # Configuración Docker
├── docs/                          # Documentación
└── scripts/                       # Scripts de automatización
```

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+
- npm 8+
- PostgreSQL 16+
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
- **Maps**: Leaflet + React Leaflet
- **State**: TanStack Query
- **UI**: Radix UI + Framer Motion

### Backend (`apps/backend`)
- **Runtime**: Node.js + TypeScript
- **Framework**: Fastify
- **Database**: PostgreSQL + pg
- **Validation**: Built-in Fastify validation
- **Caching**: Redis (futuro)

### Paquetes Compartidos

#### Types (`packages/types`)
Definiciones TypeScript compartidas entre frontend y backend.

#### Config (`packages/config`)
Configuraciones centralizadas y constantes.

#### Database (`packages/database`)
Capa de abstracción de base de datos y migraciones.

#### Shared (`packages/shared`)
Utilidades, helpers y lógica de negocio compartida.

## 🗄️ Base de Datos

### Esquema Principal
- **Usuarios y Roles**: Sistema de autenticación y permisos
- **Catálogos**: Tipos y subtipos de incidentes
- **Polígonos**: Configuración de áreas de monitoreo
- **Incidentes**: Historial y datos en tiempo real
- **Auditoría**: Logs de cambios y operaciones

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
```bash
# Frontend (.env)
VITE_API_URL=http://localhost:3001
VITE_GOOGLE_MAPS_API_KEY=your_key

# Backend (.env)
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_NAME=panel_waze
DB_USER=postgres
DB_PASSWORD=your_password
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

- [Arquitectura](./docs/ARCHITECTURE.md)
- [API](./docs/API.md)
- [Deployment](./docs/DEPLOYMENT.md)
- [Contribución](./docs/CONTRIBUTING.md)

## 🤝 Contribución

1. Fork el proyecto
2. Crea una branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: nueva funcionalidad'`)
4. Push a la branch (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es propiedad de **CASISA - Caminos de las Sierras**.

---

**Desarrollado con ❤️ por el equipo de CASISA**
