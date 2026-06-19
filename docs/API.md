# Documentación de API

Endpoints REST y canal en tiempo real (WebSocket) del backend del Panel Ejecutivo Waze.

**Base URL producción:** `http://10.1.0.136/api` (vía nginx :80)  
**Base URL desarrollo:** `http://localhost:3002/api`  
**WebSocket:** mismo host que el backend (Socket.IO en `/socket.io`)

> La mayoría de endpoints requieren autenticación JWT (`Authorization: Bearer <token>`).

---

## Health Checks

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/health` | No | Estado completo (DB + servicios + recursos) |
| GET | `/health/live` | No | Liveness probe |
| GET | `/health/ready` | No | Readiness probe |
| GET | `/health/detailed` | No | Diagnóstico extendido |

---

## Autenticación (`/api/auth`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login email/password. Devuelve `{ token, user }` |
| POST | `/api/auth/logout` | Cerrar sesión actual |
| GET | `/api/auth/me` | Usuario autenticado con roles y permisos |
| GET | `/api/auth/sessions` | Listar sesiones activas del usuario |
| DELETE | `/api/auth/sessions/:id` | Revocar una sesión |
| POST | `/api/auth/sessions/revoke-all` | Revocar todas las sesiones |
| POST | `/api/auth/change-password` | Cambiar contraseña |
| PUT | `/api/auth/profile` | Actualizar perfil |

---

## Usuarios y Roles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET/POST | `/api/users` | Listar / crear usuarios |
| GET/PUT/DELETE | `/api/users/:id` | Detalle / actualizar / eliminar |
| GET/POST | `/api/roles` | Listar / crear roles |
| GET/PUT/DELETE | `/api/roles/:id` | Detalle / actualizar / eliminar |

---

## Tráfico e Incidentes Waze

### Incidentes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/incidents` | Listado paginado con filtros (type, subtype, from, to, polygonId, isActive, search) |
| GET | `/api/incidents/all` | Incidentes activos para mapa |
| GET | `/api/incidents/history` | Histórico (polygon_id, type, from, to, limit) |
| GET | `/api/incidents/stats` | Estadísticas globales |
| GET | `/api/incidents/types` | Tipos de incidente |
| GET | `/api/incidents/stats/global` | Stats globales extendidas |
| GET | `/api/incidents/delay/:id` | Retraso de un incidente |
| GET | `/api/incidents/delays/all` | Retrasos de todos |
| GET | `/api/incidents/blocking-analysis` | Análisis de bloqueos |

### Jams (congestión)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/jams/all` | Embotellamientos activos |
| GET | `/api/jams/:polygonId` | Jams por polígono |

### Métricas y KPIs

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/traffic-metrics` | Métricas de tráfico (todos los polígonos) |
| GET | `/api/traffic-metrics/:polygonId` | Métricas por polígono |
| GET | `/api/kpis/global` | KPIs globales |
| GET | `/api/metrics/global` | Métricas globales extendidas |
| GET | `/api/metrics/top-critical` | Top polígonos críticos |
| GET | `/api/tvt-metrics` | Métricas TVT (Travel Time) |

---

## Polígonos y Grupos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET/POST | `/api/polygons` | Listar / crear polígonos |
| GET/PUT/DELETE | `/api/polygons/:id` | Detalle / actualizar / eliminar |
| GET/POST | `/api/polygon-groups` | Grupos de polígonos |
| GET/PUT/DELETE | `/api/polygon-groups/:id` | Detalle / actualizar / eliminar |

---

## Siniestros Viales (RAC)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET/POST | `/api/accidents` | Listar / registrar siniestro |
| GET/PATCH/DELETE | `/api/accidents/:id` | Detalle / actualizar / eliminar |
| POST | `/api/accidents/:id/media` | Subir multimedia |
| PATCH | `/api/accidents/:id/weather` | Actualizar clima histórico del siniestro |
| POST | `/api/accidents/backfill-weather` | Backfill clima (hasta 92 días) |
| GET | `/api/road-accidents/map` | Siniestros para visualización en mapa |

---

## Zonas Peligrosas

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET/POST | `/api/zonas-peligrosas` | Sí (RBAC) | CRUD zonas peligrosas RAC (activo) |
| GET/PUT/DELETE | `/api/zonas-peligrosas/:id` | Sí | Detalle / actualizar / eliminar |
| GET/POST | `/api/danger-zones` | No | API legacy (deprecada, sin auth) |

---

## Hitos Kilométricos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET/POST | `/api/kilometers` | Listar / crear mojones |
| GET/PUT/DELETE | `/api/kilometers/:id` | Detalle / actualizar / eliminar |

---

## Clima

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/weather/:polygon_id` | Clima actual del polígono |
| GET | `/api/weather/:polygon_id/history` | Histórico meteorológico |
| GET | `/api/weather/all` | Clima de todos los polígonos |
| GET | `/api/weather/alerts` | Alertas meteorológicas activas |

