# 📡 Documentación de API

Este documento detalla los endpoints REST y el canal en tiempo real (WebSocket) del backend del Panel Ejecutivo Waze.

## Base URL

- **REST**: path base `/api`. Ejemplo local: `http://localhost:3002/api`
- **WebSocket**: misma base que el backend (ej. `http://localhost:3002`), con Socket.IO.

---

## 🏥 Health Checks

Endpoints para monitoreo y orquestación (Kubernetes/Docker).

| Método | Endpoint        | Descripción                                                 |
| ------ | --------------- | ----------------------------------------------------------- |
| GET    | `/health`       | Estado completo del sistema (DB + Servicios + Recursos)     |
| GET    | `/health/live`  | Liveness probe (indica si el proceso está corriendo)        |
| GET    | `/health/ready` | Readiness probe (indica si está listo para recibir tráfico) |

## 🚦 Tráfico e Incidentes

### Obtener Incidentes (Filtros Avanzados)

Listado paginado con filtros.

- **GET** `/api/incidents`
- **Query Params**:
  - `type`: Tipo de incidente (ej. "ACCIDENT")
  - `subtype`: Subtipo
  - `from`: Fecha inicio (ISO)
  - `to`: Fecha fin (ISO)
  - `polygonId`: Filtrar por polígono
  - `isActive`: "true" / "false"
  - `page`: Número de página (default 1)
  - `limit`: Resultados por página (default 50)
  - `search`: Búsqueda texto (calle, ciudad, descripción)
- **Respuesta**: `{ incidents: [...], pagination: { total, page, limit } }`

### Obtener Incidentes (Mapa - Legacy)

Obtiene todos los incidentes activos de Waze para visualización rápida.

- **GET** `/api/incidents/all`
- **Respuesta**: Array de objetos de alerta de Waze.

### Obtener Embotellamientos (Jams)

Obtiene todos los embotellamientos activos de Waze.

- **GET** `/api/jams/all`
- **Respuesta**: Array de objetos de jam de Waze.

### Métricas de Tráfico

- **GET** `/api/traffic-metrics`: Métricas de tráfico de todos los polígonos.
- **GET** `/api/traffic-metrics/:polygonId`: Métricas específicas para un polígono.

### KPIs Globales

- **GET** `/api/kpis/global`: Resumen de KPIs globales del sistema.

## 🗺️ Polígonos

Gestión de áreas de monitoreo.

| Método | Endpoint            | Descripción                             |
| ------ | ------------------- | --------------------------------------- |
| GET    | `/api/polygons`     | Listar todos los polígonos configurados |
| GET    | `/api/polygons/:id` | Obtener detalle de un polígono          |
| POST   | `/api/polygons`     | Crear nuevo polígono                    |
| PUT    | `/api/polygons/:id` | Actualizar polígono existente           |
| DELETE | `/api/polygons/:id` | Eliminar polígono                       |

## 📋 Catálogos

Gestión de tipos y subtipos de incidentes.

### Tipos de Incidentes

| Método | Endpoint                  | Descripción                            |
| ------ | ------------------------- | -------------------------------------- |
| GET    | `/api/catalogs`           | Listar jerarquía completa de catálogos |
| GET    | `/api/catalogs/stats`     | Estadísticas de uso de catálogos       |
| POST   | `/api/catalogs/types`     | Crear tipo                             |
| PUT    | `/api/catalogs/types/:id` | Actualizar tipo                        |
| DELETE | `/api/catalogs/types/:id` | Eliminar tipo                          |

### Subtipos

| Método | Endpoint                     | Descripción        |
| ------ | ---------------------------- | ------------------ |
| POST   | `/api/catalogs/subtypes`     | Crear subtipo      |
| PUT    | `/api/catalogs/subtypes/:id` | Actualizar subtipo |
| DELETE | `/api/catalogs/subtypes/:id` | Eliminar subtipo   |

### Sincronización

- **POST** `/api/catalogs/sync`: Fuerza la sincronización de catálogos desde los feeds de Waze.

## 🔊 TTS (Text-to-Speech)

| Método | Endpoint          | Descripción                                                                                   |
| ------ | ----------------- | --------------------------------------------------------------------------------------------- |
| POST   | `/api/tts/speak`  | Genera audio. Body: `{ text: string, voice?, rate?, pitch? }`. Respuesta: audio MP3 (binary). |
| GET    | `/api/tts/voices` | Lista voces disponibles (Edge TTS).                                                           |
| GET    | `/api/tts/test`   | Audio de prueba (demo).                                                                       |

Ver [TTS.md](./TTS.md) para flujo, cola y estado en el frontend.

---

## 📡 WebSocket (Socket.IO)

Conexión al mismo host del backend (ej. `http://localhost:3002`). Eventos principales:

| Evento                | Dirección          | Descripción                                                                                                    |
| --------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `notification:new`    | Servidor → Cliente | Nueva notificación (alerta Waze traducida). El cliente la añade al store y puede reproducir TTS según filtros. |
| `subscribe:polygon`   | Cliente → Servidor | Suscripción a actualizaciones de un polígono (payload: `polygonId`).                                           |
| `unsubscribe:polygon` | Cliente → Servidor | Desuscripción de un polígono.                                                                                  |
| `subscribe:global`    | Cliente → Servidor | Suscripción a actualizaciones globales.                                                                        |

---

## 📬 Notificaciones

| Método | Endpoint             | Descripción                                                        |
| ------ | -------------------- | ------------------------------------------------------------------ |
| GET    | `/api/notifications` | Lista notificaciones recientes. Query: `limit` (opcional, ej. 50). |

---

## 📊 Incidentes e histórico

| Método | Endpoint                  | Descripción                                                            |
| ------ | ------------------------- | ---------------------------------------------------------------------- |
| GET    | `/api/incidents/all`      | Incidentes activos (Waze).                                             |
| GET    | `/api/incidents/history`  | Histórico de incidentes (filtros: polygon_id, type, from, to, limit).  |
| GET    | `/api/incidents/hotspots` | Hotspots / agregación (min_incidents, radius_meters, from, to, limit). |
| GET    | `/api/incidents/stats`    | Estadísticas de incidentes.                                            |

(Endpoints exactos pueden variar; consultar rutas en `apps/backend` si es necesario.)

---

## 🎨 Recursos

### Proxy de Iconos

- **GET** `/api/icons/:iconName`: Proxy para obtener iconos SVG de Waze (caché y fallbacks).

---

## 🔐 Autenticación

(Documentación pendiente de implementación final de Auth.)
Actualmente la API puede esperar headers estándar o cookies de sesión para ciertas operaciones.
