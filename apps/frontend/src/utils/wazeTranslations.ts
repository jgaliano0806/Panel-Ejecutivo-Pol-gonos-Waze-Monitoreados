/**
 * Traducciones de tipos y subtipos de Waze al español
 */

/**
 * Traducciones completas basadas en los iconos oficiales de Waze
 * Fuente: App Waze versión española
 */
export const WAZE_TRANSLATIONS = {
  // === ACCIDENTES (Informar sobre accidente) ===
  accident: {
    ACCIDENT: "Accidente",
    ACCIDENT_MINOR: "Accidente leve",
    ACCIDENT_MAJOR: "Colisión múltiple",
    ACCIDENT_OTHER_SIDE: "Accidente al otro lado",
    NO_SUBTYPE: "Accidente",
  },

  // === TRÁFICO / ATASCOS ===
  jam: {
    JAM_LIGHT_TRAFFIC: "Tránsito lento",
    JAM_MODERATE_TRAFFIC: "Tránsito denso",
    JAM_HEAVY_TRAFFIC: "Embotellamiento",
    JAM_STAND_STILL_TRAFFIC: "Tránsito detenido",
    NO_SUBTYPE: "Congestión",
  },

  // === PELIGROS EN CALZADA (Informar sobre un peligro) ===
  hazard: {
    HAZARD: "Peligro",
    HAZARD_ON_ROAD: "Peligro en calzada",
    HAZARD_ON_SHOULDER: "Auto en orilla",
    NO_SUBTYPE: "Peligro",
  },

  hazard_on_road: {
    HAZARD_ON_ROAD: "Peligro en calzada",
    HAZARD_ON_ROAD_OBJECT: "Objeto en calzada",
    HAZARD_ON_ROAD_POT_HOLE: "Bache",
    HAZARD_ON_ROAD_ROAD_KILL: "Animal muerto en calzada",
    HAZARD_ON_ROAD_LANE_CLOSED: "Carril cerrado",
    HAZARD_ON_ROAD_OIL: "Derrame de aceite",
    HAZARD_ON_ROAD_ICE: "Hielo en calzada",
    HAZARD_ON_ROAD_CONSTRUCTION: "Obras",
    HAZARD_ON_ROAD_CAR_STOPPED: "Vehículo detenido en carril",
    HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT: "Semáforo averiado",
    NO_SUBTYPE: "Peligro en calzada",
  },

  hazard_on_shoulder: {
    HAZARD_ON_SHOULDER: "Auto en orilla",
    HAZARD_ON_SHOULDER_CAR_STOPPED: "Auto en orilla",
    HAZARD_ON_SHOULDER_ANIMALS: "Animales en banquina",
    HAZARD_ON_SHOULDER_MISSING_SIGN: "Señal faltante",
    NO_SUBTYPE: "Auto en orilla",
  },

  // === MAL TIEMPO (Informar sobre mal tiempo) ===
  hazard_weather: {
    HAZARD_WEATHER: "Mal tiempo",
    HAZARD_WEATHER_FOG: "Niebla",
    HAZARD_WEATHER_HAIL: "Granizo",
    HAZARD_WEATHER_HEAVY_RAIN: "Mal tiempo",
    HAZARD_WEATHER_HEAVY_SNOW: "Nieve en el camino",
    HAZARD_WEATHER_FLOOD: "Inundación",
    HAZARD_WEATHER_MONSOON: "Lluvia intensa",
    HAZARD_WEATHER_TORNADO: "Tornado",
    HAZARD_WEATHER_HEAT_WAVE: "Ola de calor",
    HAZARD_WEATHER_HURRICANE: "Huracán",
    HAZARD_WEATHER_FREEZING_RAIN: "Camino con hielo",
    HAZARD_WEATHER_SLIPPERY_ROAD: "Camino resbaladizo",
    NO_SUBTYPE: "Mal tiempo",
  },

  // === OBRAS (Construcción) ===
  construction: {
    CONSTRUCTION: "Obras",
    NO_SUBTYPE: "Obras",
  },

  // === CIERRE DE CAMINO ===
  road_closed: {
    ROAD_CLOSED: "Cierre",
    ROAD_CLOSED_HAZARD: "Cierre por peligro",
    ROAD_CLOSED_CONSTRUCTION: "Cierre por obras",
    ROAD_CLOSED_EVENT: "Cierre por evento",
    NO_SUBTYPE: "Cierre",
  },

  // === CARRIL BLOQUEADO ===
  lane_closed: {
    LANE_CLOSED: "Carril bloqueado",
    LANE_CLOSED_LEFT: "Carril izquierdo bloqueado",
    LANE_CLOSED_RIGHT: "Carril derecho bloqueado",
    LANE_CLOSED_CENTER: "Carril central bloqueado",
    NO_SUBTYPE: "Carril bloqueado",
  },

  // === POLICÍA (Informar sobre control policial) ===
  police: {
    POLICE: "Policía",
    POLICE_VISIBLE: "Policía visible",
    POLICE_HIDDEN: "Policía oculto",
    POLICE_SPEED_TRAP: "Radar móvil",
    POLICE_OTHER_SIDE: "Policía al otro lado",
    NO_SUBTYPE: "Control policial",
  },

  // === CÁMARAS Y RADARES ===
  camera: {
    CAMERA: "Cámara",
    CAMERA_SPEED: "Radar de velocidad",
    CAMERA_RED_LIGHT: "Cámara de semáforo",
    CAMERA_FAKE: "Cámara falsa",
    CAMERA_MOBILE: "Radar móvil",
    NO_SUBTYPE: "Cámara de tráfico",
  },

  // === EVENTOS ESPECIALES ===
  event: {
    EVENT: "Evento",
    EVENT_CONCERT: "Evento - Concierto",
    EVENT_SPORT: "Evento deportivo",
    EVENT_OTHER: "Evento especial",
    NO_SUBTYPE: "Evento",
  },

  // === CLIMA (como tipo principal) ===
  weather: {
    WEATHER: "Clima adverso",
    WEATHER_FOG: "Niebla",
    WEATHER_HEAVY_RAIN: "Lluvia intensa",
    WEATHER_HAIL: "Granizo",
    WEATHER_HEAVY_SNOW: "Nieve intensa",
    WEATHER_FLOOD: "Inundación",
    WEATHER_ICY_ROAD: "Camino con hielo",
    NO_SUBTYPE: "Clima adverso",
  },

  // === OTROS ===
  misc: {
    MISC: "Otro incidente",
    MAP_ERROR: "Error en el mapa",
    FUEL_PRICES: "Precios de combustible",
    ROADSIDE_ASSISTANCE: "Asistencia en la ruta",
    MAP_CHAT: "Chat del mapa",
    PLACE: "Lugar",
    NO_SUBTYPE: "Sin clasificar",
  },
} as const;

