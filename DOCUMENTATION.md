# Documentación del panel Waze Monitoreados

## Arquitectura del módulo de zonas peligrosas (geofencing RAC)

Este módulo permite definir polígonos de exclusión operativa sobre la Red de Accesos a Córdoba (RAC) y reaccionar en tiempo real cuando el feed de Waze reporta incidentes cuyas coordenadas caen dentro de esas áreas.

### Componentes

1. **PostgreSQL — tabla `zonas_peligrosas`**
   - Almacena `nombre`, `geometria` (GeoJSON `Polygon` en **JSONB**), `nivel_severidad` (1 = naranja, 2 = rojo), `protocolo_accion`, `fecha_creacion` y `activa`.
   - La evaluación espacial en el backend usa **Turf.js** (`booleanPointInPolygon`) sobre el GeoJSON, sin depender de la extensión PostGIS en el servidor. Opcionalmente se puede añadir una columna `geometry(Polygon,4326)` y GIST (ver comentarios en `apps/backend/scripts/create-red-zones-table.sql`).

2. **Ingesta Waze — `wazePollingService` + `wazeService`**
   - Tras normalizar y enriquecer las alertas del polígono, `enrichAlertsWithRedZoneFlags()` (en `apps/backend/src/services/wazeService.ts`) carga las zonas activas (con caché ~60 s) y marca cada `WazeAlert` con `isRedZone` y `redZoneMatch` si el punto del incidente intersecta algún polígono.
   - En `processCriticalNotificationsBatch`, si hay coincidencia se emite por **event bus** el evento `RED_ZONE_CRITICAL_ALERT` (separado del broadcast agregado `waze:data_updated`).

3. **WebSockets — `SocketSubscriber`**
   - El bus interno recibe `RED_ZONE_CRITICAL_ALERT` y el suscriptor emite por Socket.IO el evento dedicado **`red_zone_critical_alert`** con el payload del incidente y metadatos de la zona (`redZonaNombre`, `protocolo_accion`, `nivel_severidad`).
   - El ciclo global `waze:data_updated` sigue siendo el mecanismo de invalidación de caches; la alerta crítica de zona **no** se mezcla con ese resumen.

4. **Frontend**
   - **Mapa**: `Map.tsx` delega en **MapLibre** (`MapLibreMap`) para dibujar y editar polígonos (sin segundo motor Leaflet). Los datos se envían con `POST /api/zonas-peligrosas`.
   - **Cliente WS** (`apps/frontend/src/services/websocket.ts`): escucha `red_zone_critical_alert`, deduplica por UUID (~45 s), reproduce una **sirena** distinta al beep de notificaciones estándar y encola el ítem en `useRedZoneCriticalStore`.
   - **Alertas** (`AlertsPanel.tsx`): muestra en la parte superior las entradas de zona peligrosa con borde rojo animado y el texto `🚨 ZONA PELIGROSA: [protocolo]`.

### Inicialización de la tabla

Desde el directorio `apps/backend`:

```bash
npm run sql:create-red-zones
```

Equivale a ejecutar `src/scripts/run-create-red-zones-table.ts`, que lee `scripts/create-red-zones-table.sql` y lo aplica con la misma configuración de variables de entorno que el servidor (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).

La migración automática del arranque también incluye `043_create_zonas_peligrosas.sql` vía `runMigrations`.

### Referencia externa

Patrones de interacción con polígonos en mapas (mostrar/ocultar, eventos de clic) son análogos a los descritos en guías clásicas de overlays en mapas; en este proyecto se unificó en MapLibre GL por rendimiento y una sola pila tecnológica ([eventos y polígonos en mapas](https://desarrolloweb.com/articulos/eventos-poligonos-google-maps.html) ilustra el patrón conceptual show/hide + listeners).
