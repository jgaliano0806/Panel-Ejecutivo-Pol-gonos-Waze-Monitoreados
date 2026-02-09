/**
 * Traducciones de tipos y subtipos de Waze al español
 * Equivalente a: apps/frontend/src/utils/wazeTranslations.ts
 */

/**
 * Mapeo directo de subtipos RAW a traducciones
 */
export const SUBTYPE_DIRECT_TRANSLATIONS: Record<string, string> = {
  // Accidentes
  ACCIDENT: 'Accidente',
  ACCIDENT_MINOR: 'Accidente leve',
  ACCIDENT_MAJOR: 'Colisión múltiple',

  // Tráfico
  JAM_LIGHT_TRAFFIC: 'Tránsito lento',
  JAM_MODERATE_TRAFFIC: 'Tránsito denso',
  JAM_HEAVY_TRAFFIC: 'Embotellamiento',
  JAM_STAND_STILL_TRAFFIC: 'Tránsito detenido',

  // Peligros en calzada
  HAZARD_ON_ROAD: 'Peligro en calzada',
  HAZARD_ON_ROAD_OBJECT: 'Objeto en calzada',
  HAZARD_ON_ROAD_POT_HOLE: 'Bache',
  HAZARD_ON_ROAD_ROAD_KILL: 'Animal muerto en calzada',
  HAZARD_ON_ROAD_LANE_CLOSED: 'Carril cerrado',
  HAZARD_ON_ROAD_OIL: 'Derrame de aceite',
  HAZARD_ON_ROAD_ICE: 'Hielo en calzada',
  HAZARD_ON_ROAD_CONSTRUCTION: 'Obras',
  HAZARD_ON_ROAD_CAR_STOPPED: 'Vehículo detenido en carril',
  HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT: 'Semáforo averiado',

  // Peligros en banquina
  HAZARD_ON_SHOULDER: 'Vehículo en banquina',
  HAZARD_ON_SHOULDER_CAR_STOPPED: 'Vehículo en banquina',
  HAZARD_ON_SHOULDER_ANIMALS: 'Animales en banquina',
  HAZARD_ON_SHOULDER_MISSING_SIGN: 'Señal faltante',

  // Clima
  HAZARD_WEATHER: 'Mal tiempo',
  HAZARD_WEATHER_FOG: 'Niebla',
  HAZARD_WEATHER_HAIL: 'Granizo',
  HAZARD_WEATHER_HEAVY_RAIN: 'Lluvia intensa',
  HAZARD_WEATHER_HEAVY_SNOW: 'Nieve en el camino',
  HAZARD_WEATHER_FLOOD: 'Inundación',
  HAZARD_WEATHER_MONSOON: 'Lluvia intensa',
  HAZARD_WEATHER_TORNADO: 'Tornado',
  HAZARD_WEATHER_HEAT_WAVE: 'Ola de calor',
  HAZARD_WEATHER_HURRICANE: 'Huracán',
  HAZARD_WEATHER_FREEZING_RAIN: 'Camino con hielo',
  HAZARD_WEATHER_SLIPPERY_ROAD: 'Camino resbaladizo',

  // Camino cerrado
  ROAD_CLOSED: 'Cierre',
  ROAD_CLOSED_HAZARD: 'Cierre por peligro',
  ROAD_CLOSED_CONSTRUCTION: 'Cierre por obras',
  ROAD_CLOSED_EVENT: 'Cierre por evento',

  // Carril bloqueado
  LANE_CLOSED: 'Carril bloqueado',
  LANE_CLOSED_LEFT: 'Carril izquierdo bloqueado',
  LANE_CLOSED_RIGHT: 'Carril derecho bloqueado',
  LANE_CLOSED_CENTER: 'Carril central bloqueado',

  // Policía
  POLICE: 'Policía',
  POLICE_VISIBLE: 'Policía visible',
  POLICE_HIDDEN: 'Policía oculto',
  POLICE_SPEED_TRAP: 'Radar móvil',
  POLICE_OTHER_SIDE: 'Policía al otro lado',

  // Cámaras
  CAMERA: 'Cámara',
  CAMERA_SPEED: 'Radar de velocidad',
  CAMERA_RED_LIGHT: 'Cámara de semáforo',
  CAMERA_FAKE: 'Cámara falsa',
  CAMERA_MOBILE: 'Radar móvil',

  // Eventos
  EVENT: 'Evento',
  EVENT_CONCERT: 'Evento - Concierto',
  EVENT_SPORT: 'Evento deportivo',
  EVENT_OTHER: 'Evento especial',

  // Clima
  WEATHER: 'Clima adverso',
  WEATHER_FOG: 'Niebla',
  WEATHER_HEAVY_RAIN: 'Lluvia intensa',
  WEATHER_HAIL: 'Granizo',
  WEATHER_HEAVY_SNOW: 'Nieve intensa',
  WEATHER_FLOOD: 'Inundación',
  WEATHER_ICY_ROAD: 'Camino con hielo',

  // Construcción
  CONSTRUCTION: 'Obras',
};

