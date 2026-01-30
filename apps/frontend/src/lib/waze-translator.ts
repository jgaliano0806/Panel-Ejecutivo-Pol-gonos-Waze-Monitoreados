import { getIncidentDescription } from "../utils/wazeTranslations";

/**
 * Traduce los tipos y subtipos de Waze a un formato legible en español.
 */
export const translateWazeType = (type: string, subtype?: string): string => {
  if (!type) return "Alerta";
  const t = type.toUpperCase();
  const st = subtype ? subtype.toUpperCase() : "";

  // Casos específicos por subtipo
  const subtypeMap: Record<string, string> = {
    ACCIDENT_MINOR: "Accidente leve",
    ACCIDENT_MAJOR: "Accidente grave",
    HAZARD_ON_SHOULDER: "Vehículo en banquina",
    HAZARD_ON_SHOULDER_CAR_STOPPED: "Vehículo detenido en banquina",
    HAZARD_ON_SHOULDER_ANIMALS: "Animales en banquina",
    HAZARD_ON_SHOULDER_MISSING_SIGN: "Señalización faltante",
    HAZARD_ON_ROAD: "Peligro en la calzada",
    HAZARD_ON_ROAD_POT_HOLE: "Bache peligroso",
    HAZARD_ON_ROAD_OBJECT: "Objeto en la vía",
    HAZARD_ON_ROAD_ROAD_KILL: "Animal atropellado",
    HAZARD_ON_ROAD_CONSTRUCTION: "Obras en construcción",
    HAZARD_ON_ROAD_CAR_STOPPED: "Vehículo detenido en calzada",
    HAZARD_ON_ROAD_ICE: "Hielo en la calzada",
    HAZARD_ON_ROAD_OIL: "Aceite en la calzada",
    HAZARD_WEATHER: "Riesgo climático",
    HAZARD_WEATHER_FOG: "Niebla intensa",
    HAZARD_WEATHER_HAIL: "Granizo",
    HAZARD_WEATHER_HEAVY_RAIN: "Lluvia intensa",
    HAZARD_WEATHER_HEAVY_SNOW: "Nieve intensa",
    HAZARD_WEATHER_FLOOD: "Inundación",
    HAZARD_WEATHER_MONSOON: "Tormenta severa",
    HAZARD_WEATHER_HURRICANE: "Vientos huracanados",
    JAM_MODERATE_TRAFFIC: "Tráfico moderado",
    JAM_HEAVY_TRAFFIC: "Tráfico pesado",
    JAM_STAND_STILL_TRAFFIC: "Tráfico detenido",
    JAM_LIGHT_TRAFFIC: "Tráfico ligero",
    ROAD_CLOSED_EVENT: "Calle cerrada por evento",
    ROAD_CLOSED_CONSTRUCTION: "Calle cerrada por obras",
    ROAD_CLOSED_HAZARD: "Calle cerrada por peligro",
  };

  if (st && subtypeMap[st]) {
    return subtypeMap[st];
  }

  // Fallbacks por tipo general
  switch (t) {
    case "ACCIDENT":
      return "Accidente reportado";
    case "JAM":
      return "Embotellamiento";
    case "WEATHERHAZARD":
    case "HAZARD":
      return "Peligro en la vía";
    case "ROAD_CLOSED":
      return "Calle cerrada";
    case "CONSTRUCTION":
      return "Obras";
    default:
      // Si no tenemos traducción directa aquí, delegamos a la utilidad principal
      // que tiene más traducciones y lógica de formateo (Title Case vs Raw Key)
      return getIncidentDescription(type, subtype) || st || "Alerta de tráfico";
  }
};

/**
 * Mapa completo de subtipos de Waze a español argentino natural.
 * Incluye variantes con y sin guiones bajos.
 */
