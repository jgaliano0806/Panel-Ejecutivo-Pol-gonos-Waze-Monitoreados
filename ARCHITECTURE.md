# Arquitectura del Sistema - Panel Waze Monitoreados

Este documento describe la arquitectura técnica del proyecto, el flujo de datos y los componentes principales.

## Visión General

El sistema monitorea, almacena y visualiza eventos de tráfico de Waze en tiempo real para polígonos específicos (corredores viales), permitiendo la gestión de incidentes y el cálculo de niveles de servicio.

## Stack Tecnológico

| Capa              | Tecnologías                             | Propósito                           |
| ----------------- | --------------------------------------- | ----------------------------------- |
| **Frontend**      | React 18, Vite, TypeScript, TailwindCSS | Interfaz de usuario y visualización |
| **Mapas**         | MapLibre GL JS, React Map GL            | Renderizado de mapas vectoriales    |
| **Estado**        | TanStack Query, Zustand                 | Gestión de estado server/client     |
| **Backend**       | Node.js, Fastify, TypeScript            | API REST y servicios de fondo       |
| **Base de Datos** | PostgreSQL 16 + PostGIS (implícito)     | Almacenamiento persistente          |
| **Real-time**     | Socket.io                               | Actualizaciones en tiempo real      |
| **Integraciones** | Waze Feed, Open-Meteo                   | Fuentes de datos externas           |

---

## Backend (`apps/backend`)

El backend sigue una arquitectura de servicios modular con patrón Repository.

### Componentes Clave

1.  **WazePollingService** (`services/wazePollingService.ts`)

    - **Función**: Ingesta de datos desde el feed de Waze Partners.
    - **Proceso**: Polling cada 2 minutos → Filtrado por polígono → Upsert en DB.
    - **Importante**: Maneja discrepancias de datos (ej. `line` del feed se mapea a `polyline` en DB).

2.  **API Layer** (`server.ts`, `services/apiService.ts`)

    - Expone endpoints REST para el frontend.
    - `/api/jams/all`: Retorna embotellamientos activos.
    - `/api/polygons/status`: Retorna métricas de estado de corredores.
    - Usa `legacyMapper.ts` para transformar entidades DB a formato API legacy.

3.  **Repositories** (`repositories/`)

    - Abstracción de acceso a datos usando `pg` (node-postgres).
    - `WazeJamRepository`: Maneja `waze_jams`. **Nota**: `bulkUpsert` maneja lógica `ON CONFLICT` crítica.
    - `WazeAlertRepository`: Maneja `waze_alerts`.

4.  **WebSocket** (`services/websocketService.ts`)
    - Emite eventos `waze:update`, `weather:update` a salas por polígono.

### Flujo de Datos (Waze Jams)

1.  **Waze Feed**: JSON con array de `jams`. Campo geometría: `line`.
2.  **Polling**: `WazePollingService` lee el feed.
3.  **DB Insert**: `WazeJamRepository` inserta en `waze_jams`.
    - **Transformación**: `jam.line` → columna `polyline` (JSONB).
4.  **API Read**: `toLegacyJam` (`utils/legacyMapper.ts`) lee de DB.
    - **Transformación**: columna `polyline` → `line` (Array<{x,y}>) para el frontend.
5.  **Frontend**: `useWazeData` consume API y pasa a `MapLibreMap`.

---

## Frontend (`apps/frontend`)

Aplicación SPA React organizada por dominios.

### Componentes Principales

- **MapLibreMap** (`components/map/MapLibreMap.tsx`)

  - Renderiza el mapa base y capas.
  - **Capas Waze**:
    - `incidents-*`: Puntos de alertas (iconos).
    - `flow-line-*`: Líneas de tráfico (coloreadas por nivel).
    - `road-closure-lines`: Líneas de cierre de camino (rojas/punteadas).
  - Usa GeoJSON Sources generados dinámicamente.

- **AppSidebar** (`components/layout/AppSidebar.tsx`)
  - Panel lateral con métricas y lista de incidentes.
  - Permite filtrar por corredor vial.

### Gestión de Estado

- **useWazeData** (`hooks/useWazeData.ts`)
  - Hook principal que consume API backend con TanStack Query.
  - Sondea cada 30s-60s o escucha WebSockets.

---

## Base de Datos

Esquema relacional en PostgreSQL.

### Tablas Principales

- `waze_alerts`: Incidentes reportados (accidentes, peligros).
- `waze_jams`: Congestión y cierres.
  - `uuid`: PK.
  - `polyline`: Geometría (JSONB array de puntos).
  - `blocking_alert_uuid`: FK lógica a `waze_alerts` (para cierres).
- `polygons`: Definición de corredores viales.

---

## Convenciones de Código

- **Mappers**: Usar siempre `toLegacyJam`/`toLegacyAlert` de `utils/legacyMapper.ts`.
- **Traducciones**: Usar `utils/wazeTranslations.ts` para textos de tipos/subtipos (Backend).
- **Fechas**: Almacenar UTC en DB, serializar ISO-8601 en API.
- **Tipos**: Definiciones compartidas en `packages/types`.

## Deuda Técnica Identificada

1.  **Servicios de Clima**: Existe redundancia entre `weatherService.ts` (legacy, soporte AccuWeather) y `openMeteoService.ts` (activo). Se recomienda consolidar en `openMeteoService`.
2.  **Alert Service**: El servicio de alertas (`alertService.ts`) contiene lógica de negocio que podría estar duplicada en `wazePollingService` si se expande. Mantener separación estricta: Polling = Ingesta, AlertService = Inteligencia.
