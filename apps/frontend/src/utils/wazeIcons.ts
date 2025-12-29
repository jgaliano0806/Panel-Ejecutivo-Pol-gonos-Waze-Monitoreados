/**
 * Iconos oficiales de Waze
 * Mapeados según los tipos y subtipos del feed de Waze
 */

// Base URL de iconos del Partner Hub de Waze
const WAZE_PARTNER_HUB_BASE = 'https://web-assets.waze.com/webapps/partnerhub-web/1.1.1333/assets/icons';

// URL del proxy de iconos (usando nuestro backend para autenticación)
const ICONS_PROXY_BASE = '/api/icons';

// Iconos SVG inline como fallback (basados en los iconos oficiales de Waze)
export const WAZE_ICONS_SVG: Record<string, string> = {
    // === ACCIDENTES ===
    'accident': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="20" fill="#FF6B6B"/>
        <path d="M16 28L20 20L24 28L28 20L32 28" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="18" cy="32" r="3" fill="white"/>
        <circle cx="30" cy="32" r="3" fill="white"/>
    </svg>`,

    'accident_major': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="20" fill="#DC2626"/>
        <path d="M14 26L18 18L22 26M26 26L30 18L34 26" stroke="white" stroke-width="2.5"/>
        <path d="M20 32L24 28L28 32" stroke="#FFD700" stroke-width="3"/>
        <circle cx="16" cy="34" r="2.5" fill="white"/>
        <circle cx="32" cy="34" r="2.5" fill="white"/>
    </svg>`,

    // === TRÁFICO / ATASCOS ===
    'jam': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="20" width="12" height="8" rx="2" fill="#EF4444"/>
        <rect x="18" y="20" width="12" height="8" rx="2" fill="#F97316"/>
        <rect x="28" y="20" width="12" height="8" rx="2" fill="#EAB308"/>
        <circle cx="11" cy="32" r="2" fill="#374151"/>
        <circle cx="17" cy="32" r="2" fill="#374151"/>
        <circle cx="21" cy="32" r="2" fill="#374151"/>
        <circle cx="27" cy="32" r="2" fill="#374151"/>
        <circle cx="31" cy="32" r="2" fill="#374151"/>
        <circle cx="37" cy="32" r="2" fill="#374151"/>
    </svg>`,

    // === PELIGROS ===
    'hazard': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 6L44 42H4L24 6Z" fill="#FBBF24" stroke="#B45309" stroke-width="2"/>
        <path d="M24 18V28" stroke="#B45309" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="35" r="2.5" fill="#B45309"/>
    </svg>`,

    'hazard_on_road': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 6L44 42H4L24 6Z" fill="#FBBF24" stroke="#B45309" stroke-width="2"/>
        <path d="M24 18V28" stroke="#B45309" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="35" r="2.5" fill="#B45309"/>
    </svg>`,

    'hazard_on_shoulder': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="16" width="10" height="20" rx="2" fill="#6B7280"/>
        <circle cx="33" cy="38" r="3" fill="#374151"/>
        <circle cx="38" cy="38" r="3" fill="#374151"/>
        <path d="M8 24h18" stroke="#9CA3AF" stroke-width="2" stroke-dasharray="4 2"/>
    </svg>`,

    'hazard_weather': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 28a8 8 0 1115.5-3H32a6 6 0 110 12H14a6 6 0 01-2-11.7z" fill="#64748B"/>
        <path d="M18 36l-2 6M24 36l-2 6M30 36l-2 6" stroke="#60A5FA" stroke-width="2" stroke-linecap="round"/>
        <path d="M26 20l4-6" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/>
    </svg>`,

    // === OBRAS / CONSTRUCCIÓN ===
    'construction': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="24" cy="14" rx="12" ry="6" fill="#FBBF24"/>
        <path d="M12 14v4c0 3.3 5.4 6 12 6s12-2.7 12-6v-4" fill="#F59E0B"/>
        <rect x="20" y="24" width="8" height="16" fill="#78716C"/>
        <circle cx="24" cy="10" r="2" fill="#78716C"/>
    </svg>`,

    // === CAMINO CERRADO ===
    'roadclosed': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="18" width="32" height="12" rx="2" fill="#EF4444"/>
        <rect x="8" y="18" width="32" height="4" fill="#FBBF24"/>
        <rect x="8" y="26" width="32" height="4" fill="#FBBF24"/>
        <rect x="6" y="30" width="4" height="10" fill="#78716C"/>
        <rect x="38" y="30" width="4" height="10" fill="#78716C"/>
    </svg>`,

    'roadclosed_event': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="20" width="32" height="8" rx="1" fill="#EF4444"/>
        <path d="M8 20h32v2H8z" fill="white" fill-opacity="0.5"/>
        <rect x="10" y="28" width="2" height="8" fill="#6B7280"/>
        <rect x="36" y="28" width="2" height="8" fill="#6B7280"/>
    </svg>`,

    // === BACHE ===
    'pothole': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="24" cy="32" rx="14" ry="8" fill="#1F2937"/>
        <ellipse cx="24" cy="30" rx="10" ry="5" fill="#374151"/>
        <path d="M14 28c2-4 8-6 10-6s8 2 10 6" stroke="#6B7280" stroke-width="2"/>
    </svg>`,

    // === CLIMA ===
    'weatherhazard': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 28a8 8 0 1115.5-3H32a6 6 0 110 12H14a6 6 0 01-2-11.7z" fill="#64748B"/>
        <path d="M18 36l-2 6M24 36l-2 6M30 36l-2 6" stroke="#60A5FA" stroke-width="2" stroke-linecap="round"/>
        <path d="M26 18l4-8" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/>
    </svg>`,

    'weather_flood': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 32c4 0 4 4 8 4s4-4 8-4 4 4 8 4 4-4 8-4 4 4 8 4" stroke="#3B82F6" stroke-width="3" fill="none"/>
        <path d="M6 38c4 0 4 4 8 4s4-4 8-4 4 4 8 4 4-4 8-4 4 4 8 4" stroke="#60A5FA" stroke-width="3" fill="none"/>
        <rect x="18" y="14" width="12" height="14" rx="2" fill="#EF4444"/>
        <circle cx="21" cy="30" r="2" fill="#1F2937"/>
        <circle cx="27" cy="30" r="2" fill="#1F2937"/>
    </svg>`,

    'weather_fog': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 20h32" stroke="#9CA3AF" stroke-width="4" stroke-linecap="round"/>
        <path d="M12 28h24" stroke="#D1D5DB" stroke-width="4" stroke-linecap="round"/>
        <path d="M8 36h32" stroke="#E5E7EB" stroke-width="4" stroke-linecap="round"/>
    </svg>`,

    'weather_ice': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="28" width="32" height="8" rx="2" fill="#BFDBFE"/>
        <path d="M16 24l8-12 8 12" fill="#60A5FA"/>
        <circle cx="24" cy="18" r="4" fill="#3B82F6"/>
        <path d="M12 32h24" stroke="white" stroke-width="2" stroke-dasharray="2 2"/>
    </svg>`,

    'weather_hail': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 24a8 8 0 1115.5-3H32a6 6 0 110 12H14a6 6 0 01-2-11.7z" fill="#64748B"/>
        <circle cx="16" cy="38" r="3" fill="white" stroke="#94A3B8"/>
        <circle cx="24" cy="40" r="3" fill="white" stroke="#94A3B8"/>
        <circle cx="32" cy="38" r="3" fill="white" stroke="#94A3B8"/>
    </svg>`,

    // === POLICÍA ===
    'police': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="16" fill="#3B82F6"/>
        <ellipse cx="24" cy="28" rx="8" ry="6" fill="#FCD34D"/>
        <ellipse cx="24" cy="16" rx="10" ry="4" fill="#1E3A8A"/>
        <rect x="22" y="12" width="4" height="4" fill="#60A5FA"/>
        <circle cx="20" cy="26" r="2" fill="#1F2937"/>
        <circle cx="28" cy="26" r="2" fill="#1F2937"/>
        <path d="M20 32c2 2 6 2 8 0" stroke="#1F2937" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

    'police_visible': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="16" fill="#3B82F6"/>
        <ellipse cx="24" cy="28" rx="8" ry="6" fill="#FCD34D"/>
        <ellipse cx="24" cy="16" rx="10" ry="4" fill="#1E3A8A"/>
        <circle cx="20" cy="26" r="2" fill="#1F2937"/>
        <circle cx="28" cy="26" r="2" fill="#1F2937"/>
    </svg>`,

    'police_hidden': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="16" fill="#6B7280"/>
        <ellipse cx="24" cy="28" rx="8" ry="6" fill="#FCD34D"/>
        <rect x="16" y="24" width="16" height="4" fill="#1F2937"/>
        <ellipse cx="24" cy="16" rx="10" ry="4" fill="#374151"/>
    </svg>`,

    // === CONO / CARRIL BLOQUEADO ===
    'lane_blocked': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 40h12l4-28h-20l4 28z" fill="#F97316"/>
        <path d="M19 36h10l2-12h-14l2 12z" fill="white"/>
        <path d="M20 32h8l1-6h-10l1 6z" fill="#F97316"/>
        <rect x="16" y="40" width="16" height="4" fill="#1F2937"/>
    </svg>`,

    // === OBJETO EN LA VÍA ===
    'object_on_road': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="16" y="20" width="16" height="12" rx="2" fill="#78716C"/>
        <rect x="14" y="32" width="20" height="4" fill="#57534E"/>
        <circle cx="24" cy="26" r="4" fill="#A8A29E"/>
    </svg>`,

    // === SEMÁFORO ===
    'traffic_light_fault': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="8" width="12" height="32" rx="2" fill="#374151"/>
        <circle cx="24" cy="14" r="4" fill="#EF4444"/>
        <circle cx="24" cy="24" r="4" fill="#FBBF24"/>
        <circle cx="24" cy="34" r="4" fill="#22C55E"/>
        <path d="M16 20l16 8M16 28l16-8" stroke="#EF4444" stroke-width="3"/>
    </svg>`,

    // === DEFAULT ===
    'default': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="18" fill="#6B7280"/>
        <path d="M24 14v12" stroke="white" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="32" r="3" fill="white"/>
    </svg>`,
};