export const ROAD_TYPE_TRANSLATIONS: Record<string, string> = {
  "1": "Calle",
  "2": "Avenida",
  "3": "Autopista",
  "4": "Rampa de acceso",
  "5": "Camino rural",
  "6": "Ruta Nacional/Provincial",
  "7": "Ruta Secundaria",
  "8": "Camino de ripio",
  "9": "Peatonal",
  "10": "Senda peatonal",
  "11": "Salida de autopista",
  "14": "Camino 4x4",
  "15": "Cruce de ferry",
  "16": "Escalinata",
  "17": "Camino privado",
  "18": "Vías férreas",
  "19": "Pista de aeropuerto",
  "20": "Estacionamiento",
  "21": "Colectora",
};

export const JAM_LEVEL_TRANSLATIONS: Record<string, string> = {
  "0": "Flujo libre",
  "1": "Tránsito fluido",
  "2": "Tránsito lento",
  "3": "Demora importante",
  "4": "Muy demorado",
  "5": "Detenido",
};

export const IRREGULARITY_TYPE_TRANSLATIONS: Record<string, string> = {
  NONE: "Sin irregularidad",
  SMALL: "Anomalía leve",
  MEDIUM: "Anomalía moderada",
  LARGE: "Anomalía importante",
  HUGE: "Anomalía masiva",
};

