/**
 * Constantes de configuración de la aplicación
 * Centraliza todos los valores que antes estaban hardcodeados
 */

// ============================================
// INFORMACIÓN DE LA EMPRESA
// ============================================
export const COMPANY_INFO = {
  name: "Caminos de las Sierras S.A.",
  shortName: "CASISA",
  description: "Concesionaria Red de Accesos a Córdoba",
  website: "https://www.caminosdelassierras.com.ar",
  logoPath: "/logo_cs.png",
};

// ============================================
// CONFIGURACIÓN DE LA RED VIAL
// ============================================
export const NETWORK_CONFIG = {
  // Número total de polígonos configurados
  totalPolygons: 66,
  // Longitud total estimada de la red en km
  totalNetworkKm: 350,
  // Longitud promedio por polígono en km
  avgPolygonLengthKm: 5.3,
  // Grupos de la Red de Accesos a Córdoba
  racGroups: [
    "Autovía A-019",
    "Área Capital",
    "Ruta Nacional 9",
    "Ruta Nacional 19",
    "Ruta Nacional 36",
  ],
};

// ============================================
// INTERVALOS DE ACTUALIZACIÓN (en ms)
// ============================================
// Con WebSockets, las actualizaciones llegan push-based en tiempo real.
// Los refetchInterval sirven SOLO como fallback si el WebSocket se desconecta.
export const REFRESH_INTERVALS = {
  // Fallback: los datos llegan vía WS, pero si se desconecta se refetchean por polling
  realTimeData: 120_000,           // 2 min fallback
  globalKpis: 120_000,             // 2 min fallback
  trafficMetrics: 120_000,         // 2 min fallback
  alertStats: 120_000,             // 2 min fallback
  // Datos históricos: menos urgentes, OK con polling moderado
  historicalData: 300_000,         // 5 minutos
  // Tendencias: baja frecuencia
  trends: 300_000,                 // 5 minutos
};

// ============================================
// CONFIGURACIÓN DE LA API
// ============================================
export const API_CONFIG = {
  // URL base de la API (se puede sobrescribir con variable de entorno)
  baseUrl: import.meta.env.VITE_API_URL || "/api",
  // Tiempo de espera para queries (ms)
  staleTime: 30000,
  // Tiempo de caché (ms)
  cacheTime: 5 * 60 * 1000, // 5 minutos
  // Reintentos en caso de error
  retryCount: 1,
};

// ============================================
// UMBRALES DE SEVERIDAD
// ============================================
export const SEVERITY_THRESHOLDS = {
  // Índice de congestión
  congestion: {
    low: 30, // Fluido (0-30%)
    medium: 50, // Moderado (30-50%)
    high: 70, // Alto (50-70%)
    critical: 85, // Crítico (70%+)
  },
  // Velocidad (km/h)
  speed: {
    critical: 20, // Muy lento
    low: 40, // Lento
    normal: 60, // Normal
    optimal: 80, // Óptimo
  },
  // Demora (minutos)
  delay: {
    acceptable: 5,
    moderate: 10,
    high: 20,
    critical: 30,
  },
};

// ============================================
// CONFIGURACIÓN DE MAPAS
// ============================================
export const MAP_CONFIG = {
  // Centro por defecto (Córdoba, Argentina)
  defaultCenter: {
    lat: -31.4201,
    lng: -64.1888,
  },
  // Zoom por defecto
  defaultZoom: 11,
  // Zoom para vista de detalle
  detailZoom: 16,
  // Proveedor de tiles de OpenStreetMap
  tileLayerUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  tileLayerAttribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
};

// ============================================
// TEXTOS DE LA INTERFAZ
// ============================================
export const UI_TEXTS = {
  appTitle: "Panel Ejecutivo",
  appSubtitle: "Monitoreo de Tráfico en Tiempo Real",
  dataSource: "Datos en vivo de Waze for Cities",
  footer: {
    systemFeatures: [
      `${NETWORK_CONFIG.totalPolygons} polígonos configurados`,
      "Alertas en tiempo real",
      "Análisis de tráfico y congestión",
      "Clasificación automática de severidad",
    ],
    dataOrigin: [
      "Waze for Cities Partnership",
      "Datos actualizados cada 2 min",
      "Cobertura total de la RAC",
    ],
    stateLabels: {
      fluid: "Fluido - Tráfico normal",
      moderate: "Moderado - Leve congestión",
      congested: "Congestionado - Alta demora",
    },
  },
};

// ============================================
// COLORES CORPORATIVOS
// ============================================
export const BRAND_COLORS = {
  primary: "#15803d", // Verde corporativo
  secondary: "#facc15", // Amarillo corporativo
  accent: "#166534",
  // Estados de tráfico
  trafficStates: {
    fluid: "#22c55e", // Verde
    moderate: "#f59e0b", // Amarillo/Naranja
    congested: "#ef4444", // Rojo
  },
};

// ============================================
// CONFIGURACIÓN DE CACHÉ
// ============================================
export const CACHE_CONFIG = {
  // React Query
  queryCache: {
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  },
};

// Exportar constante legacy para compatibilidad
export const APP_CONSTANTS = {
  TOTAL_NETWORK_KM: NETWORK_CONFIG.totalNetworkKm,
};
