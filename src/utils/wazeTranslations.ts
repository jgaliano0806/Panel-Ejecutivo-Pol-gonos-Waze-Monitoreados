/**
 * Traducciones de tipos y subtipos de Waze al español
 */

export const WAZE_TRANSLATIONS = {
    accident: {
        ACCIDENT_MINOR: "Siniestro vial leve",
        ACCIDENT_MAJOR: "Siniestro vial grave",
        NO_SUBTYPE: "Siniestro sin clasificar"
    },
    jam: {
        JAM_LIGHT_TRAFFIC: "Tránsito lento",
        JAM_MODERATE_TRAFFIC: "Tránsito denso",
        JAM_HEAVY_TRAFFIC: "Embotellamiento",
        JAM_STAND_STILL_TRAFFIC: "Tránsito detenido",
        NO_SUBTYPE: "Congestión genérica"
    },
    hazard_on_road: {
        HAZARD_ON_ROAD: "Peligro en calzada",
        HAZARD_ON_ROAD_OBJECT: "Objeto en calzada",
        HAZARD_ON_ROAD_POT_HOLE: "Bache",
        HAZARD_ON_ROAD_ROAD_KILL: "Animal muerto en calzada",
        HAZARD_ON_ROAD_LANE_CLOSED: "Carril cerrado",
        HAZARD_ON_ROAD_OIL: "Derrame de aceite",
        HAZARD_ON_ROAD_ICE: "Hielo en calzada",
        HAZARD_ON_ROAD_CONSTRUCTION: "Obra en ejecución",
        HAZARD_ON_ROAD_CAR_STOPPED: "Vehículo detenido en carril",
        HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT: "Semáforo averiado"
    },
    hazard_on_shoulder: {
        HAZARD_ON_SHOULDER: "Peligro en banquina",
        HAZARD_ON_SHOULDER_CAR_STOPPED: "Vehículo en banquina",
        HAZARD_ON_SHOULDER_ANIMALS: "Animales en banquina",
        HAZARD_ON_SHOULDER_MISSING_SIGN: "Señal faltante"
    },
    hazard_weather: {
        HAZARD_WEATHER: "Peligro climático",
        HAZARD_WEATHER_FOG: "Niebla",
        HAZARD_WEATHER_HAIL: "Granizo",
        HAZARD_WEATHER_HEAVY_RAIN: "Lluvia intensa",
        HAZARD_WEATHER_HEAVY_SNOW: "Nevada",
        HAZARD_WEATHER_FLOOD: "Inundación",
        HAZARD_WEATHER_MONSOON: "Lluvia monzónica",
        HAZARD_WEATHER_TORNADO: "Tornado",
        HAZARD_WEATHER_HEAT_WAVE: "Ola de calor",
        HAZARD_WEATHER_HURRICANE: "Huracán",
        HAZARD_WEATHER_FREEZING_RAIN: "Lluvia congelante"
    },
    construction: {
        CONSTRUCTION: "Obra vial",
        NO_SUBTYPE: "Obra sin especificar"
    },
    road_closed: {
        ROAD_CLOSED: "Corte total",
        ROAD_CLOSED_HAZARD: "Cierre por peligro",
        ROAD_CLOSED_CONSTRUCTION: "Cierre por obra",
        ROAD_CLOSED_EVENT: "Cierre por evento",
        NO_SUBTYPE: "Corte sin especificar"
    },
    misc: {
        MISC: "Incidente no categorizado",
        NO_SUBTYPE: "Sin clasificar"
    }
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
    "21": "Colectora"
};

export const JAM_LEVEL_TRANSLATIONS: Record<string, string> = {
    "0": "Flujo libre",
    "1": "Tránsito fluido",
    "2": "Tránsito lento",
    "3": "Demora importante",
    "4": "Muy demorado",
    "5": "Detenido"
};

export const IRREGULARITY_TYPE_TRANSLATIONS: Record<string, string> = {
    "NONE": "Sin irregularidad",
    "SMALL": "Anomalía leve",
    "MEDIUM": "Anomalía moderada",
    "LARGE": "Anomalía importante",
    "HUGE": "Anomalía masiva"
};

// Mapeo de tipos principales a español
export const MAIN_TYPE_TRANSLATIONS: Record<string, string> = {
    accident: "Siniestro vial",
    jam: "Congestión",
    hazard: "Peligro",
    hazard_on_road: "Peligro en calzada",
    hazard_on_shoulder: "Peligro en banquina",
    hazard_weather: "Peligro climático",
    weatherhazard: "Peligro climático",
    construction: "Obra",
    road_closed: "Corte de ruta",
    roadclosed: "Corte de ruta",
    misc: "Otro"
};

/**
 * Obtiene la traducción de un subtipo de incidente
 */
export function getSubtypeTranslation(type: string, subtype: string): string {
    // Primero intentar con el tipo proporcionado
    const typeKey = type as keyof typeof WAZE_TRANSLATIONS;
    if (typeKey in WAZE_TRANSLATIONS) {
        const translations = WAZE_TRANSLATIONS[typeKey] as Record<string, string>;
        if (translations[subtype]) {
            return translations[subtype];
        }
    }
    
    // Si no funciona, intentar extraer el tipo del subtipo
    // Por ejemplo: "HAZARD_ON_ROAD_CONSTRUCTION" -> buscar en "hazard_on_road"
    for (const translations of Object.values(WAZE_TRANSLATIONS)) {
        const typedTranslations = translations as Record<string, string>;
        if (typedTranslations[subtype]) {
            return typedTranslations[subtype];
        }
    }
    
    return subtype;
}

/**
 * Obtiene la traducción del tipo principal
 */
export function getMainTypeTranslation(type: string): string {
    return MAIN_TYPE_TRANSLATIONS[type] || type;
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
    if (subtype && subtype !== 'NO_SUBTYPE') {
        const translation = getSubtypeTranslation(type, subtype);
        // Si encontramos una traducción válida (no es el mismo subtype), la retornamos
        if (translation !== subtype) {
            return translation;
        }
    }
    
    // Si no hay subtipo o no se encontró traducción, usar el tipo principal
    return getMainTypeTranslation(type);
}

/**
 * Obtiene el emoji apropiado para el tipo de incidente
 */
export function getIncidentEmoji(type: string): string {
    const emojiMap: Record<string, string> = {
        accident: "🚗💥",
        jam: "🚦",
        hazard: "⚠️",
        hazard_on_road: "⚠️",
        hazard_on_shoulder: "🚧",
        hazard_weather: "🌧️",
        weatherhazard: "🌧️",
        construction: "🏗️",
        road_closed: "🚫",
        roadclosed: "🚫",
        misc: "📍"
    };
    return emojiMap[type.toLowerCase()] || "⚠️";
}

/**
 * Obtiene el color apropiado para el tipo de incidente
 */
export function getIncidentColor(type: string): string {
    const colorMap: Record<string, string> = {
        accident: "red",
        jam: "orange",
        hazard: "yellow",
        hazard_on_road: "yellow",
        hazard_on_shoulder: "amber",
        hazard_weather: "blue",
        weatherhazard: "blue",
        construction: "purple",
        road_closed: "red",
        roadclosed: "red",
        misc: "gray"
    };
    return colorMap[type.toLowerCase()] || "gray";
}
