# 🏗️ Arquitectura del Sistema

## Visión General

El **Panel Ejecutivo Waze** es un sistema de monitoreo en tiempo real del tráfico vehicular que combina datos de Waze con análisis avanzado y visualización interactiva. La arquitectura está diseñada para ser **escalable**, **mantenible** y **confiable**.

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                    PANEL EJECUTIVO WAZE                         │
│                       MONOREPO ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
            ┌───────▼───────┐ ┌─────▼─────┐ ┌──────▼──────┐
            │   FRONTEND    │ │  BACKEND  │ │  PACKAGES   │
            │   (React)     │ │  (Fastify)│ │  (Shared)   │
            └───────────────┘ └───────────┘ └─────────────┘
                    │               │               │
            ┌───────▼───────────────▼───────────────▼───────┐
            │                                               │
            │               EXTERNAL SERVICES               │
            │                                               │
            └───────────────────────────────────────────────┘
```

## Arquitectura Detallada

### 1. Monorepo con Workspaces NPM

```
panel-waze-monorepo/
├── apps/                          # 🖥️ Aplicaciones Principales
│   ├── frontend/                  # React + Vite + TypeScript
│   │   ├── src/
│   │   │   ├── components/        # Componentes UI
│   │   │   ├── pages/            # Páginas/Rutas
│   │   │   ├── hooks/            # Custom hooks
│   │   │   ├── utils/            # Utilidades frontend
│   │   │   └── types/            # Tipos específicos del frontend
│   │   ├── public/               # Assets estáticos
│   │   ├── index.html
│   │   └── package.json
│   └── backend/                   # Fastify + TypeScript
│       ├── src/
│       │   ├── routes/           # Definición de rutas API
│       │   ├── services/         # Lógica de negocio
│       │   ├── models/           # Modelos de datos
│       │   ├── middleware/       # Middlewares personalizados
│       │   └── utils/            # Utilidades backend
│       ├── scripts/              # Scripts de migración/setup
│       └── package.json
├── packages/                      # 📦 Paquetes Compartidos
│   ├── types/                     # 🏷️ Definiciones TypeScript
│   │   ├── src/
│   │   │   ├── api/              # Tipos de API
│   │   │   ├── database/         # Tipos de BD
│   │   │   └── common/           # Tipos comunes
│   │   └── package.json
│   ├── config/                    # ⚙️ Configuraciones
│   │   ├── src/
│   │   │   ├── constants.ts      # Constantes globales
│   │   │   ├── environments.ts   # Config por entorno
│   │   │   └── validation.ts     # Reglas de validación
│   │   └── package.json
│   ├── database/                  # 🗄️ Capa de Datos
│   │   ├── src/
│   │   │   ├── migrations/       # Scripts de migración
│   │   │   ├── seeds/            # Datos de prueba
│   │   │   ├── connection.ts     # Configuración de conexión
│   │   │   └── queries/          # Consultas reutilizables
│   │   └── package.json
│   └── shared/                    # 🔧 Utilidades Compartidas
│       ├── src/
│       │   ├── validation/       # Funciones de validación
│       │   ├── formatting/       # Formateo de datos
│       │   ├── calculations/     # Lógica de cálculo
│       │   └── constants/        # Constantes compartidas
│       └── package.json
├── docker/                        # 🐳 Contenedorización
│   ├── Dockerfile                 # Multi-stage build
│   ├── docker-compose.yml         # Orquestación de servicios
│   └── nginx.conf                 # Configuración web server
├── docs/                          # 📚 Documentación
└── scripts/                       # 🔨 Automatización
    ├── setup.sh                   # Setup inicial
    ├── deploy.sh                  # Deployment
    └── monitoring.sh              # Monitoreo