// Mapeo de tipos principales a iconos
export const INCIDENT_TYPE_ICONS: Record<string, string> = {
    'accident': 'accident',
    'jam': 'jam',
    'hazard': 'hazard',
    'construction': 'construction',
    'roadclosed': 'roadclosed',
    'pothole': 'pothole',
    'weatherhazard': 'weatherhazard',
    'police': 'police',
};

// Mapeo de subtipos a iconos específicos
export const INCIDENT_SUBTYPE_ICONS: Record<string, string> = {
    // Accidentes
    'ACCIDENT_MINOR': 'accident',
    'ACCIDENT_MAJOR': 'accident_major',

    // Peligros
    'HAZARD_ON_ROAD': 'hazard_on_road',
    'HAZARD_ON_SHOULDER': 'hazard_on_shoulder',
    'HAZARD_ON_ROAD_CAR_STOPPED': 'hazard_on_shoulder',
    'HAZARD_ON_ROAD_CONSTRUCTION': 'construction',
    'HAZARD_ON_ROAD_OBJECT': 'object_on_road',
    'HAZARD_ON_ROAD_POT_HOLE': 'pothole',
    'HAZARD_ON_ROAD_ROAD_KILL': 'hazard_on_road',
    'HAZARD_ON_SHOULDER_CAR_STOPPED': 'hazard_on_shoulder',
    'HAZARD_ON_SHOULDER_ANIMALS': 'hazard',
    'HAZARD_ON_SHOULDER_MISSING_SIGN': 'hazard',
    'HAZARD_WEATHER': 'hazard_weather',
    'HAZARD_WEATHER_FOG': 'weather_fog',
    'HAZARD_WEATHER_HAIL': 'weather_hail',
    'HAZARD_WEATHER_HEAVY_RAIN': 'weatherhazard',
    'HAZARD_WEATHER_HEAVY_SNOW': 'weather_ice',
    'HAZARD_WEATHER_FLOOD': 'weather_flood',
    'HAZARD_WEATHER_MONSOON': 'weatherhazard',
    'HAZARD_WEATHER_TORNADO': 'weatherhazard',
    'HAZARD_WEATHER_HEAT_WAVE': 'hazard_weather',
    'HAZARD_WEATHER_HURRICANE': 'weatherhazard',
    'HAZARD_WEATHER_FREEZING_RAIN': 'weather_ice',

    // Camino cerrado
    'ROAD_CLOSED_HAZARD': 'roadclosed',
    'ROAD_CLOSED_CONSTRUCTION': 'roadclosed',
    'ROAD_CLOSED_EVENT': 'roadclosed_event',

    // Clima
    'WEATHERHAZARD_FLOOD': 'weather_flood',
    'WEATHERHAZARD_FOG': 'weather_fog',
    'WEATHERHAZARD_ICE': 'weather_ice',
    'WEATHERHAZARD_HAIL': 'weather_hail',

    // Policía
    'POLICE_VISIBLE': 'police_visible',
    'POLICE_HIDDEN': 'police_hidden',

    // Carril bloqueado
    'JAM_STAND_STILL_TRAFFIC': 'jam',
    'JAM_HEAVY_TRAFFIC': 'jam',
    'JAM_MODERATE_TRAFFIC': 'jam',
    'JAM_LIGHT_TRAFFIC': 'jam',

    // Semáforo
    'HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT': 'traffic_light_fault',
};