/**
 * Mapeo directo de subtipos RAW a traducciones
 * Esto permite buscar cualquier subtipo directamente sin conocer el tipo padre
 */
export const SUBTYPE_DIRECT_TRANSLATIONS: Record<string, string> = {
  // Accidentes
  ACCIDENT: "Accidente",
  ACCIDENT_MINOR: "Accidente leve",
  ACCIDENT_MAJOR: "Colisión múltiple",

  // Tráfico
  JAM_LIGHT_TRAFFIC: "Tránsito lento",
  JAM_MODERATE_TRAFFIC: "Tránsito denso",
  JAM_HEAVY_TRAFFIC: "Embotellamiento",
  JAM_STAND_STILL_TRAFFIC: "Tránsito detenido",

  // Peligros en calzada
  HAZARD_ON_ROAD: "Peligro en calzada",
  HAZARD_ON_ROAD_OBJECT: "Objeto en calzada",
  HAZARD_ON_ROAD_POT_HOLE: "Bache",
  HAZARD_ON_ROAD_ROAD_KILL: "Animal muerto en calzada",
  HAZARD_ON_ROAD_LANE_CLOSED: "Carril cerrado",
  HAZARD_ON_ROAD_OIL: "Derrame de aceite",
  HAZARD_ON_ROAD_ICE: "Hielo en calzada",
  HAZARD_ON_ROAD_CONSTRUCTION: "Obras",
  HAZARD_ON_ROAD_CAR_STOPPED: "Vehículo detenido en carril",
  HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT: "Semáforo averiado",

  // Peligros en banquina
  HAZARD_ON_SHOULDER: "Auto en orilla",
  HAZARD_ON_SHOULDER_CAR_STOPPED: "Auto en orilla",
  HAZARD_ON_SHOULDER_ANIMALS: "Animales en banquina",
  HAZARD_ON_SHOULDER_MISSING_SIGN: "Señal faltante",

  // Clima
  HAZARD_WEATHER: "Mal tiempo",
  HAZARD_WEATHER_FOG: "Niebla",
  HAZARD_WEATHER_HAIL: "Granizo",
  HAZARD_WEATHER_HEAVY_RAIN: "Mal tiempo",
  HAZARD_WEATHER_HEAVY_SNOW: "Nieve en el camino",
  HAZARD_WEATHER_FLOOD: "Inundación",
  HAZARD_WEATHER_MONSOON: "Lluvia intensa",
  HAZARD_WEATHER_TORNADO: "Tornado",
  HAZARD_WEATHER_HEAT_WAVE: "Ola de calor",
  HAZARD_WEATHER_HURRICANE: "Huracán",
  HAZARD_WEATHER_FREEZING_RAIN: "Camino con hielo",
  HAZARD_WEATHER_SLIPPERY_ROAD: "Camino resbaladizo",

  // Camino cerrado
  ROAD_CLOSED: "Cierre",
  ROAD_CLOSED_HAZARD: "Cierre por peligro",
  ROAD_CLOSED_CONSTRUCTION: "Cierre por obras",
  ROAD_CLOSED_EVENT: "Cierre por evento",

  // Carril bloqueado
  LANE_CLOSED: "Carril bloqueado",
  LANE_CLOSED_LEFT: "Carril izquierdo bloqueado",
  LANE_CLOSED_RIGHT: "Carril derecho bloqueado",
  LANE_CLOSED_CENTER: "Carril central bloqueado",

  // Policía
  POLICE: "Policía",
  POLICE_VISIBLE: "Policía visible",
  POLICE_HIDDEN: "Policía oculto",
  POLICE_SPEED_TRAP: "Radar móvil",
  POLICE_OTHER_SIDE: "Policía al otro lado",

  // Cámaras
  CAMERA: "Cámara",
  CAMERA_SPEED: "Radar de velocidad",
  CAMERA_RED_LIGHT: "Cámara de semáforo",
  CAMERA_FAKE: "Cámara falsa",
  CAMERA_MOBILE: "Radar móvil",

  // Eventos
  EVENT: "Evento",
  EVENT_CONCERT: "Evento - Concierto",
  EVENT_SPORT: "Evento deportivo",
  EVENT_OTHER: "Evento especial",

  // Clima
  WEATHER: "Clima adverso",
  WEATHER_FOG: "Niebla",
  WEATHER_HEAVY_RAIN: "Lluvia intensa",
  WEATHER_HAIL: "Granizo",
  WEATHER_HEAVY_SNOW: "Nieve intensa",
  WEATHER_FLOOD: "Inundación",
  WEATHER_ICY_ROAD: "Camino con hielo",

  // Construcción
  CONSTRUCTION: "Obras",
};