```

## 2. Arquitectura por Capas

### Frontend Layer (React + TypeScript)

```
┌─────────────────────────────────────────────────┐
│               PRESENTATION LAYER                │
├─────────────────────────────────────────────────┤
│  🖼️  Components (UI/UX)                         │
│  📄 Pages (Routing)                            │
│  🎣 Hooks (State & Effects)                    │
│  🎨 Styles (Tailwind + Components)             │
├─────────────────────────────────────────────────┤
│               APPLICATION LAYER                 │
├─────────────────────────────────────────────────┤
│  🔄 State Management (TanStack Query)          │
│  🧭 Routing (React Router)                     │
│  📡 API Client (Custom hooks)                  │
│  🗃️  Local Storage/Cache                       │
├─────────────────────────────────────────────────┤
│               INFRASTRUCTURE LAYER              │
├─────────────────────────────────────────────────┤
│  🌐 HTTP Client (Fetch)                        │
│  🗺️  Maps (Leaflet)                            │
│  📊 Charts (Recharts)                          │
│  🎭 Animations (Framer Motion)                 │
└─────────────────────────────────────────────────┘
```

### Backend Layer (Fastify + TypeScript)

```
┌─────────────────────────────────────────────────┐
│               API LAYER                         │
├─────────────────────────────────────────────────┤
│  🌐 Routes & Controllers                        │
│  ✅ Validation & Sanitization                   │
│  🔐 Authentication & Authorization              │
│  📊 Response Formatting                         │
├─────────────────────────────────────────────────┤
│               BUSINESS LOGIC LAYER              │
├─────────────────────────────────────────────────┤
│  🏢 Domain Services                             │
│  🔄 Business Rules                              │
│  📈 Calculations & Analytics                    │
│  🔄 Data Processing                             │
├─────────────────────────────────────────────────┤
│               DATA ACCESS LAYER                 │
├─────────────────────────────────────────────────┤
│  🗄️  Database Models/Repositories               │
│  📡 External API Clients                        │
│  🗃️  Caching Layer (Redis)                      │
│  📋 Queue System (Bull)                         │
├─────────────────────────────────────────────────┤
│               INFRASTRUCTURE LAYER              │
├─────────────────────────────────────────────────┤
│  🐘 PostgreSQL Database                         │
│  🔴 Redis Cache                                 │
│  📧 Email Services                              │
│  📱 Push Notifications                          │
└─────────────────────────────────────────────────┘
```

## 3. Patrón de Diseño

### Hexagonal Architecture (Ports & Adapters)

```
┌─────────────────────────────────────────────────┐
│                   DOMAIN                         │
│              (Business Logic)                    │
├─────────────────────────────────────────────────┤
│  ENTITIES • VALUE OBJECTS • DOMAIN SERVICES     │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼───────┐   ┌───────▼───────┐
│   PRIMARY     │   │  SECONDARY    │
│   PORTS       │   │   PORTS       │
│ (Driven/Left) │   │ (Driving/Right)│
└───────┬───────┘   └───────┬───────┘
        │                   │
┌───────▼───────┐   ┌───────▼───────┐
│  CONTROLLERS  │   │   REPOSITORIES│
│    (API)      │   │   (Database)  │
└───────┬───────┘   └───────┬───────┘
        │                   │
┌───────▼───────────────────▼───────┐
│            FRAMEWORK               │
│         (Fastify/React)            │
└────────────────────────────────────┘
```

### CQRS (Command Query Responsibility Segregation)

```
┌─────────────────────────────────────────────────┐
│                 APPLICATION LAYER               │
├─────────────────────────────────────────────────┤
│  Commands (Write Operations)                    │
│  • CreateIncident                               │
│  • UpdatePolygon                                │
│  • DeleteUser                                   │
│  • SyncCatalogs                                 │
├─────────────────────────────────────────────────┤
│  Queries (Read Operations)                      │
│  • GetDashboardData                             │
│  • ListIncidents                                │
│  • GetUserProfile                               │
│  • GetCatalogStats                              │
├─────────────────────────────────────────────────┤
│  Handlers (Business Logic)                      │
│  • Command Handlers                             │
│  • Query Handlers                               │
│  • Event Handlers                               │
└─────────────────────────────────────────────────┘
```

## 4. Data Flow Architecture

### Request Flow (Frontend → Backend → Database)

```
1. User Action          ┌─────────────┐
   (Click, Form)    ──► │  Component  │
                        └─────────────┘
                              │
                              ▼
2. API Call            ┌─────────────┐
   (useQuery/useMutation) ─► │   Hook     │
                        └─────────────┘
                              │
                              ▼
3. HTTP Request         ┌─────────────┐
   (fetch/axios)    ──► │ API Client  │
                        └─────────────┘
                              │
                              ▼
4. Route Handler        ┌─────────────┐
   (Fastify Route)  ──► │ Controller  │
                        └─────────────┘
                              │
                              ▼
5. Business Logic       ┌─────────────┐
   (Domain Service) ──► │   Service   │
                        └─────────────┘
                              │
                              ▼
6. Data Access          ┌─────────────┐
   (Repository)     ──► │ Repository  │
                        └─────────────┘
                              │
                              ▼
7. Database Query       ┌─────────────┐
   (SQL)            ──► │ PostgreSQL  │
                        └─────────────┘
```

### Real-time Data Flow (WebSocket/Server-Sent Events)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Waze API  │───►│   Service   │───►│ WebSocket   │
│             │    │             │    │             │
│ • Incidents │    │ • Process   │    │ • Broadcast │
│ • Jams      │    │ • Filter    │    │ • Real-time │
│ • Updates   │    │ • Enrich    │    │ • Push      │
└─────────────┘    └─────────────┘    └─────────────┘
                        │
                        ▼
               ┌─────────────┐
               │  Frontend   │
               │ • React     │
               │ • Real-time │
               │ • Updates   │
               └─────────────┘
```

