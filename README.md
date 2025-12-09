# Waze Traffic Dashboard - Panel Ejecutivo

## 📋 Descripción

Aplicación Full Stack para monitoreo en tiempo real de tráfico basada en **Waze Data Feeds**. Sistema operacional con **66 polígonos reales** de la provincia de Córdoba, Argentina, procesando datos actualizados cada 2 minutos.

### Características Principales

- ✅ **Backend en Node.js + Fastify** con ingesta periódica de 66 feeds de Waze (JSON)
- ✅ **Arquitectura Multi-Feed** con fetch paralelo y tolerancia a fallos
- ✅ **Frontend en React + TypeScript + TailwindCSS** responsivo y moderno
- ✅ **KPIs ejecutivos en tiempo real** (fluidez, incidentes activos, polígonos críticos)
- ✅ **API REST robusta** con caching y actualización automática (React Query)
- ✅ **Datos reales verificados**: 56+ alertas y 24+ jams procesándose actualmente

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js >= 18.x
- npm >= 9.x

### 1. Clonar/Acceder al proyecto

```bash
cd "/Users/juliangaliano/Desktop/Aplicaciones/Panel de waze"
```

### 2. Instalar Dependencias

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ..  # Volver a la raíz
npm install
```

### 3. Iniciar Servicios

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

Salida esperada:
```
📍 Configurados 66 polígonos con feeds individuales
🚀 Iniciando ciclo de ingesta de 66 feeds cada 120 segundos...
📥 Fetching 66 feeds de Waze...
✅ Feed procesado. Alertas: 56, Jams: 24, Errores: 0/66
🚀 Backend server running on http://localhost:3001
```

**Terminal 2 - Frontend:**

```bash
npm run dev
```

Salida esperada:
```
➜  Local:   http://localhost:5173/
```

### 4. Abrir Dashboard

Navega a: **http://localhost:5173**

---

## 📁 Estructura del Proyecto

```
/
├── backend/                  # API en Node.js + Fastify
│   ├── src/
│   │   ├── config/
│   │   │   ├── polygons.ts         # (Legacy - 40 polígonos mock)
│   │   │   └── realPolygons.ts     # ✅ 66 polígonos REALES con URLs
│   │   ├── services/
│   │   │   ├── wazeService.ts      # Ingesta multi-feed paralelo
│   │   │   ├── geoService.ts       # (No usado con multi-feed)
│   │   │   └── apiService.ts       # Cálculo de KPIs y estados
│   │   ├── types/           # TypeScript types
│   │   └── server.ts        # Punto de entrada Fastify
│   ├── .env                 # ⚠️ No commitear (ya incluye URLs reales)
│   └── package.json
│
├── src/                     # Frontend React + TypeScript
│   ├── components/          # UI components
│   ├── hooks/              # React Query hooks (useWazeData)
│   ├── data/mock/          # Mock data (fallback)
│   ├── utils/              # Utilidades
│   └── pages/              # Dashboard principal
│
├── vite.config.ts          # Config de Vite (proxy al backend)
├── tailwind.config.js      # Config de TailwindCSS
└── package.json
```

---

## 🗺 Polígonos Monitoreados

El sistema monitorea **66 áreas gestionadas** en la provincia de Córdoba:

### Autopistas
- **A-019** (tramos 1-8): Circunvalación de Córdoba

### Rutas Provinciales
- **RP E53, RP E55** (múltiples tramos)
- **RP C45** (2 tramos)
- **RP 5** (4 tramos incluyendo Vte. Anisacate)

### Rutas Nacionales
- **RN 9 Norte** (4 tramos)
- **RN 9 Sur** (2 tramos)

### Rutas Provinciales Principales
- **R36** (14 tramos + viaductos de Elena, Despeñaderos, Almafuerte, etc.)
- **R19** (3 viaductos: Montecristo, Piquillin, km 619)
- **R20-38** (4 tramos)
- **R.Alt. 38** (3 tramos)

### Anillos y Avenidas
- **APC** (Anillo de Circunvalación)
- **AJC** (Acceso Juan Carlos)
- **2do Anillo ACV** (2 sectores)
- **Avda P. Luchesse** (2 tramos)

**Total:** 66 polígonos con feeds individuales de Waze

---

## 🌐 API del Backend

El backend expone los siguientes endpoints:

### `GET /api/kpis/global`

KPIs globales del sistema.

**Respuesta (datos reales actuales):**

```json
{
  "fluidityPercentage": 89,
  "activeIncidents": 56,
  "criticalPolygons": 3,
  "activeConstructions": 0,
  "trends": {
    "fluidityChange": 0,
    "incidentsChange": 0
  },
  "lastUpdate": "2025-12-04T15:04:17.451Z"
}
```

### `GET /api/polygons`

Devuelve lista de los 66 polígonos con su estado actual.

**Respuesta (ejemplo):**

```json
[
  {
    "id": "P001",
    "name": "A-019 -8",
    "group": "Sin Grupo",
    "state": "low",  // low | medium | high
    "metrics": {
      "alertCount": 1,
      "jamCount": 0,
      "totalDelay": 0,
      "avgSpeed": null,
      "criticalAlerts": 0
    },
    "lastUpdate": "2025-12-04T15:04:17.451Z"
  }
]
```

### `GET /api/polygons/:id`

Detalle de un polígono específico, incluyendo todas las alertas y jams activos dentro de él.

### `GET /health`

Health check del servidor.

---

## 🔧 Arquitectura Multi-Feed

### Cómo Funciona

A diferencia de un feed global, Waze Partner Hub proporciona **1 feed por polígono**. El sistema:

1. **Carga 66 URLs** desde `backend/src/config/realPolygons.ts`
2. **Fetch Paralelo** usando `Promise.allSettled` (todos los feeds a la vez)
3. **Normalización** de datos raw de Waze a tipos internos
4. **Consolidación** de alertas y jams de todos los feeds
5. **Cálculo de Estado** por polígono (verde/amarillo/rojo)
6. **Exposición vía API** para consumo del frontend

### Ventajas

- ✅ **Resiliente**: Si 1 feed falla, los otros 65 continúan
- ✅ **Rápido**: Fetch paralelo (no secuencial)
- ✅ **Simplificado**: No requiere procesamiento geoespacial (cada feed ya está pre-asignado)
- ✅ **Escalable**: Fácil agregar/quitar polígonos

### Reglas de Semaforización

El estado de cada polígono se calcula según:

> **🔴 HIGH (Rojo)**: Alertas críticas (Accidentes graves, Vía cerrada) O Jam nivel 5 O delay > 15min  
> **🟡 MEDIUM (Amarillo)**: Jam nivel 3-4 O múltiples alertas O delay > 5min  
> **🟢 LOW (Verde)**: Sin problemas significativos

---

## 📊 Datos en Tiempo Real

### Estado Actual del Sistema (04/12/2025)

```
📍 66 polígonos configurados
📥 56 alertas activas
📥 24 jams activos
✅ 0 errores en ingesta
⏱️ Actualización cada 2 minutos
```

### Fluidez por Zona

- **89% fluidez global** → 59 polígonos en verde
- **3 polígonos críticos** → Requieren atención inmediata
- **4 polígonos con congestión moderada**

---

## 🎨 Frontend

### Tecnologías

- **React** + **TypeScript** (Vite)
- **TailwindCSS 3** (estilos modernos y responsivos)
- **Leaflet** (mapas sin API key requerida)
- **React Query** (@tanstack/react-query) para data fetching optimizado

### Componentes Principales

- `Header`: Título, logo, última actualización
- `KPICards`: Tarjetas de métricas globales (datos reales)
- `Filters`: Dropdown para filtrar por grupo/polígono
- `Map`: Mapa preparado para mostrar polígonos (requiere geometrías)
- `AlertsPanel`: Alertas estratégicas más relevantes
- `PolygonDetail`: Panel de detalle al seleccionar un polígono
- `Footer`: Leyenda y atribución de datos

---

## 🔧 Scripts Disponibles

### Frontend

```bash
npm run dev       # Servidor de desarrollo (Vite)
npm run build     # Compilar para producción
npm run preview   # Vista previa del build
```

### Backend

```bash
npm run dev       # Servidor de desarrollo (nodemon + ts-node)
npm run build     # Compilar TypeScript a dist/
npm start         # Ejecutar desde dist/ (producción)
```

---

## 🚨 Limitaciones Actuales

### ⚠️ Geometrías de Polígonos

El mapa actualmente **no muestra los polígonos visualmente** porque faltan las **geometrías GeoJSON**.

**Opciones para resolverlo:**

1. **Extraer del feed de Waze** (si incluyen coordenadas del polígono)
2. **Exportar desde Waze Partner Hub** (Managed Areas → Export GeoJSON)
3. **Mostrar marcadores** en lugar de polígonos (centro aproximado)

### Sin Histórico

Los datos se almacenan en memoria (se pierden al reiniciar). Para tendencias se requiere base de datos.

---

## 📈 Próximos Pasos Sugeridos

- [ ] **Obtener geometrías** de los 66 polígonos para visualización en mapa
- [ ] Implementar base de datos (PostgreSQL + TimescaleDB) para histórico
- [ ] Agregar endpoint `/api/map-data` con geometrías
- [ ] Implementar gráficos de tendencias (Recharts)
- [ ] Agregar autenticación (JWT) para proteger la API
- [ ] Categorizar polígonos por tipo (Autopista, Ruta, Anillo)
- [ ] Implementar alertas por correo/Slack para polígonos críticos
- [ ] Dockerizar la aplicación para deployment

---

## 📞 Soporte

### Documentación Oficial de Waze

- [Cómo obtener datos del tráfico](https://support.google.com/waze/partners/answer/10618035?hl=es-419)
- [Especificaciones del Feed](https://support.google.com/waze/partners/answer/13458165?hl=es-419)

### Issues Técnicos

Revisar los logs del backend y frontend en las terminales correspondientes:

```bash
# Backend
cd backend && npm run dev

# Frontend
npm run dev
```

---

## ✅ Estado del Sistema

**Última Verificación:** 04/12/2025 12:04 ART

- ✅ Backend operacional con 66 feeds reales
- ✅ Ingesta funcionando (0 errores)
- ✅ API REST completamente funcional
- ✅ Frontend conectado y mostrando datos reales
- ⚠️ Pendiente: Geometrías para visualización en mapa

**Desarrollado para Dirección de Vialidad** | Córdoba, Argentina | Diciembre 2025