// Mapeo de tipos principales a español
export const MAIN_TYPE_TRANSLATIONS: Record<string, string> = {
  // Tipos principales en minúsculas
  accident: 'Siniestro',
  jam: 'Congestión',
  hazard: 'Peligro',
  hazard_on_road: 'Peligro en calzada',
  hazard_on_shoulder: 'Peligro en banquina',
  hazard_weather: 'Peligro climático',
  weatherhazard: 'Peligro climático',
  construction: 'Obra vial',
  road_closed: 'Corte de ruta',
  roadclosed: 'Corte de ruta',
  misc: 'Otro',
  // Tipos en mayúsculas (como vienen de Waze)
  ACCIDENT: 'Siniestro',
  JAM: 'Congestión',
  HAZARD: 'Peligro',
  CONSTRUCTION: 'Obra vial',
  ROAD_CLOSED: 'Corte de ruta',
  WEATHERHAZARD: 'Peligro climático',
  MISC: 'Otro',
  // Cámaras
  CAMERA: 'Cámara de tráfico',
  camera: 'Cámara de tráfico',
  // Eventos
  EVENT: 'Evento especial',
  event: 'Evento especial',
  // Clima
  WEATHER: 'Clima adverso',
  weather: 'Clima adverso',
  // Policía
  POLICE: 'Control policial',
  police: 'Control policial',
};

export const JAM_LEVEL_TRANSLATIONS: Record<string, string> = {
  '0': 'Flujo libre',
  '1': 'Tránsito fluido',
  '2': 'Tránsito lento',
  '3': 'Demora moderada',
  '4': 'Congestionado',
  '5': 'Tránsito detenido',
};

/**
 * Obtiene la traducción de un subtipo de incidente
 */
export function getSubtypeTranslation(type: string, subtype: string): string {
  if (!subtype) return '';
  
  // Intentar con el mapeo directo de subtipos
  const upperSubtype = subtype.toUpperCase();
  if (SUBTYPE_DIRECT_TRANSLATIONS[upperSubtype]) {
    return SUBTYPE_DIRECT_TRANSLATIONS[upperSubtype];
  }

  // Último recurso: convertir el subtipo a formato legible
  return formatSubtypeToReadable(subtype);
}

/**
 * Convierte un subtipo RAW a formato legible
 * Ejemplo: "HAZARD_ON_SHOULDER_CAR_STOPPED" -> "Peligro En Banquina Auto Detenido"
 */
function formatSubtypeToReadable(subtype: string): string {
  if (!subtype) return '';
  return String(subtype)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Obtiene la traducción del tipo principal
 */
export function getMainTypeTranslation(type: string): string {
  if (!type) return 'Alerta';

  // Buscar primero tal cual viene
  if (MAIN_TYPE_TRANSLATIONS[type]) {
    return MAIN_TYPE_TRANSLATIONS[type];
  }
  // Buscar en minúsculas
  const lowerType = (type || '').toLowerCase();
  if (MAIN_TYPE_TRANSLATIONS[lowerType]) {
    return MAIN_TYPE_TRANSLATIONS[lowerType];
  }
  // Buscar en mayúsculas
  const upperType = (type || '').toUpperCase();
  if (MAIN_TYPE_TRANSLATIONS[upperType]) {
    return MAIN_TYPE_TRANSLATIONS[upperType];
  }
  // Si no se encuentra, retornar el original
  return type;
}

/**
 * Obtiene una descripción completa del incidente en español
 */
export function getIncidentDescription(type: string, subtype?: string): string {
  if (subtype && subtype !== 'NO_SUBTYPE') {
    const translation = getSubtypeTranslation(type, subtype);
    if (translation !== subtype) {
      return translation;
    }
  }
  return getMainTypeTranslation(type);
}

/**
 * Obtiene el emoji para el tipo de incidente
 */
export function getIncidentEmoji(type: string, subtype?: string): string {
  const typeLower = (type || '').toLowerCase();
  const subtypeLower = (subtype || '').toLowerCase();

  // Iconos específicos por subtipo
  if (subtypeLower.includes('police')) return '👮‍♂️';
  if (subtypeLower.includes('pot_hole')) return '🕳️';
  if (subtypeLower.includes('heavy_rain')) return '🌧️';
  if (subtypeLower.includes('fog')) return '🌫️';
  if (subtypeLower.includes('ice')) return '❄️';

  const emojiMap: Record<string, string> = {
    accident: '💥',
    jam: '🐢',
    hazard: '⚠️',
    hazard_on_road: '⚠️',
    hazard_on_shoulder: '🚙',
    hazard_weather: '🌩️',
    weatherhazard: '🌩️',
    construction: '🚧',
    road_closed: '⛔',
    roadclosed: '⛔',
    police: '👮‍♂️',
    camera: '📷',
    event: '🎪',
    weather: '⛈️',
    misc: 'ℹ️',
  };

  return emojiMap[typeLower] || '⚠️';
}

/**
 * Obtiene la traducción del nivel de congestión
 */
export function getJamLevelTranslation(level: number | string): string {
  return JAM_LEVEL_TRANSLATIONS[String(level)] || `Nivel ${level}`;
}