## 5. Component Architecture

### Atomic Design Pattern

```
┌─────────────────────────────────────────────────┐
│                 ATOMIC DESIGN                    │
├─────────────────────────────────────────────────┤
│  🧩 Atoms                                        │
│  • Button, Input, Badge, Icon                   │
├─────────────────────────────────────────────────┤
│  🧬 Molecules                                    │
│  • FormField, Card, Modal, Dropdown             │
├─────────────────────────────────────────────────┤
│  🏗️  Organisms                                    │
│  • Header, Sidebar, Dashboard, Filters          │
├─────────────────────────────────────────────────┤
│  📄 Templates                                    │
│  • Page layouts, Grid systems                    │
├─────────────────────────────────────────────────┤
│  🏠 Pages                                        │
│  • Dashboard, Admin, Reports                    │
└─────────────────────────────────────────────────┘
```

### Component Structure

```
components/
├── ui/                    # 🧩 Atomic Components
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── modal.tsx
├── layout/                # 🏗️ Layout Components
│   ├── header.tsx
│   ├── sidebar.tsx
│   └── footer.tsx
├── dashboard/             # 🏠 Page Components
│   ├── executive-summary.tsx
│   ├── top-critical.tsx
│   └── metrics-cards.tsx
├── admin/                 # ⚙️ Admin Components
│   ├── user-management.tsx
│   ├── catalog-management.tsx
│   └── system-settings.tsx
└── shared/                # 🔄 Shared Components
    ├── loading.tsx
    ├── error-boundary.tsx
    └── data-table.tsx
```

## 6. State Management Strategy

### Local State (Component Level)
- **useState**: Para estado simple de componentes
- **useReducer**: Para estado complejo con múltiples acciones
- **Context**: Para estado compartido entre componentes cercanos

### Global State (Application Level)
- **TanStack Query**: Para estado del servidor (cache, sync, mutations)
- **Custom Hooks**: Para lógica de negocio reutilizable
- **Context + Reducer**: Para estado global de UI (modales, notificaciones)

### Server State Management
```
┌─────────────────────────────────────────────────┐
│              SERVER STATE PATTERN                │
├─────────────────────────────────────────────────┤
│  📡 API Layer (TanStack Query)                  │
│  • Cache management                             │
│  • Background refetch                           │
│  • Optimistic updates                           │
│  • Error handling                               │
├─────────────────────────────────────────────────┤
│  🎣 Custom Hooks                                │
│  • Domain-specific logic                        │
│  • Data transformation                          │
│  • Loading states                               │
├─────────────────────────────────────────────────┤
│  🧩 Components                                  │
│  • UI rendering                                 │
│  • User interactions                            │
│  • Local state only                             │
└─────────────────────────────────────────────────┘
```

## 7. Error Handling Strategy

### Frontend Error Boundaries
```
┌─────────────────────────────────────────────────┐
│            ERROR BOUNDARY HIERARCHY             │
├─────────────────────────────────────────────────┤
│  🏠 Page Level                                  │
│  • Catch page-level errors                      │
│  • Show fallback UI                             │
│  • Report to monitoring                         │
├─────────────────────────────────────────────────┤
│  🏗️  Component Level                             │
│  • Catch component errors                       │
│  • Graceful degradation                         │
│  • User-friendly messages                       │
├─────────────────────────────────────────────────┤
│  🔧 Hook Level                                  │
│  • Handle API errors                            │
│  • Retry logic                                  │
│  • Error reporting                              │
├─────────────────────────────────────────────────┤
│  📡 API Level                                   │
│  • Network error handling                       │
│  • Timeout handling                             │
│  • Response validation                          │
└─────────────────────────────────────────────────┘
```

### Backend Error Handling
```
┌─────────────────────────────────────────────────┐
│            ERROR HANDLING STRATEGY              │
├─────────────────────────────────────────────────┤
│  🌐 HTTP Layer                                  │
│  • Request validation                           │
│  • Rate limiting                                │
│  • CORS handling                                │
├─────────────────────────────────────────────────┤
│  🏢 Business Layer                              │
│  • Domain validation                            │
│  • Business rule enforcement                    │
│  • Data integrity checks                        │
├─────────────────────────────────────────────────┤
│  🗄️  Data Layer                                  │
│  • Connection error handling                    │
│  • Transaction rollback                         │
│  • Constraint violation handling                │
├─────────────────────────────────────────────────┤
│  📊 Monitoring Layer                            │
│  • Error logging                                │
│  • Performance metrics                          │
│  • Alert generation                             │
└─────────────────────────────────────────────────┘
```