const FULL_SUBTYPE_TRANSLATIONS: Record<string, string> = {
  // Subtipos completos (prioridad alta)
  "HAZARD_ON_SHOULDER_CAR_STOPPED": "Vehículo detenido en banquina",
  "HAZARD ON SHOULDER CAR STOPPED": "Vehículo detenido en banquina",
  "HAZARD_ON_SHOULDER_ANIMALS": "Animales en banquina",
  "HAZARD ON SHOULDER ANIMALS": "Animales en banquina",
  "HAZARD_ON_SHOULDER_MISSING_SIGN": "Señal faltante",
  "HAZARD ON SHOULDER MISSING SIGN": "Señal faltante",
  "HAZARD_ON_SHOULDER": "Vehículo en banquina",
  "HAZARD ON SHOULDER": "Vehículo en banquina",
  "HAZARD_ON_ROAD_POT_HOLE": "Bache en la calzada",
  "HAZARD ON ROAD POT HOLE": "Bache en la calzada",
  "HAZARD_ON_ROAD_OBJECT": "Objeto en la calzada",
  "HAZARD ON ROAD OBJECT": "Objeto en la calzada",
  "HAZARD_ON_ROAD_ROAD_KILL": "Animal atropellado",
  "HAZARD ON ROAD ROAD KILL": "Animal atropellado",
  "HAZARD_ON_ROAD_CONSTRUCTION": "Obras en la vía",
  "HAZARD ON ROAD CONSTRUCTION": "Obras en la vía",
  "HAZARD_ON_ROAD_CAR_STOPPED": "Vehículo detenido en calzada",
  "HAZARD ON ROAD CAR STOPPED": "Vehículo detenido en calzada",
  "HAZARD_ON_ROAD_ICE": "Hielo en la calzada",
  "HAZARD ON ROAD ICE": "Hielo en la calzada",
  "HAZARD_ON_ROAD_OIL": "Derrame de aceite",
  "HAZARD ON ROAD OIL": "Derrame de aceite",
  "HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT": "Semáforo averiado",
  "HAZARD ON ROAD TRAFFIC LIGHT FAULT": "Semáforo averiado",
  "HAZARD_ON_ROAD_LANE_CLOSED": "Carril cerrado",
  "HAZARD ON ROAD LANE CLOSED": "Carril cerrado",
  "HAZARD_ON_ROAD": "Peligro en calzada",
  "HAZARD ON ROAD": "Peligro en calzada",
  "HAZARD_WEATHER_FOG": "Niebla",
  "HAZARD WEATHER FOG": "Niebla",
  "HAZARD_WEATHER_HAIL": "Granizo",
  "HAZARD WEATHER HAIL": "Granizo",
  "HAZARD_WEATHER_HEAVY_RAIN": "Lluvia intensa",
  "HAZARD WEATHER HEAVY RAIN": "Lluvia intensa",
  "HAZARD_WEATHER_HEAVY_SNOW": "Nevada",
  "HAZARD WEATHER HEAVY SNOW": "Nevada",
  "HAZARD_WEATHER_FLOOD": "Inundación",
  "HAZARD WEATHER FLOOD": "Inundación",
  "HAZARD_WEATHER_FREEZING_RAIN": "Camino con hielo",
  "HAZARD WEATHER FREEZING RAIN": "Camino con hielo",
  "HAZARD_WEATHER_SLIPPERY_ROAD": "Camino resbaladizo",
  "HAZARD WEATHER SLIPPERY ROAD": "Camino resbaladizo",
  "HAZARD_WEATHER": "Mal tiempo",
  "HAZARD WEATHER": "Mal tiempo",
  "ACCIDENT_MINOR": "Accidente leve",
  "ACCIDENT MINOR": "Accidente leve",
  "ACCIDENT_MAJOR": "Accidente grave",
  "ACCIDENT MAJOR": "Accidente grave",
  "JAM_MODERATE_TRAFFIC": "Tránsito lento",
  "JAM MODERATE TRAFFIC": "Tránsito lento",
  "JAM_HEAVY_TRAFFIC": "Embotellamiento",
  "JAM HEAVY TRAFFIC": "Embotellamiento",
  "JAM_STAND_STILL_TRAFFIC": "Tránsito detenido",
  "JAM STAND STILL TRAFFIC": "Tránsito detenido",
  "JAM_LIGHT_TRAFFIC": "Tránsito fluido",
  "JAM LIGHT TRAFFIC": "Tránsito fluido",
  "ROAD_CLOSED_EVENT": "Calle cerrada por evento",
  "ROAD CLOSED EVENT": "Calle cerrada por evento",
  "ROAD_CLOSED_CONSTRUCTION": "Calle cerrada por obras",
  "ROAD CLOSED CONSTRUCTION": "Calle cerrada por obras",
  "ROAD_CLOSED_HAZARD": "Calle cerrada por peligro",
  "ROAD CLOSED HAZARD": "Calle cerrada por peligro",
  "ROAD_CLOSED": "Calle cerrada",
  "ROAD CLOSED": "Calle cerrada",
  // Fragmentos comunes que pueden aparecer sueltos
  "ON_SHOULDER": "en banquina",
  "ON SHOULDER": "en banquina",
  "ON_ROAD": "en calzada",
  "ON ROAD": "en calzada",
  "CAR_STOPPED": "vehículo detenido",
  "CAR STOPPED": "vehículo detenido",
  "POT_HOLE": "bache",
  "POT HOLE": "bache",
  // Tipos principales
  "HAZARD": "Peligro",
  "ACCIDENT": "Accidente",
  "JAM": "Congestión",
  "WEATHERHAZARD": "Riesgo climático",
  "CONSTRUCTION": "Obras",
  "POLICE": "Control policial",
};

