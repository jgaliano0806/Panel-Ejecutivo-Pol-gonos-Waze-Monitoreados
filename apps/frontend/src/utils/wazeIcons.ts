/**
 * Iconos oficiales de Waze
 * Mapeados según los tipos y subtipos del feed de Waze
 */

// Base URL de iconos del Partner Hub de Waze
const WAZE_PARTNER_HUB_BASE =
  "https://web-assets.waze.com/webapps/partnerhub-web/1.1.1333/assets/icons";

// URL del proxy de iconos (usando nuestro backend para autenticación)
const ICONS_PROXY_BASE = "/api/icons";

// Iconos SVG inline como fallback (basados en los iconos oficiales de Waze)
export const WAZE_ICONS_SVG: Record<string, string> = {
  // === ACCIDENTES ===
  accident: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c" stroke="#4a9fd8" stroke-width="4"/>
  <g transform="translate(80, 100)">
    <rect x="-20" y="-10" width="35" height="20" fill="#3b82f6" rx="2"/>
    <path d="M -15 -10 L -8 -18 L 5 -18 L 12 -10 Z" fill="#2563eb"/>
    <rect x="-12" y="-16" width="10" height="6" fill="#60a5fa"/>
    <circle cx="-10" cy="10" r="5" fill="#2c3e50"/>
    <circle cx="10" cy="10" r="5" fill="#2c3e50"/>
  </g>
  <g transform="translate(120, 100) scale(-1, 1)">
    <rect x="-20" y="-10" width="35" height="20" fill="#ef4444" rx="2"/>
    <path d="M -15 -10 L -8 -18 L 5 -18 L 12 -10 Z" fill="#dc2626"/>
    <rect x="-12" y="-16" width="10" height="6" fill="#f87171"/>
    <circle cx="-10" cy="10" r="5" fill="#2c3e50"/>
    <circle cx="10" cy="10" r="5" fill="#2c3e50"/>
  </g>
  <g transform="translate(100, 95)">
    <path d="M 0 -15 L 3 -5 L 12 -3 L 5 3 L 7 12 L 0 7 L -7 12 L -5 3 L -12 -3 L -3 -5 Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/>
    <path d="M 0 -10 L 2 -3 L 8 -2 L 3 2 L 5 8 L 0 5 L -5 8 L -3 2 L -8 -2 L -2 -3 Z" fill="#fde047"/>
  </g>
  <circle cx="145" cy="55" r="22" fill="#4a9fd8" stroke="#ffffff" stroke-width="3"/>
  <path d="M 135 55 L 142 62 L 155 49" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,

  accident_major: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(75, 90)">
    <rect x="-15" y="-8" width="30" height="16" fill="#10b981" rx="2"/>
    <path d="M -12 -8 L -6 -14 L 4 -14 L 10 -8 Z" fill="#059669"/>
    <circle cx="-8" cy="8" r="4" fill="#2c3e50"/>
    <circle cx="8" cy="8" r="4" fill="#2c3e50"/>
  </g>
  <g transform="translate(100, 100)">
    <rect x="-18" y="-9" width="36" height="18" fill="#3b82f6" rx="2"/>
    <path d="M -14 -9 L -7 -16 L 5 -16 L 12 -9 Z" fill="#2563eb"/>
    <circle cx="-10" cy="9" r="5" fill="#2c3e50"/>
    <circle cx="10" cy="9" r="5" fill="#2c3e50"/>
  </g>
  <g transform="translate(125, 110)">
    <rect x="-15" y="-8" width="30" height="16" fill="#ef4444" rx="2"/>
    <path d="M -12 -8 L -6 -14 L 4 -14 L 10 -8 Z" fill="#dc2626"/>
    <circle cx="-8" cy="8" r="4" fill="#2c3e50"/>
    <circle cx="8" cy="8" r="4" fill="#2c3e50"/>
  </g>
  <g fill="#fbbf24">
    <path d="M 88 95 L 90 98 L 94 98 L 91 101 L 92 105 L 88 103 L 84 105 L 85 101 L 82 98 L 86 98 Z"/>
    <path d="M 112 105 L 114 108 L 118 108 L 115 111 L 116 115 L 112 113 L 108 115 L 109 111 L 106 108 L 110 108 Z"/>
  </g>
</svg>`,

  // === TRÁFICO / ATASCOS ===
  jam: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(70, 120)">
    <rect x="-12" y="-7" width="24" height="14" fill="#ef4444" rx="2"/>
    <path d="M -10 -7 L -5 -12 L 3 -12 L 8 -7 Z" fill="#dc2626"/>
    <circle cx="-6" cy="7" r="3" fill="#2c3e50"/>
    <circle cx="6" cy="7" r="3" fill="#2c3e50"/>
  </g>
  <g transform="translate(95, 100)">
    <rect x="-12" y="-7" width="24" height="14" fill="#f97316" rx="2"/>
    <path d="M -10 -7 L -5 -12 L 3 -12 L 8 -7 Z" fill="#ea580c"/>
    <circle cx="-6" cy="7" r="3" fill="#2c3e50"/>
    <circle cx="6" cy="7" r="3" fill="#2c3e50"/>
  </g>
  <g transform="translate(120, 80)">
    <rect x="-12" y="-7" width="24" height="14" fill="#10b981" rx="2"/>
    <path d="M -10 -7 L -5 -12 L 3 -12 L 8 -7 Z" fill="#059669"/>
    <circle cx="-6" cy="7" r="3" fill="#2c3e50"/>
    <circle cx="6" cy="7" r="3" fill="#2c3e50"/>
  </g>
</svg>`,

  // === PELIGROS ===
  hazard: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c" stroke="#4a9fd8" stroke-width="4"/>
  <g transform="translate(100, 100)">
    <path d="M 0 -45 L 40 35 L -40 35 Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="4"/>
    <rect x="-4" y="-25" width="8" height="35" fill="#2c3e50" rx="2"/>
    <circle cx="0" cy="20" r="5" fill="#2c3e50"/>
  </g>
  <circle cx="145" cy="55" r="22" fill="#4a9fd8" stroke="#ffffff" stroke-width="3"/>
  <path d="M 135 55 L 142 62 L 155 49" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,

  hazard_on_shoulder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(130, 95)">
    <rect x="-20" y="-10" width="40" height="20" fill="#f97316" rx="2"/>
    <path d="M -16 -10 L -8 -18 L 6 -18 L 14 -10 Z" fill="#ea580c"/>
    <rect x="-13" y="-16" width="10" height="6" fill="#60a5fa"/>
    <rect x="3" y="-16" width="8" height="6" fill="#60a5fa"/>
    <circle cx="-12" cy="10" r="5" fill="#2c3e50"/>
    <circle cx="12" cy="10" r="5" fill="#2c3e50"/>
  </g>
  <g transform="translate(90, 100)">
    <rect x="-32" y="-30" width="48" height="60" fill="none" stroke="#60a5fa" stroke-width="3" rx="3"/>
    <rect x="-29" y="-27" width="42" height="54" fill="#1e3a8a" opacity="0.2" rx="2"/>
  </g>
  <g transform="translate(105, 100)">
    <line x1="-5" y1="0" x2="10" y2="0" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M 10 0 L 4 -5 M 10 0 L 4 5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
  </g>
</svg>`,

  // === OBRAS ===
  construction: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(100, 105)">
    <ellipse cx="0" cy="-18" rx="20" ry="7" fill="#fbbf24"/>
    <path d="M -18 -18 L -15 -28 L 15 -28 L 18 -18 Z" fill="#f59e0b"/>
    <circle cx="0" cy="0" r="15" fill="#d4a574"/>
    <circle cx="-5" cy="0" r="2" fill="#2c3e50"/>
    <circle cx="5" cy="0" r="2" fill="#2c3e50"/>
    <path d="M -5 7 Q 0 9 5 7" fill="none" stroke="#2c3e50" stroke-width="1.5" stroke-linecap="round"/>
  </g>
</svg>`,

  // === CAMINO CERRADO ===
  roadclosed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
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

  roadclosed_event: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(100, 100)">
    <rect x="-45" y="-5" width="8" height="35" fill="#6b7280"/>
    <rect x="37" y="-5" width="8" height="35" fill="#6b7280"/>
    <rect x="-37" y="-5" width="74" height="15" fill="#8B5CF6" rx="2"/>
    <g stroke="#ffffff" stroke-width="4">
      <line x1="-35" y1="-5" x2="-25" y2="10"/>
      <line x1="-20" y1="-5" x2="-10" y2="10"/>
      <line x1="-5" y1="-5" x2="5" y2="10"/>
      <line x1="10" y1="-5" x2="20" y2="10"/>
      <line x1="25" y1="-5" x2="35" y2="10"/>
    </g>
  </g>
</svg>`,

  // === BACHE (Pothole) ===
  pothole: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(100, 100)">
    <rect x="-3" y="20" width="6" height="30" fill="#6b7280"/>
    <path d="M 0 -35 L 30 25 L -30 25 Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="3"/>
    <rect x="-3" y="-18" width="6" height="25" fill="#2c3e50" rx="1.5"/>
    <circle cx="0" cy="12" r="4" fill="#2c3e50"/>
  </g>
</svg>`,

  // === OBJETO ===
  object: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(115, 110)">
    <rect x="-20" y="-15" width="40" height="30" fill="#f97316" stroke="#ea580c" stroke-width="2" rx="2"/>
    <line x1="-20" y1="-5" x2="20" y2="-5" stroke="#ea580c" stroke-width="2"/>
    <line x1="-20" y1="5" x2="20" y2="5" stroke="#ea580c" stroke-width="2"/>
    <line x1="0" y1="-15" x2="0" y2="15" stroke="#ea580c" stroke-width="2"/>
  </g>
  <g transform="translate(80, 100)">
    <rect x="-30" y="-28" width="45" height="56" fill="none" stroke="#60a5fa" stroke-width="3" rx="3"/>
    <rect x="-27" y="-25" width="39" height="50" fill="#1e3a8a" opacity="0.15" rx="2"/>
  </g>
  <g transform="translate(90, 100)">
    <line x1="-5" y1="0" x2="8" y2="0" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M 8 0 L 2 -5 M 8 0 L 2 5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
  </g>
</svg>`,
  object_on_road: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(115, 110)">
    <rect x="-20" y="-15" width="40" height="30" fill="#f97316" stroke="#ea580c" stroke-width="2" rx="2"/>
    <line x1="-20" y1="-5" x2="20" y2="-5" stroke="#ea580c" stroke-width="2"/>
    <line x1="-20" y1="5" x2="20" y2="5" stroke="#ea580c" stroke-width="2"/>
    <line x1="0" y1="-15" x2="0" y2="15" stroke="#ea580c" stroke-width="2"/>
  </g>
  <g transform="translate(80, 100)">
    <rect x="-30" y="-28" width="45" height="56" fill="none" stroke="#60a5fa" stroke-width="3" rx="3"/>
    <rect x="-27" y="-25" width="39" height="50" fill="#1e3a8a" opacity="0.15" rx="2"/>
  </g>
  <g transform="translate(90, 100)">
    <line x1="-5" y1="0" x2="8" y2="0" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M 8 0 L 2 -5 M 8 0 L 2 5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
  </g>
</svg>`,

  // === CLIMA ===
  weather: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c" stroke="#4a9fd8" stroke-width="4"/>
  <g transform="translate(100, 85)">
    <ellipse cx="0" cy="0" rx="25" ry="18" fill="#9ca3af"/>
    <ellipse cx="-18" cy="5" rx="18" ry="15" fill="#9ca3af"/>
    <ellipse cx="18" cy="5" rx="18" ry="15" fill="#9ca3af"/>
  </g>
  <path d="M 95 105 L 105 105 L 98 125 L 103 125 L 90 145 L 95 125 L 90 125 Z" fill="#fbbf24"/>
  <ellipse cx="80" cy="130" rx="3" ry="6" fill="#60a5fa"/>
  <ellipse cx="90" cy="140" rx="3" ry="6" fill="#60a5fa"/>
  <ellipse cx="110" cy="140" rx="3" ry="6" fill="#60a5fa"/>
  <ellipse cx="120" cy="130" rx="3" ry="6" fill="#60a5fa"/>
  <circle cx="145" cy="55" r="22" fill="#4a9fd8" stroke="#ffffff" stroke-width="3"/>
  <path d="M 135 55 L 142 62 L 155 49" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,

  weatherhazard: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c" stroke="#4a9fd8" stroke-width="4"/>
  <g transform="translate(100, 85)">
    <ellipse cx="0" cy="0" rx="25" ry="18" fill="#9ca3af"/>
    <ellipse cx="-18" cy="5" rx="18" ry="15" fill="#9ca3af"/>
    <ellipse cx="18" cy="5" rx="18" ry="15" fill="#9ca3af"/>
  </g>
  <path d="M 95 105 L 105 105 L 98 125 L 103 125 L 90 145 L 95 125 L 90 125 Z" fill="#fbbf24"/>
  <ellipse cx="80" cy="130" rx="3" ry="6" fill="#60a5fa"/>
  <ellipse cx="90" cy="140" rx="3" ry="6" fill="#60a5fa"/>
  <ellipse cx="110" cy="140" rx="3" ry="6" fill="#60a5fa"/>
  <ellipse cx="120" cy="130" rx="3" ry="6" fill="#60a5fa"/>
  <circle cx="145" cy="55" r="22" fill="#4a9fd8" stroke="#ffffff" stroke-width="3"/>
  <path d="M 135 55 L 142 62 L 155 49" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,

  slippery_road: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(100, 100) rotate(-15)">
    <rect x="-25" y="-12" width="50" height="24" fill="#c94c3d" rx="3"/>
    <path d="M -18 -12 L -10 -22 L 10 -22 L 18 -12 Z" fill="#a23a2e"/>
    <rect x="-15" y="-20" width="12" height="8" fill="#4a5568"/>
    <rect x="3" y="-20" width="12" height="8" fill="#4a5568"/>
    <circle cx="-15" cy="12" r="6" fill="#2c3e50"/>
    <circle cx="15" cy="12" r="6" fill="#2c3e50"/>
  </g>
  <path d="M 130 90 Q 135 95 130 100" fill="none" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
  <path d="M 140 85 Q 145 90 140 95" fill="none" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
  <path d="M 150 80 Q 155 85 150 90" fill="none" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
</svg>`,

  weather_flood: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(100, 85)">
    <rect x="-25" y="-12" width="50" height="24" fill="#c94c3d" rx="3"/>
    <path d="M -18 -12 L -10 -22 L 10 -22 L 18 -12 Z" fill="#a23a2e"/>
    <rect x="-15" y="-20" width="12" height="8" fill="#4a5568"/>
    <rect x="3" y="-20" width="12" height="8" fill="#4a5568"/>
    <circle cx="-15" cy="12" r="6" fill="#2c3e50"/>
    <circle cx="15" cy="12" r="6" fill="#2c3e50"/>
  </g>
  <g transform="translate(100, 115)">
    <rect x="-45" y="0" width="90" height="30" fill="#3b82f6" rx="2"/>
    <path d="M -40 5 Q -35 0 -30 5 Q -25 10 -20 5 Q -15 0 -10 5 Q -5 10 0 5 Q 5 0 10 5 Q 15 10 20 5 Q 25 0 30 5 Q 35 10 40 5"
          fill="none" stroke="#60a5fa" stroke-width="2"/>
    <path d="M -40 15 Q -35 10 -30 15 Q -25 20 -20 15 Q -15 10 -10 15 Q -5 20 0 15 Q 5 10 10 15 Q 15 20 20 15 Q 25 10 30 15 Q 35 20 40 15"
          fill="none" stroke="#60a5fa" stroke-width="2"/>
  </g>
</svg>`,

  weather_fog: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g opacity="0.8">
    <g transform="translate(100, 70)">
      <ellipse cx="0" cy="0" rx="30" ry="15" fill="#9ca3af"/>
      <ellipse cx="-20" cy="3" rx="20" ry="12" fill="#9ca3af"/>
      <ellipse cx="20" cy="3" rx="20" ry="12" fill="#9ca3af"/>
    </g>
    <g transform="translate(100, 100)">
      <ellipse cx="0" cy="0" rx="35" ry="18" fill="#b8bfc7"/>
      <ellipse cx="-25" cy="3" rx="22" ry="14" fill="#b8bfc7"/>
      <ellipse cx="25" cy="3" rx="22" ry="14" fill="#b8bfc7"/>
    </g>
    <g transform="translate(100, 130)">
      <ellipse cx="0" cy="0" rx="32" ry="16" fill="#9ca3af"/>
      <ellipse cx="-22" cy="3" rx="20" ry="13" fill="#9ca3af"/>
      <ellipse cx="22" cy="3" rx="20" ry="13" fill="#9ca3af"/>
    </g>
  </g>
</svg>`,

  weather_ice: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <rect x="60" y="80" width="80" height="50" fill="#4a5568" rx="3"/>
  <g transform="translate(100, 105)">
    <ellipse cx="0" cy="0" rx="35" ry="22" fill="#93c5fd" opacity="0.7"/>
    <ellipse cx="0" cy="0" rx="30" ry="18" fill="#bfdbfe" opacity="0.5"/>
    <ellipse cx="-10" cy="-5" rx="8" ry="5" fill="#e0f2fe" opacity="0.8"/>
    <ellipse cx="12" cy="3" rx="6" ry="4" fill="#e0f2fe" opacity="0.8"/>
  </g>
  <g transform="translate(145, 100)">
    <rect x="-15" y="-22" width="30" height="44" fill="#374151" rx="3"/>
    <rect x="-12" y="-18" width="24" height="32" fill="#60a5fa"/>
    <path d="M -5 -5 L -5 5 M -10 0 L 0 0 M -8 -3 L -2 3 M -8 3 L -2 -3"
          stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
    <path d="M 5 -5 L 5 5 M 0 0 L 10 0 M 2 -3 L 8 3 M 2 3 L 8 -3"
          stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
  </g>
</svg>`,

  weather_snow: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(100, 95)">
    <rect x="-25" y="-12" width="50" height="24" fill="#c94c3d" rx="3"/>
    <path d="M -18 -12 L -10 -22 L 10 -22 L 18 -12 Z" fill="#a23a2e"/>
    <ellipse cx="0" cy="-22" rx="15" ry="4" fill="#e5e7eb"/>
    <rect x="-15" y="-20" width="12" height="8" fill="#4a5568"/>
    <rect x="3" y="-20" width="12" height="8" fill="#4a5568"/>
    <circle cx="-15" cy="12" r="6" fill="#2c3e50"/>
    <circle cx="15" cy="12" r="6" fill="#2c3e50"/>
  </g>
  <g transform="translate(100, 125)">
    <ellipse cx="-30" cy="0" rx="15" ry="8" fill="#e5e7eb"/>
    <ellipse cx="-10" cy="2" rx="12" ry="7" fill="#e5e7eb"/>
    <ellipse cx="10" cy="0" rx="14" ry="8" fill="#e5e7eb"/>
    <ellipse cx="30" cy="2" rx="13" ry="7" fill="#e5e7eb"/>
  </g>
  <g fill="#ffffff">
    <circle cx="70" cy="60" r="2"/>
    <circle cx="85" cy="70" r="2"/>
    <circle cx="130" cy="65" r="2"/>
    <circle cx="115" cy="75" r="2"/>
    <circle cx="145" cy="120" r="2"/>
  </g>
</svg>`,

  weather_hail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c" stroke="#4a9fd8" stroke-width="4"/>
  <g transform="translate(100, 85)">
    <ellipse cx="0" cy="0" rx="25" ry="18" fill="#9ca3af"/>
    <ellipse cx="-18" cy="5" rx="18" ry="15" fill="#9ca3af"/>
    <ellipse cx="18" cy="5" rx="18" ry="15" fill="#9ca3af"/>
  </g>
  <path d="M 95 105 L 105 105 L 98 125 L 103 125 L 90 145 L 95 125 L 90 125 Z" fill="#fbbf24"/>
  <ellipse cx="80" cy="130" rx="3" ry="6" fill="#60a5fa"/>
  <ellipse cx="90" cy="140" rx="3" ry="6" fill="#60a5fa"/>
  <ellipse cx="110" cy="140" rx="3" ry="6" fill="#60a5fa"/>
  <ellipse cx="120" cy="130" rx="3" ry="6" fill="#60a5fa"/>
  <circle cx="145" cy="55" r="22" fill="#4a9fd8" stroke="#ffffff" stroke-width="3"/>
  <path d="M 135 55 L 142 62 L 155 49" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,

  // === POLICÍA ===
  police: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c" stroke="#4a9fd8" stroke-width="4"/>
  <circle cx="100" cy="105" r="30" fill="#d4a574"/>
  <g transform="translate(100, 85)">
    <ellipse cx="0" cy="0" rx="32" ry="10" fill="#1e40af"/>
    <rect x="-25" y="-20" width="50" height="20" fill="#2563eb" rx="3"/>
    <ellipse cx="0" cy="0" rx="28" ry="6" fill="#1e3a8a"/>
    <circle cx="0" cy="-10" r="6" fill="#fbbf24"/>
    <circle cx="0" cy="-10" r="4" fill="#1e40af"/>
  </g>
  <circle cx="90" cy="105" r="3" fill="#2c3e50"/>
  <circle cx="110" cy="105" r="3" fill="#2c3e50"/>
  <path d="M 90 115 Q 100 120 110 115" fill="none" stroke="#2c3e50" stroke-width="2" stroke-linecap="round"/>
  <circle cx="145" cy="55" r="22" fill="#4a9fd8" stroke="#ffffff" stroke-width="3"/>
  <path d="M 135 55 L 142 62 L 155 49" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,

  police_visible: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c" stroke="#4a9fd8" stroke-width="4"/>
  <circle cx="100" cy="105" r="30" fill="#d4a574"/>
  <g transform="translate(100, 85)">
    <ellipse cx="0" cy="0" rx="32" ry="10" fill="#1e40af"/>
    <rect x="-25" y="-20" width="50" height="20" fill="#2563eb" rx="3"/>
    <ellipse cx="0" cy="0" rx="28" ry="6" fill="#1e3a8a"/>
    <circle cx="0" cy="-10" r="6" fill="#fbbf24"/>
    <circle cx="0" cy="-10" r="4" fill="#1e40af"/>
  </g>
  <circle cx="90" cy="105" r="3" fill="#2c3e50"/>
  <circle cx="110" cy="105" r="3" fill="#2c3e50"/>
  <path d="M 90 115 Q 100 120 110 115" fill="none" stroke="#2c3e50" stroke-width="2" stroke-linecap="round"/>
  <circle cx="145" cy="55" r="22" fill="#4a9fd8" stroke="#ffffff" stroke-width="3"/>
  <path d="M 135 55 L 142 62 L 155 49" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,

  police_hidden: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(100, 110)">
    <ellipse cx="0" cy="-15" rx="18" ry="6" fill="#1e40af"/>
    <rect x="-15" y="-25" width="30" height="10" fill="#2563eb" rx="2"/>
    <ellipse cx="0" cy="-15" rx="16" ry="4" fill="#1e3a8a"/>
    <circle cx="0" cy="-20" r="4" fill="#fbbf24"/>
    <circle cx="0" cy="0" r="18" fill="#d4a574"/>
    <circle cx="-6" cy="0" r="2" fill="#2c3e50"/>
    <circle cx="6" cy="0" r="2" fill="#2c3e50"/>
    <line x1="-5" y1="7" x2="5" y2="7" stroke="#2c3e50" stroke-width="1.5"/>
  </g>
  <g transform="translate(100, 100)">
    <rect x="-35" y="-40" width="70" height="80" fill="none" stroke="#60a5fa" stroke-width="4" rx="5"/>
    <rect x="-35" y="-40" width="70" height="80" fill="none" stroke="#3b82f6" stroke-width="2" rx="5"/>
  </g>
</svg>`,

  // === CÁMARAS / RADARES ===
  camera: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(100, 100)">
    <rect x="-18" y="15" width="36" height="8" fill="#2c3e50" rx="2"/>
    <rect x="-20" y="-15" width="40" height="30" fill="#fbbf24" rx="4"/>
    <rect x="-16" y="-11" width="32" height="22" fill="#2c3e50" rx="2"/>
    <circle cx="0" cy="0" r="12" fill="#1f2937"/>
    <circle cx="0" cy="0" r="9" fill="#4b5563"/>
    <circle cx="0" cy="0" r="6" fill="#6b7280"/>
    <circle cx="-3" cy="-3" r="2" fill="#9ca3af"/>
  </g>
  <g transform="translate(100, 100)">
    <path d="M -30 -25 Q -35 -20 -30 -15" fill="none" stroke="#fbbf24" stroke-width="2"/>
    <path d="M -35 -30 Q -42 -20 -35 -10" fill="none" stroke="#fbbf24" stroke-width="2"/>
    <path d="M 30 -25 Q 35 -20 30 -15" fill="none" stroke="#fbbf24" stroke-width="2"/>
    <path d="M 35 -30 Q 42 -20 35 -10" fill="none" stroke="#fbbf24" stroke-width="2"/>
  </g>
</svg>`,

  camera_speed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(100, 100)">
    <rect x="-18" y="15" width="36" height="8" fill="#2c3e50" rx="2"/>
    <rect x="-20" y="-15" width="40" height="30" fill="#fbbf24" rx="4"/>
    <rect x="-16" y="-11" width="32" height="22" fill="#2c3e50" rx="2"/>
    <circle cx="0" cy="0" r="12" fill="#1f2937"/>
    <circle cx="0" cy="0" r="9" fill="#4b5563"/>
    <circle cx="0" cy="0" r="6" fill="#6b7280"/>
    <circle cx="-3" cy="-3" r="2" fill="#9ca3af"/>
  </g>
  <g transform="translate(100, 100)">
    <path d="M -30 -25 Q -35 -20 -30 -15" fill="none" stroke="#fbbf24" stroke-width="2"/>
    <path d="M -35 -30 Q -42 -20 -35 -10" fill="none" stroke="#fbbf24" stroke-width="2"/>
    <path d="M 30 -25 Q 35 -20 30 -15" fill="none" stroke="#fbbf24" stroke-width="2"/>
    <path d="M 35 -30 Q 42 -20 35 -10" fill="none" stroke="#fbbf24" stroke-width="2"/>
  </g>
</svg>`,

  camera_red_light: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(100, 100)">
    <rect x="-18" y="15" width="36" height="8" fill="#2c3e50" rx="2"/>
    <rect x="-20" y="-15" width="40" height="30" fill="#fbbf24" rx="4"/>
    <rect x="-16" y="-11" width="32" height="22" fill="#2c3e50" rx="2"/>
    <circle cx="0" cy="0" r="12" fill="#1f2937"/>
    <circle cx="0" cy="0" r="9" fill="#4b5563"/>
    <circle cx="0" cy="0" r="6" fill="#6b7280"/>
    <circle cx="-3" cy="-3" r="2" fill="#9ca3af"/>
  </g>
</svg>`,

  // === SEMÁFORO ===
  traffic_light_fault: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <g transform="translate(90, 100)">
    <rect x="-15" y="-35" width="30" height="70" fill="#2c3e50" rx="4"/>
    <circle cx="0" cy="-20" r="9" fill="#4b5563"/>
    <circle cx="0" cy="0" r="9" fill="#4b5563"/>
    <circle cx="0" cy="20" r="9" fill="#4b5563"/>
    <rect x="-3" y="35" width="6" height="25" fill="#374151"/>
  </g>
  <g transform="translate(130, 100)">
    <circle cx="0" cy="0" r="20" fill="#ef4444"/>
    <path d="M -10 -10 L 10 10 M 10 -10 L -10 10" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
  </g>
</svg>`,

  // === EVENTOS ESPECIALES ===
  event: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="12" width="28" height="28" rx="4" fill="#8B5CF6"/>
        <path d="M18 8v8M30 8v8" stroke="#6D28D9" stroke-width="3" stroke-linecap="round"/>
        <circle cx="24" cy="26" r="6" fill="white"/>
        <path d="M24 23v3l2 2" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

  event_concert: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="18" fill="#A855F7"/>
        <path d="M18 28c0-3 2-5 6-5s6 2 6 5" stroke="white" stroke-width="2"/>
        <circle cx="20" cy="20" r="2" fill="white"/>
        <circle cx="28" cy="20" r="2" fill="white"/>
        <path d="M16 32c2 2 4 3 8 3s6-1 8-3" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

  event_sport: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="18" fill="#10B981"/>
        <path d="M24 8v32M8 24h32" stroke="white" stroke-width="2"/>
        <path d="M12 12l24 24M36 12L12 36" stroke="white" stroke-width="1.5" opacity="0.5"/>
    </svg>`,

  // === CARRIL BLOQUEADO ===
  lane_blocked: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c" stroke="#4a9fd8" stroke-width="4"/>
  <g transform="translate(100, 100)">
    <rect x="-25" y="30" width="50" height="8" fill="#2c3e50" rx="2"/>
    <path d="M -20 30 L 0 -30 L 20 30 Z" fill="#ff6b35"/>
    <path d="M -15 5 L 0 -20 L 15 5 Z" fill="#ffffff"/>
    <path d="M -10 20 L 0 0 L 10 20 Z" fill="#ffffff"/>
  </g>
  <circle cx="145" cy="55" r="22" fill="#4a9fd8" stroke="#ffffff" stroke-width="3"/>
  <path d="M 135 55 L 142 62 L 155 49" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,

  lane_blocked_left: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <rect x="60" y="40" width="50" height="120" fill="#4a5568" rx="5"/>
  <rect x="82" y="50" width="6" height="20" fill="#ffffff"/>
  <rect x="82" y="80" width="6" height="20" fill="#ffffff"/>
  <rect x="82" y="110" width="6" height="20" fill="#ffffff"/>
  <rect x="82" y="140" width="6" height="20" fill="#ffffff"/>
  <g transform="translate(85, 100)">
    <rect x="-12" y="15" width="24" height="4" fill="#2c3e50" rx="1"/>
    <path d="M -10 15 L 0 -15 L 10 15 Z" fill="#ff6b35"/>
    <path d="M -7 2 L 0 -10 L 7 2 Z" fill="#ffffff"/>
    <path d="M -5 10 L 0 0 L 5 10 Z" fill="#ffffff"/>
  </g>
</svg>`,

  lane_blocked_right: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <rect x="90" y="40" width="50" height="120" fill="#4a5568" rx="5"/>
  <rect x="112" y="50" width="6" height="20" fill="#ffffff"/>
  <rect x="112" y="80" width="6" height="20" fill="#ffffff"/>
  <rect x="112" y="110" width="6" height="20" fill="#ffffff"/>
  <rect x="112" y="140" width="6" height="20" fill="#ffffff"/>
  <g transform="translate(115, 100)">
    <rect x="-12" y="15" width="24" height="4" fill="#2c3e50" rx="1"/>
    <path d="M -10 15 L 0 -15 L 10 15 Z" fill="#ff6b35"/>
    <path d="M -7 2 L 0 -10 L 7 2 Z" fill="#ffffff"/>
    <path d="M -5 10 L 0 0 L 5 10 Z" fill="#ffffff"/>
  </g>
</svg>`,

  lane_blocked_center: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#3d4a5c"/>
  <rect x="75" y="40" width="50" height="120" fill="#4a5568" rx="5"/>
  <rect x="97" y="50" width="6" height="20" fill="#ffffff"/>
  <rect x="97" y="80" width="6" height="20" fill="#ffffff"/>
  <rect x="97" y="110" width="6" height="20" fill="#ffffff"/>
  <rect x="97" y="140" width="6" height="20" fill="#ffffff"/>
  <g transform="translate(100, 100)">
    <rect x="-12" y="15" width="24" height="4" fill="#2c3e50" rx="1"/>
    <path d="M -10 15 L 0 -15 L 10 15 Z" fill="#ff6b35"/>
    <path d="M -7 2 L 0 -10 L 7 2 Z" fill="#ffffff"/>
    <path d="M -5 10 L 0 0 L 5 10 Z" fill="#ffffff"/>
  </g>
</svg>`,

  default: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="20" fill="#374151" stroke="#1F2937" stroke-width="2"/>
        <path d="M24 14v12" stroke="white" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="32" r="3" fill="white"/>
    </svg>`,
};

// Mapeo de tipos principales a iconos
export const INCIDENT_TYPE_ICONS: Record<string, string> = {
  accident: "accident",
  jam: "jam",
  hazard: "hazard",
  construction: "construction",
  roadclosed: "roadclosed",
  road_closed: "roadclosed",
  pothole: "pothole",
  weatherhazard: "weatherhazard",
  police: "police",
  camera: "camera",
  event: "event",
  weather: "weather",
};

// Mapeo de subtipos a iconos específicos
export const INCIDENT_SUBTYPE_ICONS: Record<string, string> = {
  // Accidentes
  ACCIDENT_MINOR: "accident",
  ACCIDENT_MAJOR: "accident_major",

  // Peligros
  HAZARD_ON_ROAD: "hazard_on_road",
  HAZARD_ON_SHOULDER: "hazard_on_shoulder",
  HAZARD_ON_ROAD_CAR_STOPPED: "hazard_on_shoulder",
  HAZARD_ON_ROAD_CONSTRUCTION: "construction",
  HAZARD_ON_ROAD_OBJECT: "object_on_road",
  HAZARD_ON_ROAD_POT_HOLE: "bache", // Corregido para usar icono de bache
  HAZARD_ON_ROAD_ROAD_KILL: "hazard_on_road",
  HAZARD_ON_SHOULDER_CAR_STOPPED: "hazard_on_shoulder",
  HAZARD_ON_SHOULDER_ANIMALS: "hazard",
  HAZARD_ON_SHOULDER_MISSING_SIGN: "hazard",
  HAZARD_WEATHER: "hazard_weather",
  HAZARD_WEATHER_FOG: "weather_fog",
  HAZARD_WEATHER_HAIL: "weather_hail",
  HAZARD_WEATHER_HEAVY_RAIN: "weatherhazard",
  HAZARD_WEATHER_HEAVY_SNOW: "weather_snow",
  HAZARD_WEATHER_FLOOD: "weather_flood",
  HAZARD_WEATHER_MONSOON: "weatherhazard",
  HAZARD_WEATHER_TORNADO: "weatherhazard",
  HAZARD_WEATHER_HEAT_WAVE: "hazard_weather",
  HAZARD_WEATHER_HURRICANE: "weatherhazard",
  HAZARD_WEATHER_FREEZING_RAIN: "weather_ice",
  HAZARD_ON_ROAD_ICE: "slippery_road",

  // Camino cerrado
  ROAD_CLOSED_HAZARD: "roadclosed",
  ROAD_CLOSED_CONSTRUCTION: "roadclosed",
  ROAD_CLOSED_EVENT: "roadclosed_event",

  // Clima
  WEATHERHAZARD_FLOOD: "weather_flood",
  WEATHERHAZARD_FOG: "weather_fog",
  WEATHERHAZARD_ICE: "weather_ice",
  WEATHERHAZARD_HAIL: "weather_hail",

  // Policía
  POLICE: "police",
  POLICE_VISIBLE: "police_visible",
  POLICE_HIDDEN: "police_hidden",

  // Cámaras
  CAMERA: "camera",
  CAMERA_SPEED: "camera_speed",
  CAMERA_RED_LIGHT: "camera_red_light",
  CAMERA_FAKE: "camera",
  CAMERA_MOBILE: "camera_speed",

  // Eventos
  EVENT: "event",
  EVENT_CONCERT: "event_concert",
  EVENT_SPORT: "event_sport",
  EVENT_OTHER: "event",

  // Clima como tipo principal
  WEATHER: "weather",
  WEATHER_FOG: "weather_fog",
  WEATHER_HEAVY_RAIN: "weatherhazard",
  WEATHER_HAIL: "weather_hail",
  WEATHER_HEAVY_SNOW: "weather_snow",
  WEATHER_FLOOD: "weather_flood",

  // Carril bloqueado
  JAM_STAND_STILL_TRAFFIC: "jam",
  JAM_HEAVY_TRAFFIC: "jam",
  JAM_MODERATE_TRAFFIC: "jam",
  JAM_LIGHT_TRAFFIC: "jam",

  // Semáforo
  HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT: "traffic_light_fault",
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
  return WAZE_ICONS_SVG["default"];
};

const LOCAL_ICONS_BASE = "/icons/waze/iconos_svg";

// Mapeo de subtipos/tipos a nombres de archivo locales
const LOCAL_ICONS_MAP: Record<string, string> = {
  // Accidentes
  accident: "accidente.svg",
  accident_major: "colision_multiple.svg",
  ACCIDENT_MAJOR: "colision_multiple.svg",
  ACCIDENT_MINOR: "accidente.svg",

  // Tráfico
  jam: "trafico.svg",
  JAM_HEAVY_TRAFFIC: "trafico.svg",
  JAM_MODERATE_TRAFFIC: "trafico.svg",
  JAM_STAND_STILL_TRAFFIC: "trafico.svg",
  JAM_LIGHT_TRAFFIC: "trafico.svg",

  // Peligros
  hazard: "peligro.svg",
  hazard_on_shoulder: "auto_en_orilla.svg",
  HAZARD_ON_SHOULDER: "auto_en_orilla.svg",
  HAZARD_ON_SHOULDER_CAR_STOPPED: "auto_en_orilla.svg",
  object_on_road: "objeto.svg",
  HAZARD_ON_ROAD_OBJECT: "objeto.svg",
  pothole: "bache.svg",
  HAZARD_ON_ROAD_POT_HOLE: "bache.svg",
  HAZARD_WEATHER: "mal_tiempo.svg",

  // Clima
  weather: "mal_tiempo.svg", // Fallback general
  weather_fog: "niebla.svg",
  HAZARD_WEATHER_FOG: "niebla.svg",
  weather_flood: "inundacion.svg",
  HAZARD_WEATHER_FLOOD: "inundacion.svg",
  weather_ice: "camino_con_hielo.svg",
  HAZARD_WEATHER_FREEZING_RAIN: "camino_con_hielo.svg",
  weather_snow: "nieve_en_el_camino.svg",
  HAZARD_WEATHER_HEAVY_SNOW: "nieve_en_el_camino.svg",
  slippery_road: "camino_resbaladizo.svg",
  HAZARD_ON_ROAD_ICE: "camino_resbaladizo.svg",

  // Policía
  police: "policia.svg",
  police_visible: "policia.svg",
  police_hidden: "oculto.svg",
  POLICE_HIDDEN: "oculto.svg",
  POLICE_VISIBLE: "policia.svg",

  // Obras
  construction: "obras.svg",
  HAZARD_ON_ROAD_CONSTRUCTION: "obras.svg",

  // Cierres
  roadclosed: "cierre.svg",
  road_closed: "cierre.svg",
  ROAD_CLOSED_HAZARD: "cierre.svg",
  ROAD_CLOSED_CONSTRUCTION: "cierre.svg",

  // Carriles (Subtipos inferidos o mapeados)
  lane_blocked: "carril_bloqueado.svg",
  lane_blocked_left: "carril_izquierdo.svg",
  lane_blocked_right: "carril_derecho.svg",
  lane_blocked_center: "carril_central.svg",

  // Semáforos y otros
  traffic_light_fault: "semaforo_averiado.svg",
  HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT: "semaforo_averiado.svg",
  camera: "radar_movil.svg", // Usar radar móvil como genérico si no hay fijo
  camera_speed: "radar_movil.svg",
};

/**
 * Obtiene la URL del icono
 * Prioriza los iconos locales del directorio public/icons/waze/iconos_svg
 */
export const getWazePartnerHubIconUrl = (
  type: string,
  subtype?: string
): string => {
  // 1. Intentar buscar por Subtipo Exacto
  if (subtype) {
    const subtypeKey = subtype.toUpperCase();
    if (LOCAL_ICONS_MAP[subtypeKey]) {
      return `${LOCAL_ICONS_BASE}/${LOCAL_ICONS_MAP[subtypeKey]}`;
    }
    // Intentar por subtipo tal cual viene (ej. snake_case)
    if (LOCAL_ICONS_MAP[subtype]) {
      return `${LOCAL_ICONS_BASE}/${LOCAL_ICONS_MAP[subtype]}`;
    }
  }

  // 2. Intentar inferir key map (usando INCIDENT_SUBTYPE_ICONS)
  if (subtype) {
    const mappedKey = INCIDENT_SUBTYPE_ICONS[subtype.toUpperCase()];
    if (mappedKey && LOCAL_ICONS_MAP[mappedKey]) {
      return `${LOCAL_ICONS_BASE}/${LOCAL_ICONS_MAP[mappedKey]}`;
    }
  }

  // 3. Fallback al Tipo Principal
  const typeLower = type.toLowerCase();
  if (LOCAL_ICONS_MAP[typeLower]) {
    return `${LOCAL_ICONS_BASE}/${LOCAL_ICONS_MAP[typeLower]}`;
  }

  // 4. Mapeos especiales por texto si no se encontró
  if (subtype) {
    const s = subtype.toLowerCase();
    if (s.includes("pothole")) return `${LOCAL_ICONS_BASE}/bache.svg`;
    if (s.includes("fog")) return `${LOCAL_ICONS_BASE}/niebla.svg`;
    if (s.includes("flood")) return `${LOCAL_ICONS_BASE}/inundacion.svg`;
    if (s.includes("ice")) return `${LOCAL_ICONS_BASE}/camino_con_hielo.svg`;
    if (s.includes("snow")) return `${LOCAL_ICONS_BASE}/nieve_en_el_camino.svg`;
  }

  // Si no hay local, devolver vacío para que use el SVG inline (o podríamos devolver el proxy como último recurso)
  // Pero el usuario pidió "usar exactamente los archivos", así que mejor devolver un default local si es posible
  return `${LOCAL_ICONS_BASE}/peligro.svg`;
};

/**
 * Colores por tipo de incidente (para badges y fondos)
 */
export const INCIDENT_TYPE_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  accident: {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-300",
  },
  jam: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-300",
  },
  hazard: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    border: "border-yellow-300",
  },
  construction: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-300",
  },
  roadclosed: {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-300",
  },
  road_closed: {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-300",
  },
  pothole: {
    bg: "bg-stone-100",
    text: "text-stone-700",
    border: "border-stone-300",
  },
  weatherhazard: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-300",
  },
  police: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-300",
  },
  camera: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
  event: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-300",
  },
  weather: { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-300" },
  default: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300",
  },
};

export const getIncidentTypeColors = (
  type: string
): { bg: string; text: string; border: string } => {
  return (
    INCIDENT_TYPE_COLORS[type.toLowerCase()] || INCIDENT_TYPE_COLORS["default"]
  );
};

// Iconos genéricos para elementos de UI (basados en estilo Waze)
export const UI_ICONS_SVG: Record<string, string> = {
  map: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 6L8 14v24l16 8 16-8V14L24 6z" fill="#3B82F6" stroke="#1E40AF" stroke-width="2"/>
        <circle cx="24" cy="24" r="6" fill="white"/>
        <path d="M20 24l4 4 8-8" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  time: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="18" fill="#6B7280" stroke="#374151" stroke-width="2"/>
        <path d="M24 12v12l8 6" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  stats: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="28" width="8" height="12" rx="2" fill="#3B82F6"/>
        <rect x="18" y="20" width="8" height="20" rx="2" fill="#10B981"/>
        <rect x="28" y="24" width="8" height="16" rx="2" fill="#F59E0B"/>
        <rect x="38" y="16" width="8" height="24" rx="2" fill="#EF4444"/>
    </svg>`,
  traffic: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="20" width="8" height="8" rx="1" fill="#EF4444"/>
        <rect x="16" y="20" width="8" height="8" rx="1" fill="#F97316"/>
        <rect x="26" y="20" width="8" height="8" rx="1" fill="#EAB308"/>
        <rect x="36" y="20" width="8" height="8" rx="1" fill="#22C55E"/>
        <circle cx="10" cy="32" r="2" fill="#374151"/>
        <circle cx="20" cy="32" r="2" fill="#374151"/>
        <circle cx="30" cy="32" r="2" fill="#374151"/>
        <circle cx="40" cy="32" r="2" fill="#374151"/>
    </svg>`,
  alert: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 6L44 42H4L24 6Z" fill="#FBBF24" stroke="#B45309" stroke-width="2"/>
        <path d="M24 18V28" stroke="#B45309" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="35" r="2.5" fill="#B45309"/>
    </svg>`,
  check: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="18" fill="#10B981" stroke="#059669" stroke-width="2"/>
        <path d="M16 24l6 6 12-12" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  warning: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 6L44 42H4L24 6Z" fill="#FBBF24" stroke="#B45309" stroke-width="2"/>
        <path d="M24 18V28" stroke="#B45309" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="35" r="2.5" fill="#B45309"/>
    </svg>`,
  critical: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="20" fill="#DC2626"/>
        <path d="M24 14v12" stroke="white" stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="32" r="3" fill="white"/>
    </svg>`,
};

/**
 * Obtiene el SVG de un icono genérico de UI
 */
export const getUIIconSvg = (iconName: string): string => {
  return UI_ICONS_SVG[iconName.toLowerCase()] || UI_ICONS_SVG["alert"];
};