---

## Histórico y Estadísticas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/historical/global` | Histórico global |
| GET | `/api/historical/polygon/:id` | Histórico por polígono |
| GET | `/api/historical/trends` | Tendencias |
| GET | `/api/historical/availability` | Disponibilidad de datos |
| GET | `/api/historical/incidents/hotspots` | Hotspots (min_incidents, radius_meters, from, to) |
| GET | `/api/stats/daily` | Estadísticas diarias |
| GET | `/api/stats/weekly` | Estadísticas semanales |
| GET | `/api/stats/monthly` | Estadísticas mensuales |
| GET | `/api/analytics/realtime` | Analítica en tiempo real |

---

## Calidad de Datos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/data-quality/report` | Reporte de calidad |
| GET | `/api/data-quality/metrics` | Métricas de calidad |
| GET | `/api/data-quality/feed-status` | Estado de feeds externos |
| GET | `/api/data-quality/thresholds` | Umbrales configurados |

---

## Alertas Internas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/alerts` | Listar alertas |
| GET | `/api/alerts/stats` | Estadísticas de alertas |
| GET | `/api/alerts/severity/:severity` | Filtrar por severidad |
| POST | `/api/alerts/:alertId/acknowledge` | Reconocer alerta |

---

## Catálogos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/catalogs` | Jerarquía completa de tipos/subtipos |
| GET | `/api/catalogs/stats` | Estadísticas de uso |
| POST/PUT/DELETE | `/api/catalogs/types` | CRUD tipos |
| POST/PUT/DELETE | `/api/catalogs/subtypes` | CRUD subtipos |
| POST | `/api/catalogs/sync` | Sincronizar desde feeds Waze |

---

## Notificaciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/notifications` | Listar notificaciones (`limit` opcional) |
| PATCH | `/api/notifications/:id/read` | Marcar como leída |
| POST | `/api/notifications/read-all` | Marcar todas como leídas |
| POST | `/api/notifications/test` | Emitir notificación de prueba (WebSocket) |

---

## TTS (Text-to-Speech)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/tts/speak` | Genera audio MP3. Body: `{ text, voice?, rate?, pitch? }` |
| GET | `/api/tts/voices` | Voces Edge TTS disponibles |
| GET | `/api/tts/test` | Audio de demostración |

Ver [TTS.md](./TTS.md) para flujo completo, cola y eventos WebSocket.

---

## Recursos y Tiles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/icons/:iconName` | Proxy de iconos SVG Waze |
| POST | `/api/upload/icon` | Subir icono personalizado |
| GET | `/tiles/v2/carto-dark/:z/:x/:y.png` | Tile proxy mapa oscuro |
| GET | `/tiles/v2/carto-light/:z/:x/:y.png` | Tile proxy mapa claro |

---

## Risk Scoring (opcional)

> Solo disponible con `ENABLE_RISK_SCORING=1`. No activo en producción actual.

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/risk/scores` | Scores de riesgo por polígono |
| GET | `/api/risk/predictions` | Predicciones |
| POST | `/api/risk/triage` | Clasificación de riesgo |
| POST | `/api/risk/train` | Entrenamiento de modelo |

---

## WebSocket (Socket.IO)

### Eventos servidor → cliente

| Evento | Descripción |
|--------|-------------|
| `waze:data_updated` | Ciclo de ingesta completado. Invalida caches React Query en todos los paneles |
| `notification:new` | Nueva alerta Waze. TTS y snackbar en el cliente |
| `red_zone_critical_alert` | Incidente en zona peligrosa RAC. Sirena + TTS prioritario (deduplicado vs `notification:new`) |
| `play_audio_alert` | Emitido con alertas críticas; el sonido real se delega a `notification:new` / `red_zone_critical_alert` |
| `waze:update` | Actualización de un polígono específico (room) |
| `risk:update` | Score de riesgo recalculado (solo con feature flag) |

### Eventos cliente → servidor

| Evento | Descripción |
|--------|-------------|
| `subscribe:polygon` | Suscripción a polígono (`polygonId`) |
| `unsubscribe:polygon` | Desuscripción |
| `subscribe:global` | Suscripción global |

---

## Velocidad

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/speed/comparison/:polygonId` | Comparación de velocidad |
| GET | `/api/speed/comparison/all` | Comparación global |

---

_Última actualización: Junio 2026_