/**
 * Detecta y traduce palabras clave de Waze incrustadas en un mensaje de texto.
 * Prioriza subtipos completos antes que palabras sueltas.
 * Ejemplo: "HAZARD_ON_SHOULDER_CAR_STOPPED" -> "Vehículo detenido en banquina"
 */
export const translateWazeMessage = (message: string): string => {
  if (!message) return "";

  let result = message;

  // 1. Si el mensaje ES exactamente un subtipo conocido, traducirlo directamente
  const upperMessage = message.toUpperCase().trim();
  if (FULL_SUBTYPE_TRANSLATIONS[upperMessage]) {
    return FULL_SUBTYPE_TRANSLATIONS[upperMessage];
  }

  // 2. Ordenar las keys por longitud (más largas primero) para evitar traducciones parciales
  const sortedKeys = Object.keys(FULL_SUBTYPE_TRANSLATIONS).sort(
    (a, b) => b.length - a.length
  );

  // 3. Reemplazar todas las ocurrencias de subtipos/tipos en el mensaje
  for (const key of sortedKeys) {
    // Crear regex que busque la key (case insensitive)
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedKey, "gi");

    if (regex.test(result)) {
      result = result.replace(regex, FULL_SUBTYPE_TRANSLATIONS[key]);
    }
  }

  // 4. Limpiar redundancias y reorganizar frases

  // Detectar patrones dentro de paréntesis y traducirlos correctamente
  result = result.replace(
    /\((?:Peligro\s*)?(?:en la vía\s*)?(?:en banquina\s*)?(vehículo detenido|Vehículo detenido)(?:\s*en banquina)?\)/gi,
    "(Vehículo detenido en banquina)"
  );

  // Limpiar "Peligro en la vía" cuando ya hay descripción específica
  result = result.replace(
    /\(Peligro(?:\s+en la vía)?\s+(Vehículo|Bache|Objeto|Animal|Obras|Semáforo|Carril|Hielo|Derrame|Niebla|Granizo|Lluvia|Nevada|Inundación|Mal tiempo|Camino)/gi,
    "($1"
  );

  // Si el mensaje tiene formato "algo (Peligro ...)", simplificar
  result = result.replace(/\(Peligro\s*\)/gi, "");

  // Limpiar duplicados de "en banquina"
  result = result.replace(/en banquina\s+en banquina/gi, "en banquina");

  // Ordenar correctamente "en banquina vehículo detenido" -> "vehículo detenido en banquina"
  result = result.replace(/en banquina\s+(vehículo detenido)/gi, "$1 en banquina");

  // Limpiar paréntesis vacíos
  result = result.replace(/\(\s*\)/g, "");

  // Limpiar espacios múltiples
  result = result.replace(/\s+/g, " ").trim();

  return result;
};
