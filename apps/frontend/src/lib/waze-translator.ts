import { getIncidentDescription } from "../utils/wazeTranslations";

/**
 * Traduce los tipos y subtipos de Waze a un formato legible en español.
 */
export const translateWazeType = (type: string, subtype?: string): string => {
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
 * Detecta y traduce palabras clave de Waze incrustadas en un mensaje de texto.
 * Ejemplo: "HAZARD en RN A019" -> "Peligro en la vía en RN A019"
 */
export const translateWazeMessage = (message: string): string => {
  if (!message) return "";

  // Lista de palabras clave prioritarias para buscar en el texto
  const keysToTranslate = [
    "ACCIDENT",
    "JAM",
    "HAZARD",
    "WEATHERHAZARD",
    "ROAD_CLOSED",
    "ROADCLOSED",
    "CONSTRUCTION",
    "POLICE",
    "MISC",
    "CAMERA",
    "EVENT",
  ];

  let translatedMessage = message;

  // 1. Primero intentar traducir si el mensaje ES exactamente una clave (ej. "ACCIDENT_MAJOR")
  if (/^[A-Z0-9_]+$/.test(message)) {
    return translateWazeType("HAZARD", message);
  }

  // 2. Buscar claves sueltas dentro del texto y reemplazarlas
  keysToTranslate.forEach((key) => {
    const regex = new RegExp(`\\b${key}\\b`, "g");
    if (regex.test(translatedMessage)) {
      const translation = translateWazeType(key);
      translatedMessage = translatedMessage.replace(regex, translation);
    }
  });

  return translatedMessage;
};
