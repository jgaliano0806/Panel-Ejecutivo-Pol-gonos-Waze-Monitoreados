---
trigger: always_on
---

# Workspace Rules - Panel Waze Monitoreados

## STACK TECNOLÓGICO

**Backend:** Fastify + TypeScript + PostgreSQL 16 + Redis + Socket.io
**Frontend:** React 18 + Vite + Tailwind + Leaflet + TanStack Query + Zustand + Radix UI
**APIs:** Waze Traffic Feed + Open-Meteo Weather

---

## CONVENCIONES TYPESCRIPT

```typescript
// ✅ Strict mode, interfaces, no any
interface WazeAlert {
  uuid: string;
  type: string;
  location: { x: number; y: number };
}

async function process(alert: WazeAlert): Promise<void> {
  try {
    await db.query('INSERT INTO alerts VALUES ($1)', [alert.uuid]);
  } catch (error) {
    logger.error('Process failed', { error, alert });
    throw error;
  }
}
```

**Naming:** camelCase archivos/funciones, PascalCase clases, UPPER_SNAKE_CASE constantes
**Ubicación tipos:** `/packages/types/src/`

---

## ESTRUCTURA PROYECTO

```
apps/
  backend/src/       # Source TypeScript
  backend/dist/      # Compilado
  frontend/src/
packages/
  types/src/         # Tipos compartidos
  config/
  shared/
  database/
tests/e2e/
```

---

## WAZE TRAFFIC FEED

**URL:** `https://www.waze.com/partnerhub-api/partners/11387019565/waze-feeds/{token}?format=1`
**Actualización:** Cada 2 minutos
**Límite:** 5000 eventos máximo por feed
**Formato:** JSON GeoRSS

### Tipos de Datos

**1. Alerts** (Reportes de usuarios)
```typescript
type: 'ACCIDENT' | 'JAM' | 'WEATHERHAZARD' | 'HAZARD' | 'ROAD_CLOSED'
subtype: 'ACCIDENT_MAJOR' | 'HAZARD_ON_ROAD_OBJECT' | etc
reliability: 0-10  // Usuario experimentado
confidence: 0-10   // Validación por comunidad
```

**2. Jams** (Embotellamientos calculados)
```typescript
level: 0-5  // 0=light, 5=standstill
speedKMH: number
delay: seconds
length: meters
line: [{x, y}]  // Polyline
```

**3. Irregularities** (Tráfico anómalo)
```typescript
severity: number
jamLevel: number
speed vs regularSpeed
trend: -1 (mejora) | 0 (constante) | 1 (empeora)
```

### Almacenamiento DB

```sql
-- Tabla principal alerts
CREATE TABLE waze_alerts (
  uuid VARCHAR(100) PRIMARY KEY,
  polygon_id VARCHAR(50),
  type VARCHAR(50),
  subtype VARCHAR(100),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  street VARCHAR(255),
  pub_millis BIGINT,
  reliability DECIMAL(3,1),
  confidence DECIMAL(3,1),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla jams
CREATE TABLE waze_jams (
  uuid VARCHAR(100) PRIMARY KEY,
  polygon_id VARCHAR(50),
  level INTEGER,
  polyline JSONB,
  speed_kmh DECIMAL(6,2),
  delay_seconds INTEGER,
  length_meters DECIMAL(10,2),
  street VARCHAR(255),
  pub_millis BIGINT,
  is_active BOOLEAN DEFAULT true
);

-- Tabla irregularities
CREATE TABLE waze_irregularities (
  uuid VARCHAR(100) PRIMARY KEY,
  polygon_id VARCHAR(50),
  type VARCHAR(50),
  severity DECIMAL(3,1),
  jam_level INTEGER,
  speed DECIMAL(6,2),
  regular_speed DECIMAL(6,2),
  delay_seconds INTEGER,
  trend INTEGER,
  polyline JSONB,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_alerts_polygon ON waze_alerts(polygon_id, is_active);
CREATE INDEX idx_jams_polygon ON waze_jams(polygon_id, is_active);
```

### Polling Service

**Ubicación:** `/apps/backend/src/services/wazePollingService.ts`
**Intervalo:** 120 segundos (2 min)
**Rate limit:** 1 req/seg máximo

```typescript
class WazePollingService {
  async poll() {
    const data = await fetch(WAZE_FEED_URL);
    await this.filterByPolygons(data);
    await this.storeToDB(data);
    await this.emitWebSocket(data);
    await cache.invalidate('waze:*');
  }
}
```

---

## OPEN-METEO WEATHER API

**URL Base:** `https://api.open-meteo.com/v1/forecast`
**API Key:** No requiere
**Rate limit:** Sin límite (gratuito)
**Actualización:** Cada hora (modelos locales)
**Resolución:** 1-11km según ubicación

### Variables Críticas

```typescript
const WEATHER_VARS = [
  'temperature_2m',        // °C
  'precipitation',         // mm/h
  'weather_code',          // WMO 0-99
  'wind_speed_10m',        // km/h
  'visibility',            // metros
  'relative_humidity_2m',  // %
] as const;
```

### WMO Weather Codes