// Mapeo de tipos principales a español
export const MAIN_TYPE_TRANSLATIONS: Record<string, string> = {
  // Tipos principales en minúsculas
  accident: "Siniestro vial",
  jam: "Congestión",
  hazard: "Peligro",
  hazard_on_road: "Peligro en calzada",
  hazard_on_shoulder: "Peligro en banquina",
  hazard_weather: "Peligro climático",
  weatherhazard: "Peligro climático",
  construction: "Obra vial",
  road_closed: "Corte de ruta",
  roadclosed: "Corte de ruta",
  misc: "Otro",
  // Alertas automaticas de Waze
  congestion: "Congestión",
  speed: "Velocidad",
  incident: "Incidente",
  // Tipos en mayúsculas (como vienen de Waze)
  ACCIDENT: "Siniestro vial",
  JAM: "Congestión",
  HAZARD: "Peligro",
  CONSTRUCTION: "Obra vial",
  ROAD_CLOSED: "Corte de ruta",
  WEATHERHAZARD: "Peligro climático",
  MISC: "Otro",
  // Cámaras
  CAMERA: "Cámara de tráfico",
  camera: "Cámara de tráfico",
  // Eventos
  EVENT: "Evento especial",
  event: "Evento especial",
  // Clima
  WEATHER: "Clima adverso",
  weather: "Clima adverso",
  // Tipos adicionales de alertas
  high_congestion: "Alta congestión",
  critical_congestion: "Congestión crítica",
  low_speed: "Velocidad reducida",
  critical_speed: "Velocidad crítica",
  multiple_incidents: "Múltiples incidentes",
  blocking_incident: "Incidente bloqueante",
};

/**
 * Obtiene la traducción de un subtipo de incidente
 */
export function getSubtypeTranslation(type: string, subtype: string): string {
  // Primero intentar con el mapeo directo de subtipos (más rápido)
  const upperSubtype = subtype.toUpperCase();
  if (SUBTYPE_DIRECT_TRANSLATIONS[upperSubtype]) {
    return SUBTYPE_DIRECT_TRANSLATIONS[upperSubtype];
  }

  // Luego intentar con el tipo proporcionado
  const typeKey = type as keyof typeof WAZE_TRANSLATIONS;
  if (typeKey in WAZE_TRANSLATIONS) {
    const translations = WAZE_TRANSLATIONS[typeKey] as Record<string, string>;
    if (translations[subtype]) {
      return translations[subtype];
    }
  }

  // Si no funciona, buscar en todas las categorías
  for (const translations of Object.values(WAZE_TRANSLATIONS)) {
    const typedTranslations = translations as Record<string, string>;
    if (typedTranslations[subtype]) {
      return typedTranslations[subtype];
    }
  }

  // Último recurso: convertir el subtipo a formato legible
  return formatSubtypeToReadable(subtype);
}

/**
 * Convierte un subtipo RAW a formato legible
 * Ejemplo: "HAZARD_ON_SHOULDER_CAR_STOPPED" -> "Peligro en banquina - auto detenido"
 */