/**
 * Obtiene el SVG del icono para un tipo de incidente
 */
export const getWazeIconSvg = (type: string, subtype?: string): string => {
    // Primero intentar con el subtipo específico
    if (subtype) {
        const subtypeIcon = INCIDENT_SUBTYPE_ICONS[subtype.toUpperCase()];
        if (subtypeIcon && WAZE_ICONS_SVG[subtypeIcon]) {
            return WAZE_ICONS_SVG[subtypeIcon];
        }
    }

    // Luego intentar con el tipo principal
    const typeIcon = INCIDENT_TYPE_ICONS[type.toLowerCase()];
    if (typeIcon && WAZE_ICONS_SVG[typeIcon]) {
        return WAZE_ICONS_SVG[typeIcon];
    }

    // Fallback al icono default
    return WAZE_ICONS_SVG['default'];
};

/**
 * Obtiene la URL del icono del Partner Hub de Waze
 * Prioriza el subtipo sobre el tipo principal para mayor precisión
 */
export const getWazePartnerHubIconUrl = (type: string, subtype?: string): string => {
    const typeLower = type.toLowerCase();

    // Mapeo de tipos principales a nombres de archivo en Partner Hub
    // NOTA: pothole.svg y weather.svg no están disponibles públicamente (403), usar hazard como fallback
    const iconMap: Record<string, string> = {
        'accident': 'accident',
        'jam': 'jam',
        'hazard': 'hazard',
        'construction': 'construction',
        'roadclosed': 'road-closed',
        'road_closed': 'road-closed',
        'pothole': 'hazard', // pothole.svg da 403, usar hazard
        'weatherhazard': 'hazard', // weather.svg da 403, usar hazard
        'weather': 'hazard', // weather.svg da 403, usar hazard
        'police': 'police',
    };

    // PRIMERO: Intentar usar el mapeo de subtipos si está disponible
    if (subtype && subtype.trim() !== '') {
        const subtypeUpper = subtype.toUpperCase();
        console.log(`🔍 Intentando mapear subtipo: "${subtype}" -> "${subtypeUpper}"`);

        // Intentar diferentes variaciones del subtipo
        let mappedSubtypeIcon = INCIDENT_SUBTYPE_ICONS[subtypeUpper];

        // Si no se encuentra, intentar convertir de camelCase/snake_case
        if (!mappedSubtypeIcon) {
            // Convertir de "accident_minor" a "ACCIDENT_MINOR"
            const normalizedSubtype = subtypeUpper.replace(/_/g, '_').toUpperCase();
            mappedSubtypeIcon = INCIDENT_SUBTYPE_ICONS[normalizedSubtype];
        }

        // Si aún no se encuentra, intentar con el subtipo original
        if (!mappedSubtypeIcon) {
            mappedSubtypeIcon = INCIDENT_SUBTYPE_ICONS[subtype];
        }

        if (!mappedSubtypeIcon) {
            console.log(`⚠️ Subtipo "${subtypeUpper}" no encontrado en INCIDENT_SUBTYPE_ICONS, cayendo al tipo principal`);
            console.log(`   Subtipo original: "${subtype}"`);
            console.log(`   Tipo principal: "${typeLower}"`);
        } else {
            console.log(`✅ Subtipo encontrado: "${subtypeUpper}" -> "${mappedSubtypeIcon}"`);
        }

        if (mappedSubtypeIcon) {
            // Convertir el nombre del icono mapeado al nombre del archivo en Partner Hub
            // NOTA: pothole.svg y weather.svg no están disponibles públicamente (403), usar hazard como fallback
            const subtypeIconMap: Record<string, string> = {
                'object_on_road': 'hazard', // Waze usa 'hazard' para objetos en la vía
                'pothole': 'hazard', // pothole.svg da 403, usar hazard
                'hazard_on_road': 'hazard',
                'hazard_on_shoulder': 'hazard',
                'hazard_weather': 'hazard', // weather.svg da 403, usar hazard
                'weather_fog': 'hazard', // weather.svg da 403, usar hazard
                'weather_ice': 'hazard', // weather.svg da 403, usar hazard
                'weather_flood': 'hazard', // weather.svg da 403, usar hazard
                'weather_hail': 'hazard', // weather.svg da 403, usar hazard
                'accident': 'accident',
                'accident_major': 'accident',
                'construction': 'construction',
                'roadclosed': 'road-closed',
                'roadclosed_event': 'road-closed',
                'police': 'police',
                'police_visible': 'police',
                'police_hidden': 'police',
                'traffic_light_fault': 'hazard',
            };

            const partnerHubIcon = subtypeIconMap[mappedSubtypeIcon] || iconMap[mappedSubtypeIcon] || 'hazard';
            return `${ICONS_PROXY_BASE}/${partnerHubIcon}`;
        }

        // Si no hay mapeo directo, intentar inferir del subtipo
        const subtypeLower = subtype.toLowerCase();

        if (subtypeLower.includes('pothole') || subtypeLower.includes('pot_hole')) {
            return `${ICONS_PROXY_BASE}/hazard`;
        }
        if (subtypeLower.includes('object') && (subtypeLower.includes('road') || subtypeLower.includes('on_road'))) {
            return `${ICONS_PROXY_BASE}/hazard`; // Objeto en calzada usa hazard
        }
        if (subtypeLower.includes('accident')) {
            return `${ICONS_PROXY_BASE}/accident`;
        }
        else if (subtypeLower.includes('jam') || subtypeLower.includes('traffic')) {
            return `${ICONS_PROXY_BASE}/jam`;
        }
        else if (subtypeLower.includes('hazard')) {
            return `${ICONS_PROXY_BASE}/hazard`;
        }
        else if (subtypeLower.includes('construction')) {
            return `${ICONS_PROXY_BASE}/construction`;
        }
        else if (subtypeLower.includes('road_closed') || subtypeLower.includes('roadclosed')) {
            return `${ICONS_PROXY_BASE}/road-closed`;
        }
        else if (subtypeLower.includes('weather') || subtypeLower.includes('rain') || subtypeLower.includes('snow') || subtypeLower.includes('fog') || subtypeLower.includes('ice')) {
            return `${ICONS_PROXY_BASE}/hazard`; // weather.svg da 403, usar hazard
        }
        else if (subtypeLower.includes('police')) {
            return `${ICONS_PROXY_BASE}/police`;
        }
    }

    // SEGUNDO: Usar el tipo principal - LOG cuando esto sucede para debug
    if (subtype && subtype.trim() !== '') {
        console.log(`⚠️ SUBTYPE FALLBACK: type="${type}", subtype="${subtype}" - cayendo al tipo principal`);
    }

    let iconName = iconMap[typeLower];

    // Fallback a hazard si no encontramos nada
    iconName = iconName || 'hazard';

    return `${ICONS_PROXY_BASE}/${iconName}`;
};