## 8. Security Architecture

### Authentication & Authorization
```
┌─────────────────────────────────────────────────┐
│           SECURITY ARCHITECTURE                  │
├─────────────────────────────────────────────────┤
│  🔐 Authentication                              │
│  • JWT tokens                                   │
│  • SSO (Microsoft/Google)                       │
│  • Session management                           │
├─────────────────────────────────────────────────┤
│  🛡️  Authorization                               │
│  • Role-based access control                    │
│  • Permission-based access                      │
│  • Route protection                             │
├─────────────────────────────────────────────────┤
│  🔒 Data Protection                              │
│  • Input sanitization                           │
│  • SQL injection prevention                     │
│  • XSS protection                               │
├─────────────────────────────────────────────────┤
│  📡 API Security                                │
│  • Rate limiting                                │
│  • Request validation                           │
│  • CORS configuration                           │
└─────────────────────────────────────────────────┘
```

## 9. Performance Optimization

### Frontend Optimizations
- **Code Splitting**: Lazy loading de rutas y componentes
- **Bundle Optimization**: Tree shaking y minificación
- **Image Optimization**: WebP, lazy loading, compression
- **Caching**: Service worker para assets estáticos
- **Virtual Scrolling**: Para listas grandes

### Backend Optimizations
- **Database Indexing**: Índices estratégicos en consultas frecuentes
- **Query Optimization**: N+1 problem prevention
- **Caching**: Redis para datos frecuentemente accedidos
- **Compression**: GZIP/Brotli en responses
- **Connection Pooling**: PostgreSQL connection pooling

### Infrastructure Optimizations
- **CDN**: Para assets estáticos
- **Load Balancing**: Distribución de carga
- **Database Replication**: Read replicas
- **Horizontal Scaling**: Microservicios preparados

## 10. Deployment Architecture

### Development Environment
```
┌─────────────────────────────────────────────────┐
│            DEVELOPMENT ENVIRONMENT              │
├─────────────────────────────────────────────────┤
│  🖥️  Local Development                           │
│  • Hot reload (Vite)                           │
│  • API proxy                                    │
│  • Local database                               │
├─────────────────────────────────────────────────┤
│  🐳 Docker Development                           │
│  • docker-compose.dev.yml                       │
│  • Hot reload containers                        │
│  • Volume mounting                              │
└─────────────────────────────────────────────────┘
```

### Production Environment
```
┌─────────────────────────────────────────────────┐
│            PRODUCTION ENVIRONMENT               │
├─────────────────────────────────────────────────┤
│  🐳 Containerized Deployment                    │
│  • Multi-stage Docker builds                    │
│  • Nginx reverse proxy                          │
│  • SSL/TLS termination                          │
├─────────────────────────────────────────────────┤
│  ☁️  Cloud Infrastructure                        │
│  • Load balancer                                │
│  • Auto scaling                                 │
│  • Database replication                         │
├─────────────────────────────────────────────────┤
│  📊 Monitoring & Observability                   │
│  • Health checks                                │
│  • Application metrics                          │
│  • Log aggregation                              │
│  • Error tracking                               │
└─────────────────────────────────────────────────┘
```

## 11. Testing Strategy

### Testing Pyramid
```
┌─────────────────────────────────────────────────┐
│               TESTING PYRAMID                   │
├─────────────────────────────────────────────────┤
│  🤖 E2E Tests (Playwright)                       │
│  • Critical user journeys                       │
│  • Cross-browser compatibility                  │
│  • Integration testing                          │
├─────────────────────────────────────────────────┤
│  🔧 Integration Tests                           │
│  • API endpoints                                │
│  • Database operations                          │
│  • External service integration                 │
├─────────────────────────────────────────────────┤
│  🧪 Unit Tests (Jest)                            │
│  • Business logic                               │
│  • Utility functions                            │
│  • Component logic                              │
├─────────────────────────────────────────────────┤
│  🏗️  Architecture Tests                          │
│  • Dependency injection                         │
│  • Layer isolation                              │
│  • Contract testing                             │
└─────────────────────────────────────────────────┘
```

## Conclusión

Esta arquitectura proporciona una base sólida para el **Panel Ejecutivo Waze**, permitiendo:

- **Escalabilidad**: Monorepo con workspaces facilita el crecimiento
- **Mantenibilidad**: Separación clara de responsabilidades
- **Performance**: Optimizaciones en múltiples capas
- **Confiabilidad**: Health checks y error handling robusto
- **Seguridad**: Autenticación y autorización comprehensiva
- **Observabilidad**: Logging y monitoring integrado

La arquitectura está diseñada para evolucionar con los requerimientos del negocio, manteniendo la calidad y performance del sistema.

