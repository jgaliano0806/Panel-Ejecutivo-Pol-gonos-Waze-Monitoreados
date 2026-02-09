/**
 * Iconos oficiales de Waze para Angular
 * Mapeados según los tipos y subtipos del feed de Waze
 */

// Base URL de iconos locales
const LOCAL_ICONS_BASE = '/icons/waze/iconos_svg';

// Iconos SVG inline como fallback
export const WAZE_ICONS_SVG: Record<string, string> = {
  // === ACCIDENTES ===
  accident: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="40" height="40">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c" stroke="#4a9fd8" stroke-width="4"/>
  <g transform="translate(80, 100)">
    <rect x="-20" y="-10" width="35" height="20" fill="#3b82f6" rx="2"/>
    <path d="M -15 -10 L -8 -18 L 5 -18 L 12 -10 Z" fill="#2563eb"/>
    <circle cx="-10" cy="10" r="5" fill="#2c3e50"/>
    <circle cx="10" cy="10" r="5" fill="#2c3e50"/>
  </g>
  <g transform="translate(120, 100) scale(-1, 1)">
    <rect x="-20" y="-10" width="35" height="20" fill="#ef4444" rx="2"/>
    <path d="M -15 -10 L -8 -18 L 5 -18 L 12 -10 Z" fill="#dc2626"/>
    <circle cx="-10" cy="10" r="5" fill="#2c3e50"/>
    <circle cx="10" cy="10" r="5" fill="#2c3e50"/>
  </g>
  <g transform="translate(100, 95)">
    <path d="M 0 -15 L 3 -5 L 12 -3 L 5 3 L 7 12 L 0 7 L -7 12 L -5 3 L -12 -3 L -3 -5 Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/>
  </g>
</svg>`,

  // === TRÁFICO / ATASCOS ===
  jam: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="40" height="40">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(70, 120)">
    <rect x="-12" y="-7" width="24" height="14" fill="#ef4444" rx="2"/>
    <circle cx="-6" cy="7" r="3" fill="#2c3e50"/>
    <circle cx="6" cy="7" r="3" fill="#2c3e50"/>
  </g>
  <g transform="translate(95, 100)">
    <rect x="-12" y="-7" width="24" height="14" fill="#f97316" rx="2"/>
    <circle cx="-6" cy="7" r="3" fill="#2c3e50"/>
    <circle cx="6" cy="7" r="3" fill="#2c3e50"/>
  </g>
  <g transform="translate(120, 80)">
    <rect x="-12" y="-7" width="24" height="14" fill="#10b981" rx="2"/>
    <circle cx="-6" cy="7" r="3" fill="#2c3e50"/>
    <circle cx="6" cy="7" r="3" fill="#2c3e50"/>
  </g>
</svg>`,

  // === PELIGROS ===
  hazard: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="40" height="40">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c" stroke="#4a9fd8" stroke-width="4"/>
  <g transform="translate(100, 100)">
    <path d="M 0 -45 L 40 35 L -40 35 Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="4"/>
    <rect x="-4" y="-25" width="8" height="35" fill="#2c3e50" rx="2"/>
    <circle cx="0" cy="20" r="5" fill="#2c3e50"/>
  </g>
</svg>`,

  // === OBRAS ===
  construction: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="40" height="40">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(100, 105)">
    <ellipse cx="0" cy="-18" rx="20" ry="7" fill="#fbbf24"/>
    <path d="M -18 -18 L -15 -28 L 15 -28 L 18 -18 Z" fill="#f59e0b"/>
    <circle cx="0" cy="0" r="15" fill="#d4a574"/>
    <circle cx="-5" cy="0" r="2" fill="#2c3e50"/>
    <circle cx="5" cy="0" r="2" fill="#2c3e50"/>
    <path d="M -5 7 Q 0 9 5 7" fill="none" stroke="#2c3e50" stroke-width="1.5"/>
  </g>
</svg>`,

  // === CAMINO CERRADO ===
  roadclosed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="40" height="40">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(100, 100)">
    <rect x="-45" y="-5" width="8" height="35" fill="#6b7280"/>
    <rect x="37" y="-5" width="8" height="35" fill="#6b7280"/>
    <rect x="-37" y="-5" width="74" height="15" fill="#ef4444" rx="2"/>
    <g stroke="#ffffff" stroke-width="4">
      <line x1="-35" y1="-5" x2="-25" y2="10"/>
      <line x1="-20" y1="-5" x2="-10" y2="10"/>
      <line x1="-5" y1="-5" x2="5" y2="10"/>
      <line x1="10" y1="-5" x2="20" y2="10"/>
      <line x1="25" y1="-5" x2="35" y2="10"/>
    </g>
  </g>
</svg>`,

  // === CLIMA ===
  weatherhazard: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="40" height="40">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c" stroke="#4a9fd8" stroke-width="4"/>
  <g transform="translate(100, 85)">
    <ellipse cx="0" cy="0" rx="25" ry="18" fill="#9ca3af"/>
    <ellipse cx="-18" cy="5" rx="18" ry="15" fill="#9ca3af"/>
    <ellipse cx="18" cy="5" rx="18" ry="15" fill="#9ca3af"/>
  </g>
  <path d="M 95 105 L 105 105 L 98 125 L 103 125 L 90 145 L 95 125 L 90 125 Z" fill="#fbbf24"/>
  <ellipse cx="80" cy="130" rx="3" ry="6" fill="#60a5fa"/>
  <ellipse cx="110" cy="140" rx="3" ry="6" fill="#60a5fa"/>
</svg>`,

  // === POLICÍA ===
  police: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="40" height="40">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c" stroke="#4a9fd8" stroke-width="4"/>
  <circle cx="100" cy="105" r="30" fill="#d4a574"/>
  <g transform="translate(100, 85)">
    <ellipse cx="0" cy="0" rx="32" ry="10" fill="#1e40af"/>
    <rect x="-25" y="-20" width="50" height="20" fill="#2563eb" rx="3"/>
    <circle cx="0" cy="-10" r="6" fill="#fbbf24"/>
  </g>
  <circle cx="90" cy="105" r="3" fill="#2c3e50"/>
  <circle cx="110" cy="105" r="3" fill="#2c3e50"/>
</svg>`,

  // === DEFAULT ===
  default: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
    <circle cx="24" cy="24" r="20" fill="#374151" stroke="#1F2937" stroke-width="2"/>
    <path d="M24 14v12" stroke="white" stroke-width="4" stroke-linecap="round"/>
    <circle cx="24" cy="32" r="3" fill="white"/>
  </svg>`,
};