function formatSubtypeToReadable(subtype: string): string {
  return subtype
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Obtiene la traducción del tipo principal
 */
export function getMainTypeTranslation(type: string): string {
  // Buscar primero tal cual viene
  if (MAIN_TYPE_TRANSLATIONS[type]) {
    return MAIN_TYPE_TRANSLATIONS[type];
  }
  // Buscar en minúsculas
  const lowerType = type.toLowerCase();
  if (MAIN_TYPE_TRANSLATIONS[lowerType]) {
    return MAIN_TYPE_TRANSLATIONS[lowerType];
  }
  // Buscar en mayúsculas
  const upperType = type.toUpperCase();
  if (MAIN_TYPE_TRANSLATIONS[upperType]) {
    return MAIN_TYPE_TRANSLATIONS[upperType];
  }
  // Si no se encuentra, retornar el original
  return type;
}

/**
 * Obtiene la traducción del tipo de ruta
 */
export function getRoadTypeTranslation(roadType: number | string): string {
  return ROAD_TYPE_TRANSLATIONS[String(roadType)] || `Tipo ${roadType}`;
}

/**
 * Obtiene la traducción del nivel de congestión
 */
export function getJamLevelTranslation(level: number | string): string {
  return JAM_LEVEL_TRANSLATIONS[String(level)] || `Nivel ${level}`;
}

/**
 * Obtiene la traducción del tipo de irregularidad
 */
export function getIrregularityTranslation(irregularity: string): string {
  return IRREGULARITY_TYPE_TRANSLATIONS[irregularity] || irregularity;
}

/**
 * Obtiene una descripción completa del incidente en español
 */
export function getIncidentDescription(type: string, subtype?: string): string {
  if (subtype && subtype !== "NO_SUBTYPE") {
    const translation = getSubtypeTranslation(type, subtype);
    // Si encontramos una traducción válida (no es el mismo subtype), la retornamos
    if (translation !== subtype) {
      return translation;
    }
  }

  // Si no hay subtipo o no se encontró traducción, usar el tipo principal
  return getMainTypeTranslation(type);
}

export function getIncidentEmoji(type: string, subtype?: string): string {
  const typeLower = type.toLowerCase();
  const subtypeLower = (subtype || "").toLowerCase();

  // Iconos específicos por subtipo
  if (subtypeLower.includes("police")) return "👮‍♂️";
  if (subtypeLower.includes("stopped_car")) return "🚙⚠️";
  if (subtypeLower.includes("pothole")) return "🕳️";
  if (subtypeLower.includes("heavy_rain")) return "🌧️";
  if (subtypeLower.includes("fog")) return "🌫️";
  if (subtypeLower.includes("ice")) return "❄️";

  const emojiMap: Record<string, string> = {
    accident: "💥", // Waze style crash
    jam: "🐢", // Waze style slow traffic
    hazard: "⚠️",
    hazard_on_road: "⚠️",
    hazard_on_shoulder: "🚙⚠️",
    hazard_weather: "🌩️",
    weatherhazard: "🌩️",
    construction: "🚧",
    road_closed: "⛔",
    roadclosed: "⛔",
    police: "👮‍♂️", // Explicit police type
    camera: "📷",
    event: "🎪",
    weather: "⛈️",
    misc: "ℹ️",
  };

  return emojiMap[typeLower] || "⚠️";
}

/**
 * Obtiene el color apropiado para el tipo de incidente
 */
export function getIncidentColor(type: string): string {
  const colorMap: Record<string, string> = {
    accident: "#ef4444", // Red
    jam: "#f97316", // Orange
    hazard: "#eab308", // Yellow
    hazard_on_road: "#eab308",
    hazard_on_shoulder: "#eab308",
    hazard_weather: "#3b82f6", // Blue
    weatherhazard: "#3b82f6",
    construction: "#d97706", // Amber/OrangeDark
    road_closed: "#dc2626", // Red Dark
    roadclosed: "#dc2626",
    police: "#3b82f6", // Blue police
    camera: "#ef4444", // Red camera
    event: "#8b5cf6", // Purple event
    weather: "#60a5fa", // Sky blue weather
    misc: "#6b7280", // Gray
  };
  return colorMap[type.toLowerCase()] || "#6b7280";
}