/**
 * Colores por tipo de incidente (para badges y fondos)
 */
export const INCIDENT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'accident': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    'jam': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    'hazard': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    'construction': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
    'roadclosed': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    'pothole': { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-300' },
    'weatherhazard': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    'police': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    'default': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
};

export const getIncidentTypeColors = (type: string): { bg: string; text: string; border: string } => {
    return INCIDENT_TYPE_COLORS[type.toLowerCase()] || INCIDENT_TYPE_COLORS['default'];
};

// Iconos genéricos para elementos de UI (basados en estilo Waze)
export const UI_ICONS_SVG: Record<string, string> = {
    'map': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 6L8 14v24l16 8 16-8V14L24 6z" fill="#3B82F6" stroke="#1E40AF" stroke-width="2"/>
        <circle cx="24" cy="24" r="6" fill="white"/>
        <path d="M20 24l4 4 8-8" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    'time': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="18" fill="#6B7280" stroke="#374151" stroke-width="2"/>
        <path d="M24 12v12l8 6" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    'stats': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="28" width="8" height="12" rx="2" fill="#3B82F6"/>
        <rect x="18" y="20" width="8" height="20" rx="2" fill="#10B981"/>
        <rect x="28" y="24" width="8" height="16" rx="2" fill="#F59E0B"/>
        <rect x="38" y="16" width="8" height="24" rx="2" fill="#EF4444"/>
    </svg>`,
    'traffic': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="20" width="8" height="8" rx="1" fill="#EF4444"/>
        <rect x="16" y="20" width="8" height="8" rx="1" fill="#F97316"/>
        <rect x="26" y="20" width="8" height="8" rx="1" fill="#EAB308"/>
        <rect x="36" y="20" width="8" height="8" rx="1" fill="#22C55E"/>
        <circle cx="10" cy="32" r="2" fill="#374151"/>
        <circle cx="20" cy="32" r="2" fill="#374151"/>
        <circle cx="30" cy="32" r="2" fill="#374151"/>
        <circle cx="40" cy="32" r="2" fill="#374151"/>
    </svg>`,
    'alert': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 6L44 42H4L24 6Z" fill="#FBBF24" stroke="#B45309" stroke-width="2"/>
        <path d="M24 18V28" stroke="#B45309" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="35" r="2.5" fill="#B45309"/>
    </svg>`,
    'check': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="18" fill="#10B981" stroke="#059669" stroke-width="2"/>
        <path d="M16 24l6 6 12-12" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    'warning': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 6L44 42H4L24 6Z" fill="#FBBF24" stroke="#B45309" stroke-width="2"/>
        <path d="M24 18V28" stroke="#B45309" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="35" r="2.5" fill="#B45309"/>
    </svg>`,
    'critical': `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="20" fill="#DC2626"/>
        <path d="M24 14v12" stroke="white" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="32" r="3" fill="white"/>
    </svg>`,
};

/**
 * Obtiene el SVG de un icono genérico de UI
 */
export const getUIIconSvg = (iconName: string): string => {
    return UI_ICONS_SVG[iconName.toLowerCase()] || UI_ICONS_SVG['alert'];
};