// Mapeo de tipos principales a iconos
export const INCIDENT_TYPE_ICONS: Record<string, string> = {
  accident: 'accident',
  jam: 'jam',
  hazard: 'hazard',
  construction: 'construction',
  roadclosed: 'roadclosed',
  road_closed: 'roadclosed',
  weatherhazard: 'weatherhazard',
  weather_hazard: 'weatherhazard',
  police: 'police',
};

// Mapeo de subtipos a iconos específicos
export const INCIDENT_SUBTYPE_ICONS: Record<string, string> = {
  ACCIDENT_MINOR: 'accident',
  ACCIDENT_MAJOR: 'accident',
  HAZARD_ON_ROAD: 'hazard',
  HAZARD_ON_SHOULDER: 'hazard',
  HAZARD_WEATHER: 'weatherhazard',
  ROAD_CLOSED_HAZARD: 'roadclosed',
  ROAD_CLOSED_CONSTRUCTION: 'roadclosed',
};

// Mapeo de subtipos a nombres de archivo locales
const LOCAL_ICONS_MAP: Record<string, string> = {
  accident: 'accidente.svg',
  jam: 'trafico.svg',
  hazard: 'peligro.svg',
  construction: 'obras.svg',
  roadclosed: 'cierre.svg',
  road_closed: 'cierre.svg',
  weatherhazard: 'mal_tiempo.svg',
  police: 'policia.svg',
};

/**
 * Obtiene el SVG del icono para un tipo de incidente
 */
export function getWazeIconSvg(type: string, subtype?: string): string {
  // Primero intentar con el subtipo específico
  if (subtype) {
    const subtypeUpper = subtype.toUpperCase();
    const subtypeIcon = INCIDENT_SUBTYPE_ICONS[subtypeUpper];
    if (subtypeIcon && WAZE_ICONS_SVG[subtypeIcon]) {
      return WAZE_ICONS_SVG[subtypeIcon];
    }
  }

  // Luego intentar con el tipo principal
  const typeLower = type?.toLowerCase() || 'default';
  const typeIcon = INCIDENT_TYPE_ICONS[typeLower];
  if (typeIcon && WAZE_ICONS_SVG[typeIcon]) {
    return WAZE_ICONS_SVG[typeIcon];
  }

  // Fallback al icono default
  return WAZE_ICONS_SVG['default'];
}

/**
 * Obtiene la URL del icono local
 */
export function getWazeIconUrl(type: string, subtype?: string): string {
  if (!type) {
    return `${LOCAL_ICONS_BASE}/peligro.svg`;
  }

  const typeLower = type.toLowerCase();
  if (LOCAL_ICONS_MAP[typeLower]) {
    return `${LOCAL_ICONS_BASE}/${LOCAL_ICONS_MAP[typeLower]}`;
  }

  return `${LOCAL_ICONS_BASE}/peligro.svg`;
}

/**
 * Colores por tipo de incidente
 */
export const INCIDENT_TYPE_COLORS: Record<string, string> = {
  accident: '#ef4444',
  jam: '#f97316',
  hazard: '#eab308',
  construction: '#f59e0b',
  roadclosed: '#ef4444',
  road_closed: '#ef4444',
  weatherhazard: '#06b6d4',
  police: '#3b82f6',
  default: '#6b7280',
};

export function getIncidentColor(type: string): string {
  return INCIDENT_TYPE_COLORS[type?.toLowerCase()] || INCIDENT_TYPE_COLORS['default'];
}
