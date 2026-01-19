/**
 * Traducciones y mapeos de tipos de Waze para el Backend
 * Centraliza las cadenas de texto para evitar duplicación
 */

export const WAZE_ALERT_TYPES: Record<string, string> = {
  ACCIDENT: "Accidente",
  JAM: "Embotellamiento",
  WEATHERHAZARD: "Peligro Climático",
  HAZARD: "Peligro",
  MISC: "Varios",
  CONSTRUCTION: "Obras",
  ROAD_CLOSED: "Cierre de Ruta",
  CHIT_CHAT: "Chat",
  POLICE: "Policía",
  CAMERA: "Cámara",
  TRAFFIC_LIGHT: "Semáforo",
  NO_TYPE: "Sin Tipo",
};

export const WAZE_ALERT_SUBTYPES: Record<string, string> = {
  // Accidentes
  ACCIDENT_MINOR: "Accidente leve",
  ACCIDENT_MAJOR: "Accidente grave",
  NO_SUBTYPE: "General",

  // Peligros
  HAZARD_ON_ROAD: "Peligro en vía",
  HAZARD_ON_SHOULDER: "Peligro en banquina",
  HAZARD_WEATHER: "Peligro climático",
  HAZARD_ON_ROAD_OBJECT: "Objeto en vía",
  HAZARD_ON_ROAD_POT_HOLE: "Bache",
  HAZARD_ON_ROAD_ROAD_KILL: "Animal atropellado",
  HAZARD_ON_SHOULDER_CAR_STOPPED: "Vehículo detenido",
  HAZARD_ON_SHOULDER_ANIMALS: "Animales en banquina",
  HAZARD_ON_SHOULDER_MISSING_SIGN: "Señal faltante",
  HAZARD_WEATHER_FOG: "Niebla",
  HAZARD_WEATHER_HAIL: "Granizo",
  HAZARD_WEATHER_HEAVY_RAIN: "Lluvia intensa",
  HAZARD_WEATHER_HEAVY_SNOW: "Nieve intensa",
  HAZARD_WEATHER_FLOOD: "Inundación",
  HAZARD_WEATHER_MONSOON: "Monzón",
  HAZARD_WEATHER_TORNADO: "Tornado",
  HAZARD_WEATHER_HEAT_WAVE: "Ola de calor",
  HAZARD_WEATHER_HURRICANE: "Huracán",
  HAZARD_WEATHER_FREEZING_RAIN: "Lluvia helada",
  HAZARD_ON_ROAD_LANE_CLOSED: "Carril cerrado",
  HAZARD_ON_ROAD_OIL: "Aceite en vía",
  HAZARD_ON_ROAD_ICE: "Hielo en vía",
  HAZARD_ON_ROAD_CONSTRUCTION: "Obras en vía",
  HAZARD_ON_ROAD_CAR_STOPPED: "Auto detenido en vía",

  // Tipos adicionales
  ROAD_CLOSED_HAZARD: "Cierre por peligro",
  ROAD_CLOSED_CONSTRUCTION: "Cierre por obras",
  ROAD_CLOSED_EVENT: "Cierre por evento",

  // Policía
  POLICE_VISIBLE: "Policía visible",
  POLICE_HIDDEN: "Policía oculto",
  POLICE_HIDING: "Policía oculto", // Alias

  // Cámaras
  CAMERA_SPEED: "Radar de velocidad",
  CAMERA_RED_LIGHT: "Cámara de semáforo",
  CAMERA_FAKE: "Cámara falsa",
  CAMERA_DUMMY: "Cámara falsa",
};

export const WAZE_ICONS: Record<string, string> = {
  ACCIDENT: "💥",
  JAM: "🚗",
  WEATHERHAZARD: "⛈️",
  HAZARD: "⚠️",
  MISC: "ℹ️",
  CONSTRUCTION: "🚧",
  ROAD_CLOSED: "⛔",
  POLICE: "👮",
  CAMERA: "📷",
  EVENT: "🎪",
};

export function getWazeTypeLabel(type: string): string {
  return WAZE_ALERT_TYPES[type] || WAZE_ALERT_TYPES[type.toUpperCase()] || type;
}

export function getWazeSubtypeLabel(subtype: string): string {
  return (
    WAZE_ALERT_SUBTYPES[subtype] ||
    WAZE_ALERT_SUBTYPES[subtype.toUpperCase()] ||
    subtype
  );
}

export function getWazeIcon(type: string): string {
  return WAZE_ICONS[type] || WAZE_ICONS[type.toUpperCase()] || "📍";
}