```typescript
const CRITICAL_CODES = {
  45: 'Fog',                    // Peligroso
  48: 'Depositing rime fog',    // Peligroso
  61: 'Rain slight',
  63: 'Rain moderate',          // Peligroso
  65: 'Rain heavy',             // Peligroso
  71: 'Snow fall slight',
  73: 'Snow fall moderate',     // Peligroso
  75: 'Snow fall heavy',        // Peligroso
  95: 'Thunderstorm',           // Peligroso
  96: 'Thunderstorm with hail', // Peligroso
};
```

### Request Example

```typescript
const url = new URL('https://api.open-meteo.com/v1/forecast');
url.searchParams.set('latitude', '-31.4135');
url.searchParams.set('longitude', '-64.1811');
url.searchParams.set('current', 'temperature_2m,precipitation,weather_code,wind_speed_10m');
url.searchParams.set('hourly', 'temperature_2m,precipitation,visibility');
url.searchParams.set('timezone', 'auto');

const response = await fetch(url);
const data = await response.json();
```

### Response Structure

```json
{
  "latitude": -31.4135,
  "longitude": -64.1811,
  "current": {
    "time": "2025-01-29T15:00",
    "temperature_2m": 28.5,
    "precipitation": 0.0,
    "weather_code": 1,
    "wind_speed_10m": 12.3
  },
  "hourly": {
    "time": ["2025-01-29T00:00", ...],
    "temperature_2m": [22.1, 23.4, ...],
    "precipitation": [0.0, 0.0, ...]
  }
}
```

### DB Storage

```sql
CREATE TABLE polygon_weather_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  polygon_id VARCHAR(50),
  timestamp TIMESTAMPTZ,
  temperature_celsius DECIMAL(5,2),
  precipitation_mm DECIMAL(6,2),
  weather_code INTEGER,
  wind_speed_kmh DECIMAL(5,2),
  visibility_m INTEGER,
  humidity_percent DECIMAL(5,2),
  is_dangerous BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(polygon_id, timestamp)
);
```

### Condiciones Peligrosas

```typescript
function isDangerous(weather: OpenMeteoData): boolean {
  if (weather.precipitation > 10) return true;        // Lluvia intensa
  if (weather.visibility < 1000) return true;         // Baja visibilidad
  if (weather.wind_speed_10m > 60) return true;       // Viento fuerte
  if (weather.weather_code >= 71) return true;        // Nieve/tormenta
  if ([45, 48].includes(weather.weather_code)) return true; // Niebla
  return false;
}
```

---

## DATABASE

**PostgreSQL con pooling**
**Service:** `/apps/backend/src/database/dbService.ts`
**SIEMPRE prepared statements**

```typescript
// ✅ CORRECTO
await db.query('SELECT * FROM alerts WHERE id = $1', [id]);

// ❌ INCORRECTO - SQL Injection
await db.query(`SELECT * FROM alerts WHERE id = '${id}'`);
```

---

## REDIS CACHING

**TTLs por tipo:**
```typescript
const TTL = {
  WAZE_ALERTS: 60,      // 1 min
  WAZE_JAMS: 60,        // 1 min
  WEATHER: 300,         // 5 min (Open-Meteo actualiza c/hora)
  RISK_SCORE: 120,      // 2 min
  POLYGONS: 3600,       // 1 hora
};
```

**Keys pattern:** `{service}:{resource}:{id}`
Ejemplos: `waze:alerts:P001`, `weather:current:-31.41,-64.18`

---

## WEBSOCKETS

**Socket.io para real-time**
**Rooms por polígono:** `polygon:{id}`

```typescript
// Backend - emitir cambios
io.to(`polygon:${id}`).emit('waze:update', alerts);
io.to(`polygon:${id}`).emit('weather:update', weather);
io.to(`polygon:${id}`).emit('risk:update', score);

// Frontend - escuchar
socket.on('waze:update', (data) => {
  queryClient.setQueryData(['waze', polygonId], data);
});
```

---

## FRONTEND

**Leaflet + react-leaflet** para mapas
**MarkerClusterGroup** para 100+ markers
**TanStack Query** server state, **Zustand** client state
**Radix UI** componentes, **Tailwind** estilos

```tsx
// Clustering
<MarkerClusterGroup
  chunkedLoading
  maxClusterRadius={50}
  iconCreateFunction={createCustomIcon}
>
  {alerts.map(a => <Marker key={a.uuid} {...a} />)}
</MarkerClusterGroup>

// Heatmap
const heat = L.heatLayer(scores.map(s => [s.lat, s.lon, s.score/100]), {
  radius: 25,
  gradient: { 0.0: '#22c55e', 0.6: '#f97316', 1.0: '#991b1b' }
});
```

---

## GIT COMMITS

**Conventional Commits:** `tipo(scope): descripción`

Tipos: feat, fix, docs, style, refactor, test, chore
Ejemplos:
- `feat(waze): agregar polling service para alerts`
- `fix(weather): corregir parseo de WMO codes`
- `refactor(db): optimizar indices de waze_jams`

---

## EXCLUSIONES (Optimizar tokens)

**NO analizar:**
- `node_modules/`, `dist/`, `coverage/`, `.git/`
- `*.log`, `package-lock.json`, `*.map`
- Data histórica (salvo si se solicita explícitamente)

---

## RECURSOS DOCUMENTACIÓN

- Open-Meteo: https://open-meteo.com/en/docs
- Waze Partners: https://support.google.com/waze/partners/
- Leaflet: https://leafletjs.com/reference.html
- TanStack Query: https://tanstack.com/query/latest

responde siempre en español
