# 📊 Panel Ejecutivo - Polígonos Waze Monitoreados

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
3. [Instalación y Configuración](#instalación-y-configuración)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Componentes Principales](#componentes-principales)
6. [Backend - API](#backend---api)
7. [Frontend - Interfaz](#frontend---interfaz)
8. [Integración con Waze](#integración-con-waze)
9. [Métricas y KPIs](#métricas-y-kpis)
10. [Optimizaciones Implementadas](#optimizaciones-implementadas)
11. [Guía de Uso](#guía-de-uso)
12. [Troubleshooting](#troubleshooting)

---

## 📝 Descripción General

Panel ejecutivo en tiempo real para monitoreo de 66 polígonos viales en Córdoba, Argentina, integrando datos de tráfico de Waze API. El sistema proporciona visualización geoespacial, análisis de incidentes, y métricas de fluidez vehicular para la toma de decisiones operativas.

### **Características Principales:**

- ✅ **Monitoreo en Tiempo Real:** Actualización automática cada 120 segundos
- ✅ **66 Polígonos Monitoreados:** Cobertura completa de zonas críticas
- ✅ **Visualización Geoespacial:** Mapa interactivo con Leaflet
- ✅ **KPIs Ejecutivos:** Métricas de fluidez, incidentes críticos, y obras
- ✅ **Alertas Inteligentes:** Clasificación y priorización de incidentes
- ✅ **Sistema de Calidad de Datos:** Filtrado por Confidence/Reliability scores de Waze
- ✅ **Interfaz Optimizada:** Diseño Full HD (1920×1080) con popups informativos
- ✅ **Traducción al Español:** Todas las claves de Waze traducidas
- ✅ **Performance Optimizado:** Algoritmos O(n) y memoización React
- ✅ **Detección de Datos Obsoletos:** Identificación automática de incidentes no válidos
- ✅ **Monitoreo de Límites:** Alertas al alcanzar límite de 5000 eventos de Waze

---

## 🏗️ Arquitectura del Proyecto

### **Stack Tecnológico:**

#### **Frontend:**
```
- React 18.3.1 + TypeScript
- Vite 6.3.4 (Build tool + HMR)
- TailwindCSS 3.4.1 (Styling)
- React Query 5.64.0 (State management)
- Leaflet 1.9.4 + React-Leaflet 4.2.1 (Mapas)
- Lucide React (Iconografía)
```

#### **Backend:**
```
- Node.js + TypeScript
- Fastify 5.2.0 (Framework HTTP)
- Axios 1.7.9 (Cliente HTTP)
- @turf/turf 7.1.0 (Operaciones geoespaciales)
- Dotenv 16.4.7 (Variables de entorno)
- Nodemon 3.1.11 (Hot reload)
```

### **Arquitectura de Componentes:**

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Dashboard (Componente Principal)                    │  │
│  │  ├── Header (Última actualización)                   │  │
│  │  ├── KPICards (4 métricas principales)              │  │
│  │  ├── Filters (Selección de polígonos/grupos)        │  │
│  │  ├── Map (Leaflet - 90% ancho)                      │  │
│  │  │   ├── Polygons (66 polígonos coloreados)         │  │
│  │  │   ├── Incident Markers (Con popups)              │  │
│  │  │   └── Jam Markers (Con popups)                   │  │
│  │  ├── AlertsPanel (10% ancho - 15 alertas)           │  │
│  │  ├── PolygonDetail (Si hay selección)               │  │
│  │  ├── GroupStats (Estadísticas por grupo)            │  │
│  │  └── TopCritical (Top polígonos críticos)           │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↕ HTTP                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React Query (useWazeData hook)                      │  │
│  │  - Polling cada 30s                                  │  │
│  │  - Cache 5 min                                       │  │
│  │  - Automatic refetch                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ REST API
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Fastify Server (:3001)                              │  │
│  │  ├── /api/polygons        (Estado de polígonos)     │  │
│  │  ├── /api/incidents/all   (Todos los incidentes)    │  │
│  │  ├── /api/jams/all        (Todos los atascos)       │  │
│  │  ├── /api/kpis/global     (KPIs globales + stats)   │  │
│  │  └── /health              (Estado del servidor)     │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↕                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  WazeService (Ingesta de datos)                     │  │
│  │  - Ciclo cada 120 segundos                           │  │
│  │  - 66 feeds concurrentes                             │  │
│  │  - Normalización de datos                            │  │
│  │  - Caché en memoria                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↕                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ApiService (Lógica de negocio)                     │  │
│  │  - Cálculo de métricas (O(n))                        │  │
│  │  - Clasificación de estado                           │  │
│  │  - Agregación por grupo                              │  │
│  │  - Top polígonos críticos                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                      WAZE LIVE API                          │
│  66 feeds independientes (uno por polígono)                 │
│  - Alertas (incidentes viales)                              │
│  - Jams (atascos de tráfico)                                │
│  - Irregularidades (eventos especiales)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Instalación y Configuración

### **Requisitos Previos:**

```bash
Node.js >= 18.0.0
npm >= 9.0.0
Git
```

### **1. Clonar el Repositorio:**

```bash
git clone <repository-url>
cd "Panel Ejecutivo – Polígonos Waze Monitoreados"
```

### **2. Instalar Dependencias:**

```bash
# Frontend
npm install

# Backend
cd backend
npm install
cd ..
```

### **3. Configurar Variables de Entorno:**

Crear `backend/.env` basado en `backend/.env.example`:

```env
PORT=3001
NODE_ENV=development
```

### **4. Ejecutar el Proyecto:**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### **5. Acceder a la Aplicación:**

```
Frontend: http://localhost:5173
Backend:  http://localhost:3001
Health:   http://localhost:3001/health
```

---

## 📁 Estructura del Proyecto

```
Panel-Ejecutivo-Poligonos-Waze/
│
├── backend/                          # Servidor Node.js/Fastify
│   ├── src/
│   │   ├── config/
│   │   │   └── realPolygons.ts       # Configuración 66 polígonos
│   │   ├── services/
│   │   │   ├── wazeService.ts        # Ingesta de datos Waze
│   │   │   ├── apiService.ts         # Lógica de negocio
│   │   │   ├── alertService.ts       # Sistema de alertas
│   │   │   ├── aggregationService.ts # Agregación de métricas
│   │   │   ├── historicalService.ts  # Datos históricos
│   │   │   └── dataQualityService.ts # Calidad de datos (NUEVO)
│   │   ├── types/
│   │   │   └── index.ts              # Tipos TypeScript
│   │   └── server.ts                 # Servidor Fastify
│   ├── data/                         # Datos históricos
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── src/                              # Frontend React
│   ├── components/
│   │   ├── Map.tsx                   # Mapa Leaflet (principal)
│   │   ├── Dashboard.tsx             # Página principal
│   │   ├── Header.tsx                # Cabecera
│   │   ├── KPICards.tsx              # Tarjetas KPI
│   │   ├── KPICard.tsx               # Tarjeta KPI individual
│   │   ├── Filters.tsx               # Filtros
│   │   ├── AlertsPanel.tsx           # Panel de alertas
│   │   ├── PolygonDetail.tsx         # Detalle polígono
│   │   ├── GroupStats.tsx            # Estadísticas por grupo
│   │   ├── TopCritical.tsx           # Top polígonos críticos
│   │   └── Footer.tsx                # Pie de página
│   │
│   ├── hooks/
│   │   └── useWazeData.ts            # Hook React Query
│   │
│   ├── utils/
│   │   ├── polygonCalculations.ts    # Cálculos geométricos
│   │   ├── polygonHelpers.ts         # Helpers de polígonos
│   │   └── wazeTranslations.ts       # Traducciones Waze
│   │
│   ├── data/
│   │   └── mock/
│   │       └── realCordobaPolygons.ts # Geometrías polígonos
│   │
│   ├── types/
│   │   └── index.ts                  # Tipos TypeScript
│   │
│   ├── pages/
│   │   └── Dashboard.tsx             # Página dashboard
│   │
│   ├── App.tsx                       # Componente raíz
│   ├── main.tsx                      # Entry point
│   └── index.css                     # Estilos globales
│
├── scripts/
│   └── parsePolygons.cjs             # Script parseo WKT
│
├── public/                           # Assets estáticos
│
├── package.json                      # Dependencias frontend
├── vite.config.ts                    # Config Vite
├── tailwind.config.js                # Config Tailwind
├── tsconfig.json                     # Config TypeScript
├── .gitignore
├── README.md                         # Documentación básica
├── DOCUMENTATION.md                  # Esta documentación
├── MEJORAS_API_WAZE.md              # Documentación de mejoras (NUEVO)
├── RESUMEN_MEJORAS_WAZE.md          # Resumen ejecutivo (NUEVO)
├── INTEGRACION_FRONTEND.md          # Guía frontend (NUEVO)
└── PRUEBAS_CALIDAD_DATOS.md         # Guía de pruebas (NUEVO)
```

---

## 🧩 Componentes Principales

### **1. Dashboard (`src/pages/Dashboard.tsx`)**

Componente principal que orquesta toda la interfaz.

**Responsabilidades:**
- Gestión de estado (polígono/grupo seleccionado)
- Fetching de datos via `useWazeData`
- Cálculo de KPIs globales (fallback)
- Renderizado condicional de secciones

**Props:** Ninguna (página raíz)

**Estado:**
```typescript
const [selectedPolygon, setSelectedPolygon] = useState<string | null>(null);
const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
```

**Optimizaciones:**
- `useMemo` para KPIs y filtros
- `useCallback` para handlers
- Lazy loading del componente `Map`

---

### **2. Map (`src/components/Map.tsx`)**

Mapa interactivo Leaflet con polígonos, incidentes y atascos.

**Características:**
- 66 polígonos coloreados por estado
- Marcadores de incidentes con popups personalizados
- Marcadores de atascos con popups personalizados
- Auto-fit bounds al cargar
- Zoom automático al seleccionar polígono

**Popups:**

#### **Popup de Incidentes:**
```tsx
┌──────────────── Popup (1100px) ────────────────┐
│ Header: Tipo incidente + Timestamp            │
├────────────────────────────────────────────────┤
│ ┌─────────┐ ┌──────────┐ │ ┌──────┐ ┌──────┐│
│ │⚠️ Sever.│ │👍 Confirm│ │ │🗺️ Zona│ │📍 Cal│││
│ │ CRÍTICA │ │    5     │ │ │A-019-3│ │le ... │││
│ └─────────┘ └──────────┘ │ └──────┘ └──────┘│
│ ┌────────┐ ┌─────────┐                      │
│ │📊Rating│ │✓ Confiab│                      │
│ │ 2/10   │ │  10/10  │                      │
│ └────────┘ └─────────┘                      │
└────────────────────────────────────────────────┘
```

#### **Popup de Tránsito:**
```tsx
┌──────────────── Popup (1200px) ────────────────┐
│ Header: Nivel tráfico + Timestamp             │
├────────────────────────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │ ┌────┐ ┌────┐ │
│ │🏎️  │ │⏱️  │ │📏  │ │⚡  │ │ │🗺️  │ │📍  │ │
│ │7km │ │+3m │ │388m│ │4/5 │ │ │Zona│ │Calle│ │
│ └────┘ └────┘ └────┘ └────┘ │ └────┘ └────┘ │
│ ┌────┐ ┌─────────┐                           │
│ │🧭  │ │🛣️ Tipo  │                           │
│ │Norte│ │Ruta Nac.│                           │
│ └────┘ └─────────┘                           │
└────────────────────────────────────────────────┘
```

**Estilos de Cajas:**
- `border-3`: Bordes gruesos visibles
- `shadow-md`: Sombras para profundidad
- `rounded-xl`: Esquinas redondeadas
- `flex-col`: Layout vertical en cada caja
- `min-w-[XXXpx]`: Anchos mínimos garantizados
- Colores diferenciados por severidad/tipo

**Iconos:**
- Incidentes: Círculos coloreados por severidad
- Atascos: Círculos coloreados por nivel (0-5)
- Cache de iconos para performance

---

### **3. AlertsPanel (`src/components/AlertsPanel.tsx`)**

Panel lateral con listado de incidentes activos.

**Características:**
- Scroll vertical (800px altura)
- Límite configurable (default: 15)
- Traducción automática de tipos
- Información de calle y validaciones

**Estructura:**
```tsx
<div className="card">
  <Header>Alertas Activas</Header>
  <ScrollArea max-h-800px>
    {incidents.map(incident => (
      <AlertCard>
        <Icon + Tipo>
        <Calle + Severidad>
        <Timestamp>
      </AlertCard>
    ))}
  </ScrollArea>
</div>
```

---

### **4. KPICards (`src/components/KPICards.tsx`)**

Grid de 4 tarjetas con métricas principales.

**KPIs:**
1. **Fluidez General:** % de polígonos en estado fluido
2. **Incidentes Activos:** Total de alertas
3. **Polígonos Críticos:** Cantidad en estado alto
4. **Obras Activas:** Construcciones de severidad alta

**Formato:**
```tsx
<Grid cols-4>
  <KPICard icon={TrendingUp} value="85%" trend="+5%" />
  <KPICard icon={AlertTriangle} value="23" trend="-2" />
  <KPICard icon={AlertCircle} value="5" trend="0" />
  <KPICard icon={Construction} value="3" trend="+1" />
</Grid>
```

---

### **5. useWazeData Hook (`src/hooks/useWazeData.ts`)**

Custom hook para gestión de datos con React Query.

**Endpoints Consultados:**
```typescript
const fetchWazeData = async () => {
  const [polygons, incidents, jams, globalKPIs] = await Promise.all([
    fetch('/api/polygons'),
    fetch('/api/incidents/all'),
    fetch('/api/jams/all'),
    fetch('/api/kpis/global')
  ]);
  return { polygons, incidents, jams, globalKPIs };
};
```

**Configuración React Query:**
```typescript
{
  queryKey: ['wazeData'],
  queryFn: fetchWazeData,
  refetchInterval: 30000,        // 30 segundos
  staleTime: 30000,
  gcTime: 300000,                // 5 minutos
  retry: 3
}
```

**Optimizaciones:**
- Memoización de polígonos con `Map` (O(1) lookups)
- Combinación eficiente de geometría local + estado remoto
- Defaults arrays vacíos para evitar undefined

---

## 🔧 Backend - API

### **Servidor Fastify (`backend/src/server.ts`)**

**Configuración:**
```typescript
const app = fastify({
  logger: true,
  requestIdLogFactory: () => `req-${Date.now()}`
});

app.register(cors, {
  origin: 'http://localhost:5173',
  credentials: true
});
```

**Endpoints:**

#### **GET /api/polygons**
```json
Response: Array<{
  id: string;
  name: string;
  group: string;
  state: "LOW" | "MEDIUM" | "HIGH";
  incidentCount: number;
  jamCount: number;
  avgJamLevel: number;
  hasConstruction: boolean;
  hasClosure: boolean;
}>
```

#### **GET /api/incidents/all**
```json
Response: Array<{
  id: string;
  type: string;
  subtype: string;
  location: { lat: number; lng: number };
  street?: string;
  city?: string;
  severity: number;
  timestamp: string;
  polygonId: string | null;
  nThumbsUp: number;
  reportRating?: number;
  reliability?: number;
  confidence?: number;
}>
```

#### **GET /api/jams/all**
```json
Response: Array<{
  id: string;
  location: { lat: number; lng: number };
  endLocation?: { lat: number; lng: number };
  street?: string;
  city?: string;
  level: number;
  speed: number;
  delay: number;
  length: number;
  roadType?: string;
  turnType?: string;
  blockingAlertUuid?: string;
  timestamp: string;
  polygonId: string | null;
}>
```

#### **GET /api/kpis/global**
```json
Response: {
  fluidityPercentage: number;
  activeIncidents: number;
  criticalPolygons: number;
  activeConstructions: number;
  trends: {
    fluidityChange: number;
    incidentsChange: number;
  };
  groupStats?: Array<{
    group: string;
    totalPolygons: number;
    fluidPolygons: number;
    criticalPolygons: number;
    totalIncidents: number;
    avgJamLevel: number;
  }>;
  topCritical?: Array<{
    id: string;
    name: string;
    group: string;
    score: number;
    incidentCount: number;
    avgJamLevel: number;
  }>;
}
```

#### **GET /health**
```json
Response: {
  status: "ok";
  uptime: number;
  timestamp: string;
  memory: {
    used: number;
    total: number;
  };
}
```

#### **Endpoints de Calidad de Datos (NUEVOS)**

**GET /api/data-quality/report**
```json
Response: {
  timestamp: Date;
  metrics: QualityMetrics;
  byPolygon: Object;
  lowQualityIncidents: Array;
}
```

**GET /api/data-quality/metrics**
```json
Response: {
  totalIncidents: number;
  highQualityIncidents: number;
  avgConfidence: number;
  avgReliability: number;
  qualityPercentage: number;
}
```

**GET /api/data-quality/incidents/high-quality**
- Retorna solo incidentes con alta confiabilidad

**GET /api/data-quality/incidents/prioritized**
- Retorna incidentes ordenados por prioridad (calidad + severidad)

**GET /api/data-quality/incidents/stale?maxAge=30**
- Retorna incidentes probablemente obsoletos

**GET /api/data-quality/feed-status**
```json
Response: {
  nearLimit: boolean;
  atLimit: boolean;
  totalEvents: number;
  percentage: number;
}
```

**GET /api/data-quality/thresholds**
- Retorna umbrales de calidad configurados

**POST /api/data-quality/thresholds**
- Actualiza umbrales dinámicamente

**Características:**
- Cache HTTP (30 segundos)
- Error handler global
- Logging estructurado
- CORS habilitado
- Sistema de calidad basado en scores de Waze

---

### **WazeService (`backend/src/services/wazeService.ts`)**

Servicio de ingesta de datos desde Waze Live API.

**Ciclo de Actualización:**
```typescript
const startIngestion = () => {
  fetchAndProcess(); // Ejecución inmediata
  setInterval(fetchAndProcess, 120000); // Cada 120 segundos
};
```

**Proceso de Ingesta:**
```
1. Fetch concurrente de 66 feeds
   ↓
2. Extracción de alerts + jams
   ↓
3. Normalización de datos
   ↓
4. Asignación a polígonos (punto en polígono)
   ↓
5. Almacenamiento en memoria
   ↓
6. Logging de performance
```

**Normalización:**
```typescript
const normalizeAlerts = (rawAlerts: WazeRawAlert[]): WazeAlert[] => {
  return rawAlerts.map(alert => ({
    id: alert.uuid,
    type: alert.type,
    subtype: alert.subtype,
    location: alert.location,
    street: alert.street,
    city: alert.city,
    reportRating: alert.reportRating,
    confidence: alert.confidence,
    reliability: alert.reliability,
    nThumbsUp: alert.nThumbsUp || 0,
    timestamp: new Date().toISOString()
  }));
};
```

**Performance:**
- Fetch paralelo con `Promise.all`
- Consolidación eficiente (sin spread en loops)
- Error handling por feed individual
- Tracking de tiempo de procesamiento

---

### **ApiService (`backend/src/services/apiService.ts`)**

Lógica de negocio y cálculo de métricas.

**Cálculo de Estado de Polígonos (Optimizado O(n)):**
```typescript
const getPolygonsStatus = () => {
  // Crear Maps para O(1) lookups
  const alertsByPolygon = new Map<string, WazeAlert[]>();
  const jamsByPolygon = new Map<string, WazeJam[]>();

  // Agrupar alerts y jams por polígono (O(n))
  for (const alert of alerts) {
    if (alert.polygonId) {
      if (!alertsByPolygon.has(alert.polygonId)) {
        alertsByPolygon.set(alert.polygonId, []);
      }
      alertsByPolygon.get(alert.polygonId)!.push(alert);
    }
  }

  // Similar para jams...

  // Calcular métricas por polígono (O(n))
  return REAL_POLYGONS.map(polygon => {
    const polygonAlerts = alertsByPolygon.get(polygon.id) || [];
    const polygonJams = jamsByPolygon.get(polygon.id) || [];

    // Métricas en un solo loop
    const incidentCount = polygonAlerts.length;
    const jamCount = polygonJams.length;
    const avgJamLevel = calculateAvgJamLevel(polygonJams);
    const hasConstruction = checkConstruction(polygonAlerts);
    const hasClosure = checkClosure(polygonAlerts);

    // Clasificar estado
    const state = classifyState({
      jamCount,
      avgJamLevel,
      hasConstruction,
      hasClosure
    });

    return {
      id: polygon.id,
      name: polygon.name,
      group: polygon.group,
      state,
      incidentCount,
      jamCount,
      avgJamLevel,
      hasConstruction,
      hasClosure
    };
  });
};
```

**Clasificación de Estado:**
```typescript
const classifyState = (metrics) => {
  if (metrics.hasClosure) return PolygonState.HIGH;
  if (metrics.hasConstruction && metrics.jamCount > 2) return PolygonState.HIGH;
  if (metrics.avgJamLevel >= 4) return PolygonState.HIGH;
  if (metrics.avgJamLevel >= 3 || metrics.jamCount >= 3) return PolygonState.MEDIUM;
  return PolygonState.LOW;
};
```

---

## 🌐 Integración con Waze

### **API de Waze Live**

**Base URL:** `https://www.waze.com/live-map/api`

**Endpoint por Polígono:**
```
/georss?
  types=alerts,traffic,irregularities
  &polygon=<coordinates>
  &format=JSON
```

**Tipos de Datos:**

#### **1. Alerts (Incidentes):**
```typescript
{
  uuid: string;
  type: "ACCIDENT" | "HAZARD" | "JAM" | "ROAD_CLOSED" | ...;
  subtype: string;
  location: { x: number; y: number };
  street?: string;
  city?: string;
  reportRating?: number;
  confidence?: number;
  reliability?: number;
  nThumbsUp?: number;
  pubMillis: number;
}
```

**Tipos de Incidentes:**
- ACCIDENT
- HAZARD_ON_ROAD
- HAZARD_ON_SHOULDER
- HAZARD_WEATHER
- ROAD_CLOSED
- WEATHERHAZARD
- CONSTRUCTION

#### **2. Jams (Atascos):**
```typescript
{
  uuid: string;
  line: Array<{ x: number; y: number }>;
  street?: string;
  city?: string;
  level: number;  // 0-5
  speed: number;  // km/h
  delay: number;  // segundos
  length: number; // metros
  roadType?: number;
  turnType?: string;
  blockingAlertUuid?: string;
  pubMillis: number;
}
```

#### **3. Irregularities (Eventos):**
```typescript
{
  uuid: string;
  type: string;
  location: { x: number; y: number };
  description?: string;
  startMillis: number;
  endMillis: number;
}
```

---

### **Configuración de Polígonos (`backend/src/config/realPolygons.ts`)**

**Estructura:**
```typescript
interface RealPolygonConfig {
  id: string;
  name: string;
  group: string;
  feedUrl: string;
  polygon: string; // WKT format
}

export const REAL_POLYGONS: RealPolygonConfig[] = [
  {
    id: "A-019-1",
    name: "A-019 - 1",
    group: "Autovía A-019",
    feedUrl: "https://www.waze.com/live-map/api/georss?...",
    polygon: "POLYGON((...))"
  },
  // ... 65 más
];
```

**Grupos de Polígonos:**
```
1. Autovía A-019 (8 polígonos)
2. Ruta Nacional 9 (10 polígonos)
3. Ruta Nacional 19 (5 polígonos)
4. Ruta Nacional 36 (11 polígonos)
5. Ruta Provincial 5 (3 polígonos)
6. Ruta Provincial E53 (6 polígonos)
7. Ruta Provincial E55 (4 polígonos)
8. Ruta Provincial 13 (1 polígono)
9. Ruta Provincial 66 (3 polígonos)
10. Área Capital (13 polígonos)
11. Varios (2 polígonos)
```

**Helpers:**
```typescript
getAllGroups(): string[]
getPolygonsByGroup(group: string): RealPolygonConfig[]
```

---

## 📊 Métricas y KPIs

### **KPIs Globales:**

#### **1. Fluidez General**
```typescript
fluidityPercentage = (polígonos con state LOW / total polígonos) × 100
```
- **Objetivo:** > 80%
- **Crítico:** < 60%

#### **2. Incidentes Activos**
```typescript
activeIncidents = total de alertas en todos los polígonos
```
- **Normal:** 0-20
- **Alerta:** 20-40
- **Crítico:** > 40

#### **3. Polígonos Críticos**
```typescript
criticalPolygons = polígonos con state HIGH
```
- **Normal:** 0-5
- **Alerta:** 5-10
- **Crítico:** > 10

#### **4. Obras Activas**
```typescript
activeConstructions = incidentes tipo CONSTRUCTION con severity >= 3
```
- **Normal:** 0-5
- **Monitorear:** > 5

---

### **Métricas por Polígono:**

#### **Estado (PolygonState):**
```typescript
enum PolygonState {
  LOW = "LOW",        // Verde - Fluido
  MEDIUM = "MEDIUM",  // Amarillo - Moderado
  HIGH = "HIGH"       // Rojo - Crítico
}
```

**Criterios:**
```
HIGH:
- Tiene cierres (ROAD_CLOSED)
- Tiene construcción + más de 2 atascos
- Nivel promedio de atascos ≥ 4

MEDIUM:
- Nivel promedio de atascos ≥ 3
- 3 o más atascos

LOW:
- Todo lo demás
```

#### **Métricas Calculadas:**
```typescript
{
  incidentCount: number;      // Total de incidentes
  jamCount: number;           // Total de atascos
  avgJamLevel: number;        // Promedio nivel atascos (0-5)
  hasConstruction: boolean;   // Tiene obras activas
  hasClosure: boolean;        // Tiene cierres de ruta
}
```

---

### **Estadísticas por Grupo:**

```typescript
interface GroupStats {
  group: string;
  totalPolygons: number;
  fluidPolygons: number;
  criticalPolygons: number;
  totalIncidents: number;
  avgJamLevel: number;
}
```

**Cálculo:**
```typescript
const getGroupStats = () => {
  const groups = getAllGroups();
  return groups.map(group => {
    const groupPolygons = polygonsStatus.filter(p => p.group === group);
    return {
      group,
      totalPolygons: groupPolygons.length,
      fluidPolygons: groupPolygons.filter(p => p.state === PolygonState.LOW).length,
      criticalPolygons: groupPolygons.filter(p => p.state === PolygonState.HIGH).length,
      totalIncidents: groupPolygons.reduce((sum, p) => sum + p.incidentCount, 0),
      avgJamLevel: calculateAvgJamLevel(groupPolygons)
    };
  });
};
```

---

### **Top Polígonos Críticos:**

```typescript
interface TopCriticalPolygon {
  id: string;
  name: string;
  group: string;
  score: number;
  incidentCount: number;
  avgJamLevel: number;
}
```

**Fórmula de Score:**
```typescript
score = (incidentCount × 10) + (avgJamLevel × 20) + (hasConstruction ? 50 : 0) + (hasClosure ? 100 : 0)
```

**Top 10:**
```typescript
const getTopCriticalPolygons = () => {
  return polygonsStatus
    .map(p => ({
      ...p,
      score: calculateScore(p)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
};
```

---

## ⚡ Optimizaciones Implementadas

### **Frontend:**

#### **1. React Performance:**
```typescript
// QueryClient fuera del componente
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      gcTime: 300000
    }
  }
});

// Memoización de cálculos costosos
const globalKPIs = useMemo(() => calculateKPIs(data), [data]);
const filteredPolygons = useMemo(() => filterPolygons(polygons, selectedGroup), [polygons, selectedGroup]);

// Callbacks memoizados
const handlePolygonChange = useCallback((id: string | null) => {
  setSelectedPolygon(id);
}, []);
```

#### **2. Lazy Loading:**
```typescript
const Map = lazy(() => import('../components/Map'));

<Suspense fallback={<Loading />}>
  <Map {...props} />
</Suspense>
```

#### **3. Icon Caching:**
```typescript
const ICON_CACHE = {
  incidents: {
    red: createIncidentIcon('#ef4444'),
    orange: createIncidentIcon('#f97316'),
    // ...
  },
  jams: {
    red: createJamIcon('#ef4444'),
    // ...
  }
};

// Reutilizar en lugar de recrear
icon={ICON_CACHE.incidents[getColorKey(incident)]}
```

#### **4. Optimización de useWazeData:**
```typescript
// Antes: O(n²) con .find()
const polygons = localPolygons.map(local => {
  const remote = remotePolygons.find(r => r.id === local.id); // O(n)
  return { ...local, ...remote };
});

// Después: O(n) con Map
const remoteMap = new Map(remotePolygons.map(p => [p.id, p]));
const polygons = localPolygons.map(local => {
  const remote = remoteMap.get(local.id); // O(1)
  return { ...local, ...remote };
});
```

---

### **Backend:**

#### **1. Cálculo de Métricas O(n):**
```typescript
// Antes: O(n²) - loop anidado
for (const polygon of polygons) {
  const alerts = allAlerts.filter(a => a.polygonId === polygon.id); // O(n)
  // ...
}

// Después: O(n) - Maps para lookups
const alertsByPolygon = new Map();
for (const alert of allAlerts) {
  if (!alertsByPolygon.has(alert.polygonId)) {
    alertsByPolygon.set(alert.polygonId, []);
  }
  alertsByPolygon.get(alert.polygonId).push(alert);
}

for (const polygon of polygons) {
  const alerts = alertsByPolygon.get(polygon.id) || []; // O(1)
  // ...
}
```

#### **2. Fetch Concurrente:**
```typescript
// Fetch paralelo de 66 feeds
const responses = await Promise.all(
  REAL_POLYGONS.map(polygon => 
    axios.get(polygon.feedUrl).catch(err => ({ data: null, error: err }))
  )
);
```

#### **3. Consolidación Eficiente:**
```typescript
// Antes: spread operator en loop (lento)
for (const feed of feeds) {
  allAlerts = [...allAlerts, ...feed.alerts];
}

// Después: push directo (rápido)
for (const feed of feeds) {
  allAlerts.push(...feed.alerts);
}
```

#### **4. HTTP Caching:**
```typescript
reply.header('Cache-Control', 'public, max-age=30');
```

#### **5. Performance Tracking:**
```typescript
const startTime = Date.now();
await fetchAndProcess();
const duration = Date.now() - startTime;
console.log(`✅ Feed procesado en ${duration}ms`);
```

---

## 📖 Guía de Uso

### **1. Vista Principal (Dashboard)**

Al acceder a `http://localhost:5173`:

**Header:**
- Logo CASISA
- Título del panel
- Última actualización (actualiza automáticamente)

**KPIs (4 tarjetas):**
- **Fluidez:** % verde con tendencia
- **Incidentes:** Número total con cambio
- **Críticos:** Polígonos en rojo con cambio
- **Obras:** Construcciones activas con tendencia

**Filtros:**
- Dropdown "Todos los polígonos": Seleccionar polígono específico
- Dropdown "Todos los grupos": Filtrar por grupo (Autovía, Ruta, etc.)
- Botón "Limpiar": Reset de filtros

**Mapa (90% ancho):**
- 66 polígonos coloreados:
  - Verde: Fluido (LOW)
  - Amarillo: Moderado (MEDIUM)
  - Rojo: Crítico (HIGH)
- Marcadores de incidentes (círculos rojos/naranjas/amarillos)
- Marcadores de atascos (círculos más pequeños)
- Click en polígono: Selecciona y muestra detalle abajo
- Click en marcador: Abre popup con información

**Panel de Alertas (10% ancho):**
- Título "Alertas Activas" con contador
- Lista de últimos 15 incidentes
- Scroll vertical para ver más
- Info por incidente:
  - Icono + Tipo traducido
  - Severidad
  - Calle
  - Tiempo transcurrido
  - Validaciones (thumbs up)

**Detalle de Polígono (aparece al seleccionar):**
- Nombre y grupo del polígono
- Estado actual
- Métricas:
  - Total incidentes
  - Total atascos
  - Nivel promedio atascos
- Incidentes en el polígono:
  - Tipo, calle, descripción
  - Métricas de confianza
- Atascos en el polígono:
  - Velocidad, demora, longitud
  - Dirección y tipo de vía
- Botón "Cerrar" (X)

**Estadísticas por Grupo:**
- Tabla con todos los grupos
- Columnas:
  - Nombre del grupo
  - Total polígonos
  - Fluidos
  - Críticos
  - Incidentes
  - Nivel promedio
- Click en fila: Filtra por ese grupo

**Top Polígonos Críticos:**
- Ranking de 10 más problemáticos
- Score calculado
- Métricas detalladas
- Click: Selecciona polígono

---

### **2. Interacción con el Mapa**

#### **Popups de Incidentes:**

Al hacer click en un marcador de incidente:

**Secciones:**
1. **Header:** 
   - Tipo de incidente con emoji
   - Hora y minutos transcurridos

2. **Severidad:**
   - Caja grande con color según nivel
   - Texto: CRÍTICA/ALTA/MEDIA/BAJA
   - Confirmaciones de usuarios

3. **Ubicación:**
   - Zona monitoreada
   - Nombre de calle
   - Ciudad

4. **Confiabilidad:**
   - Rating del reporte (0-10)
   - Confiabilidad (0-10)
   - Barras visuales

**Interacción:**
- Hover sobre ℹ️: Tooltip con explicación de métricas
- Click fuera: Cierra popup
- Drag del mapa: Cierra popup

---

#### **Popups de Tránsito:**

Al hacer click en un marcador de atasco:

**Secciones:**
1. **Header:**
   - Nivel del atasco (DETENIDO, MUY DEMORADO, etc.)
   - Hora y minutos transcurridos

2. **Métricas de Impacto (4 cajas grandes):**
   - 🏎️ Velocidad (km/h) - Color por nivel
   - ⏱️ Demora (+X min)
   - 📏 Longitud (metros/km)
   - ⚡ Nivel (X/5)

3. **Información de Ubicación:**
   - 🗺️ Zona
   - 📍 Calle
   - 🧭 Sentido (Norte, Sur, Este, Oeste, etc.)
   - 🛣️ Tipo de vía (Autopista, Ruta Nacional, etc.)

4. **Alertas Especiales:**
   - 🚨 BLOQUEANTE (si existe incidente relacionado)

**Interacción:**
- Hover sobre ℹ️: Tooltip con explicación
- Múltiples líneas si contenido es largo
- Todas las cajas con bordes visibles

---

### **3. Filtrado y Selección**

#### **Por Polígono:**
```
1. Click en dropdown "Todos los polígonos"
2. Buscar o seleccionar polígono (ej: "A-019 - 1")
3. El mapa hace zoom al polígono
4. Se muestra detalle abajo
5. Panel de alertas filtra por ese polígono
```

#### **Por Grupo:**
```
1. Click en dropdown "Todos los grupos"
2. Seleccionar grupo (ej: "Autovía A-019")
3. El mapa muestra solo polígonos de ese grupo
4. KPIs se recalculan para ese grupo
5. Alertas filtradas al grupo
```

#### **Limpiar Filtros:**
```
Click en "Limpiar" → Reset completo → Vista de todos los polígonos
```

---

### **4. Interpretación de Datos**

#### **Colores de Polígonos:**
```
🟢 Verde (LOW):
   - Sin problemas significativos
   - Pocos o ningún atasco
   - Tráfico fluido

🟡 Amarillo (MEDIUM):
   - Atascos moderados (nivel 3)
   - 3+ atascos presentes
   - Requiere monitoreo

🔴 Rojo (HIGH):
   - CRÍTICO - Acción requerida
   - Cierres de ruta presentes
   - Obras + múltiples atascos
   - Nivel de atasco ≥ 4
```

#### **Niveles de Atasco (0-5):**
```
0: Inexistente
1: Leve
2: Moderado
3: Demorado
4: Muy demorado
5: Detenido
```

#### **Severidad de Incidentes (1-5):**
```
1-2: BAJA - Informativo
3:   MEDIA - Precaución
4:   ALTA - Atención requerida
5:   CRÍTICA - Acción inmediata
```

#### **Métricas de Confianza:**
```
Rating (0-10):
- Historial del usuario reportante
- Mayor valor = usuario más confiable

Confiabilidad (0-10):
- Validación cruzada de Waze
- Mayor valor = más verificado

Validaciones (thumbs up):
- Usuarios que confirmaron el incidente
- Mayor número = más real/actual
```

---

## 🔧 Troubleshooting

### **Problemas Comunes:**

#### **1. Backend no arranca:**
```bash
# Error: "ts-node not found"
Solución:
cd backend
npm install -D ts-node
npm run dev

# Error: "Cannot find module"
Solución:
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### **2. Frontend no arranca:**
```bash
# Error: "Failed to resolve import"
Solución:
rm -rf node_modules package-lock.json
npm install
npm run dev

# Error: Puerto 5173 en uso
Solución:
# Cambiar puerto en vite.config.ts
server: {
  port: 5174
}
```

#### **3. No se ven datos en el mapa:**
```bash
# Verificar que backend esté corriendo
curl http://localhost:3001/health

# Verificar logs del backend
# Debería ver: "✅ Feed procesado en Xms"

# Verificar proxy en vite.config.ts
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

#### **4. Popups se cortan o no se ven completos:**
```
- Los popups usan flex-wrap
- Si un elemento es muy largo, pasará a la siguiente línea
- maxWidth: 1200px (tránsito) / 1100px (incidentes)
- Si se sigue cortando, verificar contenido del div
```

#### **5. Errores de TypeScript:**
```bash
# Limpiar cache y recompilar
rm -rf dist/ .vite/ node_modules/.vite/
npm run build
npm run dev
```

#### **6. Datos desactualizados:**
```
- React Query refetch interval: 30s
- Backend ingestion interval: 120s
- Máximo delay esperado: 150s

Forzar actualización:
- Refrescar navegador (F5)
- Limpiar cache del navegador
- Verificar network tab en DevTools
```

---

### **Logs y Debugging:**

#### **Backend Logs:**
```bash
cd backend
npm run dev

# Logs esperados:
# 📍 Configurados 66 polígonos con feeds individuales
# 🚀 Iniciando ciclo de ingesta de 66 feeds cada 120 segundos...
# 📥 Fetching 66 feeds de Waze...
# ✅ Feed procesado en 646ms. Alertas: 50, Jams: 21, Errores: 0/66
# {"level":30,"time":...,"msg":"Server listening at http://127.0.0.1:3001"}
```

#### **Frontend DevTools:**
```javascript
// Console
// React Query devtools (si habilitados)
// Network tab: Verificar llamadas a /api/*

// Verificar estado de React Query
queryClient.getQueryState(['wazeData'])

// Ver datos en cache
queryClient.getQueryData(['wazeData'])
```

#### **Health Check:**
```bash
curl http://localhost:3001/health

# Respuesta esperada:
{
  "status": "ok",
  "uptime": 1234,
  "timestamp": "2024-...",
  "memory": {
    "used": 123456,
    "total": 789012
  }
}
```

---

### **Performance:**

#### **Frontend:**
```
Initial Load: < 2s
HMR Updates: < 500ms
Map Render: < 1s
Query Refetch: < 200ms
```

#### **Backend:**
```
Feed Processing: 500-800ms
API Response: < 50ms
Memory Usage: ~200MB
CPU Usage: < 10% (idle), ~30% (processing)
```

#### **Si la performance es mala:**
```
Frontend:
- Verificar que Map sea lazy loaded
- Verificar memoización en useWazeData
- Verificar icon cache

Backend:
- Verificar que se usen Maps (no arrays con .find)
- Verificar consolidación sin spread operator
- Verificar que no haya loops anidados O(n²)
```

---

## 🚀 Despliegue a Producción

### **Preparación:**

#### **1. Variables de Entorno:**
```env
# backend/.env.production
NODE_ENV=production
PORT=3001
```

#### **2. Build Frontend:**
```bash
npm run build
# Genera: dist/
```

#### **3. Build Backend:**
```bash
cd backend
npm run build
# Genera: backend/dist/
```

---

### **Opciones de Despliegue:**

#### **Opción 1: Servidor Único (PM2)**
```bash
# Instalar PM2
npm install -g pm2

# Backend
cd backend
pm2 start dist/server.js --name waze-backend

# Frontend (con servidor estático)
pm2 start npx --name waze-frontend -- serve -s dist -l 5173

# Guardar configuración
pm2 save
pm2 startup
```

#### **Opción 2: Docker**
```dockerfile
# Dockerfile.backend
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/dist ./dist
CMD ["node", "dist/server.js"]

# Dockerfile.frontend
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    restart: always

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always
```

#### **Opción 3: Cloud (Vercel + Railway)**
```bash
# Frontend → Vercel
npx vercel --prod

# Backend → Railway
railway init
railway up
railway open
```

---

### **Configuración de Nginx (si aplica):**
```nginx
server {
    listen 80;
    server_name panel-waze.example.com;

    # Frontend
    location / {
        root /var/www/panel-waze/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

### **Monitoreo en Producción:**

#### **Health Checks:**
```bash
# Cron job cada 5 minutos
*/5 * * * * curl -f http://localhost:3001/health || systemctl restart waze-backend
```

#### **Logs:**
```bash
# PM2 logs
pm2 logs waze-backend --lines 100

# Docker logs
docker-compose logs -f --tail=100

# System logs
journalctl -u waze-backend -f
```

#### **Métricas:**
```bash
# PM2 monitoring
pm2 monit

# Resource usage
docker stats

# Custom endpoint
curl http://localhost:3001/health
```

---

## 📚 Referencias

### **Documentación:**
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Fastify](https://www.fastify.io/)
- [React Query](https://tanstack.com/query/latest)
- [Leaflet](https://leafletjs.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [Turf.js](https://turfjs.org/)

### **APIs:**
- [Waze Live Map](https://www.waze.com/live-map)
- [Waze Data Feed](https://support.google.com/waze/partners/answer/10618035)
- [Waze Traffic View](https://support.google.com/waze/partners/answer/14210446)

### **Documentación del Proyecto:**
- **ANALISIS_COMPLETO_FEEDS_WAZE.md** - 📚 Análisis exhaustivo de feeds de Waze (NUEVO)
- **REFERENCIA_RAPIDA_WAZE.md** - ⚡ Referencia rápida de feeds (NUEVO)
- **MEJORAS_API_WAZE.md** - Documentación completa de mejoras en APIs
- **RESUMEN_MEJORAS_WAZE.md** - Resumen ejecutivo de mejoras
- **INTEGRACION_FRONTEND.md** - Guía de integración frontend
- **PRUEBAS_CALIDAD_DATOS.md** - Guía de pruebas y validación
- **ARQUITECTURA_MEJORADA.md** - Diagramas de arquitectura mejorada

---

## 📄 Licencia

Este proyecto es propiedad de **CASISA** y es de uso interno exclusivo.

---

## 👥 Contacto

Para soporte o consultas sobre el proyecto:
- **Empresa:** CASISA
- **Proyecto:** Panel Ejecutivo - Polígonos Waze Monitoreados
- **Año:** 2024

---

**Última actualización:** Diciembre 2024
**Versión:** 1.0.0





